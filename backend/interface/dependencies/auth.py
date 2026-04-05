from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from core.config import get_settings

settings = get_settings()
security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

# Alias
get_current_user_email = get_current_user
