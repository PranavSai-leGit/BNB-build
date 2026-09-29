import os
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cognera SaaS"
    API_V1_STR: str = "/api/v1"

    # Database credentials read from environment (.env or Vercel Environment Variables)
    DB_USERNAME: Optional[str] = None
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_HOST: Optional[str] = "localhost"
    DB_PORT: Optional[str] = "5432"
    DB_NAME: Optional[str] = "cognilab"
    DB_SSLMODE: Optional[str] = None
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
    UPLOAD_DIR: str = os.path.abspath("/tmp/uploads" if os.getenv("VERCEL") else "./uploads")
    AUDIT_ENABLED: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"

    def get_database_url(self) -> str:
        import urllib.parse
        import socket

        # 1. Direct DATABASE_URL provided (e.g. from Supabase / Vercel env)
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            if ("supabase.co" in url or "supabase.com" in url) and "sslmode" not in url:
                delimiter = "&" if "?" in url else "?"
                url = f"{url}{delimiter}sslmode=require"
            return url

        # 2. Individual credentials provided
        username = self.DB_USERNAME or self.DB_USER
        if username and self.DB_PASSWORD:
            host = self.DB_HOST or "localhost"
            port = self.DB_PORT or "5432"
            db = self.DB_NAME or "postgres"
            password = self.DB_PASSWORD
            sslmode = self.DB_SSLMODE

            # Supabase Host & Pooler Resolution:
            # Supabase direct host (db.<ref>.supabase.co) only supports IPv6 on free tier.
            # When deploying on Vercel or networks without IPv6 routes, resolve to the Supavisor pooler.
            if "supabase.co" in host or "supabase.com" in host:
                parts = host.split(".")
                ref = parts[1] if (len(parts) >= 3 and parts[0] == "db") else None
                if not ref and "." in username:
                    ref = username.split(".", 1)[1]

                # Check if host can be resolved via IPv4
                can_resolve_ipv4 = True
                try:
                    socket.getaddrinfo(host, int(port), socket.AF_INET)
                except Exception:
                    can_resolve_ipv4 = False

                if not can_resolve_ipv4:
                    # Switch to pooler host
                    host = "aws-0-ap-south-1.pooler.supabase.com"
                    if ref and not username.endswith(f".{ref}"):
                        username = f"{username}.{ref}"

                if not sslmode:
                    sslmode = "require"

            # URL-encode credentials to safely support special characters like '=' in passwords
            encoded_user = urllib.parse.quote_plus(username)
            encoded_pass = urllib.parse.quote_plus(password)

            url = f"postgresql+psycopg2://{encoded_user}:{encoded_pass}@{host}:{port}/{db}"

            if not sslmode and host not in ("localhost", "127.0.0.1"):
                sslmode = "require"

            if sslmode:
                url += f"?sslmode={sslmode}"

            return url

        return "sqlite:///./cognera.db"

settings = Settings()
settings.DATABASE_URL = settings.get_database_url()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
