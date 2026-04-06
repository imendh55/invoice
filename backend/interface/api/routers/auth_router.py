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
    dateAnniversaire: str | None = None
    cin: str | None = None

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

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
        dateAnniversaire=user.dateAnniversaire,  # ✅ Espace supprimé
        cin=user.cin,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": user.email})  # ✅ Espace supprimé
    return {
        "access_token": token,  # ✅ Espace supprimé
        "token_type": "bearer",  # ✅ Espace supprimé
        "user": {  # ✅ Espace supprimé
            "id": new_user.id,  # ✅ Espace supprimé
            "nom": new_user.nom,  # ✅ Espace supprimé
            "prenom": new_user.prenom,  # ✅ Espace supprimé
            "email": new_user.email,  # ✅ Espace supprimé
            "role": new_user.role,  # ✅ Espace supprimé
            "createdAt": new_user.created_at.isoformat(),  # ✅ Espace supprimé
        }
    }

@router.post("/login")
def login(user: LoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_access_token({"sub": user.email})  # ✅ Espace supprimé
    return {
        "access_token": token,  # ✅ Espace supprimé
        "token_type": "bearer",  # ✅ Espace supprimé
        "user": {  # ✅ Espace supprimé
            "id": db_user.id,  # ✅ Espace supprimé
            "nom": db_user.nom,  # ✅ Espace supprimé
            "prenom": db_user.prenom,  # ✅ Espace supprimé
            "email": db_user.email,  # ✅ Espace supprimé
            "role": db_user.role,  # ✅ Espace supprimé
            "createdAt": db_user.created_at.isoformat(),  # ✅ Espace supprimé
        }
    }

@router.get("/me")  # ✅ Espace supprimé
def get_me(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    db_user = db.query(User).filter(User.email == current_user).first()  # ✅ "Use r" corrigé
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")  # ✅ Espace supprimé
    return {
        "id": db_user.id,  # ✅ Espace supprimé
        "nom": db_user.nom,  # ✅ Espace supprimé
        "prenom": db_user.prenom,  # ✅ Espace supprimé
        "email": db_user.email,  # ✅ Espace supprimé
        "role": db_user.role,  # ✅ Espace supprimé
        "createdAt": db_user.created_at.isoformat(),  # ✅ Espace supprimé
    }
