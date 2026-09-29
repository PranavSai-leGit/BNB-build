from sqlalchemy import create_engine, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from app.config import settings

import os
from sqlalchemy.pool import NullPool, QueuePool

# Hybrid JSON type: native JSONB on PostgreSQL, JSON on SQLite
JSON_TYPE = JSONB().with_variant(JSON, "sqlite")

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))

engine_kwargs = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
}

if is_serverless:
    # On Vercel serverless functions, avoid connection pool freezing by using NullPool
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
