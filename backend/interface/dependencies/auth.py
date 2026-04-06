from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from core.config import get_settings
from core.db import get_db

settings = get_settings()
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """Retourne l'email de l'utilisateur connecté, ou lève 401."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Token manquant")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Token invalide")
        return email
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")


def get_current_admin(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> str:
    """
    Vérifie que l'utilisateur connecté est un admin.
    Retourne son email, ou lève 403.
    """
    from infrastructure.database.models import User
    user = db.query(User).filter(User.email == current_user).first()
    if not user or user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Accès refusé — réservé aux administrateurs"
        )
    return current_user


# Alias pour compatibilité
get_current_user_email = get_current_user
