"""
VoxCalls API - Main FastAPI Application.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import engine, AsyncSessionLocal
from app.db.models import Base, User
from app.api.v1.router import api_router


async def init_super_admin():
    """Initialize the super admin user if it doesn't exist."""
    async with AsyncSessionLocal() as db:
        # Check if super admin exists
        result = await db.execute(
            select(User).where(User.email == settings.SUPER_ADMIN_EMAIL)
        )
        existing_user = result.scalar_one_or_none()

        if not existing_user:
            # Create super admin user
            super_admin = User(
                email=settings.SUPER_ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
                full_name="Super Admin",
                role="super_admin",
                tenant_id=None,  # Super admin has no tenant
                is_active=True,
            )
            db.add(super_admin)
            await db.commit()
            print(f"Created super admin user: {settings.SUPER_ADMIN_EMAIL}")
        else:
            print(f"Super admin already exists: {settings.SUPER_ADMIN_EMAIL}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    async with engine.begin() as conn:
        # Create tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)

    # Initialize super admin
    await init_super_admin()

    yield

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="VoxCalls API",
    description="Multi-tenant Voice AI Platform powered by ElevenLabs",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "VoxCalls API",
        "version": "1.0.0",
        "docs": "/api/docs",
    }
