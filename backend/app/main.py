"""
VoxCalls API - Main FastAPI Application.
"""
import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.config import settings

logger = logging.getLogger(__name__)

# Log CORS configuration on startup
logger.info(f"CORS origins configured: {settings.CORS_ORIGINS}")
from app.core.security import get_password_hash
from app.db.session import engine, AsyncSessionLocal
from app.db.models import Base, User
from app.api.v1.router import api_router


async def add_missing_columns():
    """Add any missing columns to existing tables."""
    async with engine.begin() as conn:
        # Check if tools_config column exists in agents table
        result = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'agents' AND column_name = 'tools_config'
        """))
        if not result.fetchone():
            print("Adding tools_config column to agents table...")
            await conn.execute(text("""
                ALTER TABLE agents ADD COLUMN tools_config JSONB DEFAULT '{}'::jsonb
            """))
            print("Added tools_config column")


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
                password_hash=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
                name="Super Admin",
                role="super_admin",
                tenant_id=None,  # Super admin has no tenant
                status="active",
            )
            db.add(super_admin)
            await db.commit()
            print(f"Created super admin user: {settings.SUPER_ADMIN_EMAIL}")
        else:
            # Update password in case it changed
            existing_user.password_hash = get_password_hash(settings.SUPER_ADMIN_PASSWORD)
            await db.commit()
            print(f"Super admin already exists: {settings.SUPER_ADMIN_EMAIL}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    async with engine.begin() as conn:
        # Create tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)

    # Add any missing columns to existing tables
    await add_missing_columns()

    # Initialize super admin
    await init_super_admin()

    yield

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="VoxCalls API",
    description="Multi-tenant Voice AI Platform powered by Retell AI",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
)

# Helper function to check if origin is allowed
def is_origin_allowed(origin: str | None) -> bool:
    """Check if the origin is in the allowed CORS origins list."""
    if not origin:
        return False
    return origin in settings.CORS_ORIGINS or "*" in settings.CORS_ORIGINS


# Helper function to add CORS headers to a response
def add_cors_headers(response: Response, origin: str) -> Response:
    """Add CORS headers to a response."""
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "600"
    return response


# Custom middleware to ensure CORS headers on ALL responses including errors
class CORSErrorMiddleware(BaseHTTPMiddleware):
    """Ensure CORS headers are added to all responses, including error responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        origin = request.headers.get("origin")

        # Log CORS request for debugging
        if origin:
            logger.debug(f"CORS request from origin: {origin}, method: {request.method}, path: {request.url.path}")

        # Handle preflight OPTIONS requests explicitly
        if request.method == "OPTIONS":
            response = Response(status_code=200)
            if is_origin_allowed(origin):
                add_cors_headers(response, origin)
            return response

        # Process the request
        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(f"Unhandled exception in middleware: {exc}")
            logger.error(traceback.format_exc())
            response = JSONResponse(
                status_code=500,
                content={"detail": f"Internal server error: {str(exc)}"},
            )

        # ALWAYS add CORS headers to response if origin is allowed
        if is_origin_allowed(origin):
            add_cors_headers(response, origin)

        return response


# CORS middleware (FastAPI's built-in) - added FIRST so it processes LAST
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add our custom CORS middleware LAST (so it processes FIRST, before any other middleware)
app.add_middleware(CORSErrorMiddleware)


# Global exception handler to ensure errors return proper JSON responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle any unhandled exceptions with a proper JSON response."""
    # Log the full traceback
    logger.error(f"Unhandled exception on {request.method} {request.url.path}:")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
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
