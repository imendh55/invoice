from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    SECRET_KEY: str = "super-secret-key-pour-ton-pfe-2026-changez-la-en-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440   # 24 heures

    # Database
    DATABASE_URL: str = "sqlite:///./invoice_ai.db"

    # Gemini
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
