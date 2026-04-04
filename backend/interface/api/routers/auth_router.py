from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
<<<<<<< HEAD

from core.config import get_settings
from core.db import get_db
from infrastructure.database.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])   # ← Important : prefix="/auth" seulement
=======
from core.config import get_settings
from core.db import get_db
from infrastructure.database.models import User
from core.config import get_settings
router = APIRouter(prefix="/auth", tags=["Auth"])
>>>>>>> origin/main

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
<<<<<<< HEAD
    email: str
    password: str

class RegisterRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    password: str
    dateAnniversaire: str | None = None
    cin: str | None = None
=======
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
>>>>>>> origin/main

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/register")
def register(user: RegisterRequest, db: Session = Depends(get_db)):
<<<<<<< HEAD
    existing = db.query(User).filter(User.username == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    hashed = pwd_context.hash(user.password)
    new_user = User(
        username=user.email,
        hashed_password=hashed,
        nom=user.nom,
        prenom=user.prenom,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "nom": new_user.nom,
            "prenom": new_user.prenom,
            "email": new_user.username,
            "role": "user"
        }
    }

@router.post("/login")
def login(user: LoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_access_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "nom": db_user.nom,
            "prenom": db_user.prenom,
            "email": db_user.username,
            "role": "user"
        }
    }
=======
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Utilisateur existe déjà")

    hashed = pwd_context.hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    return {"message": "Inscription réussie"}

@router.post("/login")
def login(user: LoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}
>>>>>>> origin/main
