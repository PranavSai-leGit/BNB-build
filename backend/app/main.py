import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base
from app.seed import seed_database
from app.api.auth_routes import router as auth_router
from app.api.experiment_routes import router as experiment_router
from app.api.participant_routes import router as participant_router
from app.api.analytics_routes import router as analytics_router
from app.api.stimulus_routes import router as stimulus_router
from app.api.admin_routes import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created and seeded on startup
    Base.metadata.create_all(bind=engine)
    try:
        seed_database()
    except Exception as e:
        print(f"Startup seeding notice: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-quality SaaS platform for behavioral & cognitive science experiments with high-resolution browser timing.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Flexible for local dev & participant domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for stimuli assets
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/api/v1/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers under API v1
api_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_prefix)
app.include_router(experiment_router, prefix=api_prefix)
app.include_router(participant_router, prefix=api_prefix)
app.include_router(analytics_router, prefix=api_prefix)
app.include_router(stimulus_router, prefix=api_prefix)
app.include_router(admin_router, prefix=api_prefix)

@app.get("/health")
@app.get(f"{api_prefix}/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Cognera API",
        "version": "1.0.0",
        "timing_engine": "Browser-side High-Resolution Clock (performance.now)",
        "database": "Operational (Relational + JSONB)"
    }
