"""
FastAPI dependencies for authentication and database access.
"""
from typing import Annotated, Generator
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import async_session_maker
from app.db import models

# Security scheme
security = HTTPBearer()


async def get_db() -> Generator[AsyncSession, None, None]:
    """Dependency to get database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> models.User:
    """
    Dependency to get the current authenticated user.

    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "access":
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Get user from database
    from sqlalchemy import select

    result = await db.execute(
        select(models.User).where(models.User.id == UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )

    return user


async def get_current_active_user(
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> models.User:
    """Dependency to ensure user is active."""
    return current_user


async def get_current_admin(
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> models.User:
    """Dependency to ensure user is an admin or super_admin."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_current_super_admin(
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> models.User:
    """Dependency to ensure user is a super_admin."""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


def require_tenant_access(tenant_id: UUID):
    """
    Dependency factory to check user has access to a specific tenant.

    Usage:
        @router.get("/tenants/{tenant_id}/...")
        async def endpoint(
            tenant_id: UUID,
            _: None = Depends(require_tenant_access(tenant_id))
        ):
    """

    async def check_access(
        current_user: Annotated[models.User, Depends(get_current_user)],
    ) -> None:
        # Super admins can access any tenant
        if current_user.role == "super_admin":
            return

        # Other users can only access their own tenant
        if current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this tenant",
            )

    return check_access


# Type aliases for cleaner endpoint signatures
CurrentUser = Annotated[models.User, Depends(get_current_user)]
CurrentAdmin = Annotated[models.User, Depends(get_current_admin)]
CurrentSuperAdmin = Annotated[models.User, Depends(get_current_super_admin)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
