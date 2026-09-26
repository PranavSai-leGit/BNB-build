import os
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cognera SaaS"
    API_V1_STR: str = "/api/v1"

    # Database credentials read from environment (.env)
    DB_USERNAME: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_HOST: Optional[str] = "localhost"
    DB_PORT: Optional[str] = "5432"
    DB_NAME: Optional[str] = "cognilab"
    DATABASE_URL: Optional[str] = None

    JWT_SECRET: str = "super-secret-key-cognera-dev-change-in-prod-89241f9b"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:4173"
    ]
    UPLOAD_DIR: str = os.path.abspath("./uploads")
    AUDIT_ENABLED: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"

    def get_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.DB_USERNAME and self.DB_PASSWORD:
            host = self.DB_HOST or "localhost"
            port = self.DB_PORT or "5432"
            db = self.DB_NAME or "cognilab"
            return f"postgresql+psycopg2://{self.DB_USERNAME}:{self.DB_PASSWORD}@{host}:{port}/{db}"
        return "sqlite:///./cognera.db"

settings = Settings()
settings.DATABASE_URL = settings.get_database_url()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
