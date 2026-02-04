"""
API v1 router - aggregates all endpoint routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, agents, documents, calls, phone_numbers, admin

api_router = APIRouter()

# Public routes
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# Protected routes
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"],
)
api_router.include_router(
    agents.router,
    prefix="/agents",
    tags=["Agents"],
)
api_router.include_router(
    documents.router,
    prefix="/documents",
    tags=["Documents"],
)
api_router.include_router(
    calls.router,
    prefix="/calls",
    tags=["Calls"],
)
api_router.include_router(
    phone_numbers.router,
    prefix="/phone-numbers",
    tags=["Phone Numbers"],
)

# Admin routes
api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin"],
)
