from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from core.config import get_settings
from core.db import get_db
from infrastructure.database.models import User
from interface.dependencies.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    password: str
    dateAnniversaire: str
    cin: str


class UpdateProfileRequest(BaseModel):
    nom: str
    prenom: str
    dateAnniversaire: str | None = None
    cin: str | None = None


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def user_to_dict(user: User) -> dict:
    return {
        "id":               user.id,
        "nom":              user.nom,
        "prenom":           user.prenom,
        "email":            user.email,
        "role":             user.role,
        "dateAnniversaire": user.dateAnniversaire,
        "cin":              user.cin,
        "createdAt":        user.created_at.isoformat(),
    }


@router.post("/register")
def register(user: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    hashed = pwd_context.hash(user.password)
    new_user = User(
        username=user.email,
        email=user.email,
        nom=user.nom,
        prenom=user.prenom,
        hashed_password=hashed,
        dateAnniversaire=user.dateAnniversaire,
        cin=user.cin,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user":         user_to_dict(new_user),
    }


@router.post("/login")
def login(user: LoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_access_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user":         user_to_dict(db_user),
    }


@router.get("/me")
def get_me(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    db_user = db.query(User).filter(User.email == current_user).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user_to_dict(db_user)


@router.put("/profile")
def update_profile(
    data: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    db_user = db.query(User).filter(User.email == current_user).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    db_user.nom = data.nom
    db_user.prenom = data.prenom
    if data.dateAnniversaire is not None:
        db_user.dateAnniversaire = data.dateAnniversaire
    if data.cin is not None:
        db_user.cin = data.cin

    db.commit()
    db.refresh(db_user)
    return user_to_dict(db_user)


@router.put("/password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    db_user = db.query(User).filter(User.email == current_user).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if not pwd_context.verify(data.currentPassword, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

    if len(data.newPassword) < 6:
        raise HTTPException(
            status_code=400,
            detail="Le nouveau mot de passe doit contenir au moins 6 caractères"
        )

    db_user.hashed_password = pwd_context.hash(data.newPassword)
    db.commit()
    return {"message": "Mot de passe modifié avec succès"}
