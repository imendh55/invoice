from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["Authentification"])

# Mot de passe secret (change-le plus tard)
SECRET_KEY = "super-secret-key-pour-ton-pfe-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Pour crypter les mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Utilisateur de test (pour l’instant, pas de base de données)
fake_users = {
    "imen": {
        "username": "imen",
        "hashed_password": pwd_context.hash("123456"),  # mot de passe = 123456
    }
}

class LoginRequest(BaseModel):
    username: str
    password: str

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login")
def login(user: LoginRequest):
    db_user = fake_users.get(user.username)
    if not db_user or not pwd_context.verify(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Nom d'utilisateur ou mot de passe incorrect")
    
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}