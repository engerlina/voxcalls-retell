"""
Authentication endpoints.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import DbSession, CurrentUser
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.db import models
from app.schemas.auth import (
    Token,
    LoginRequest,
    RegisterRequest,
    RefreshRequest,
    InvitationValidation,
    AcceptInvitationRequest,
)
from app.schemas.user import UserResponse
from app.schemas.tenant import TenantCreate

router = APIRouter()


@router.post("/register", response_model=Token)
async def register(
    request: RegisterRequest,
    db: DbSession,
) -> Token:
    """
    Register a new tenant and admin user.

    Creates:
    - New tenant organization
    - First user as admin
    - Returns JWT tokens
    """
    # Check if email already exists
    result = await db.execute(
        select(models.User).where(models.User.email == request.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check if tenant slug already exists
    result = await db.execute(
        select(models.Tenant).where(models.Tenant.slug == request.tenant_slug)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant slug already taken",
        )

    # Create tenant
    tenant = models.Tenant(
        name=request.tenant_name,
        slug=request.tenant_slug,
        status="active",
        plan="free",
    )
    db.add(tenant)
    await db.flush()

    # Create admin user
    user = models.User(
        tenant_id=tenant.id,
        email=request.email,
        password_hash=get_password_hash(request.password),
        name=request.name,
        role="admin",
        status="active",
        email_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Generate tokens
    access_token = create_access_token(
        subject=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    # Store refresh token
    token_record = models.RefreshToken(
        user_id=user.id,
        token_hash=get_password_hash(refresh_token),
        expires_at=datetime.now(timezone.utc).replace(
            tzinfo=None
        ),  # Will be set by token creation
    )
    db.add(token_record)
    await db.commit()

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=Token)
async def login(
    request: LoginRequest,
    db: DbSession,
) -> Token:
    """
    Login with email and password.

    Returns JWT access and refresh tokens.
    """
    # Find user
    result = await db.execute(
        select(models.User).where(models.User.email == request.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    # Generate tokens
    access_token = create_access_token(
        subject=str(user.id),
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        role=user.role,
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=Token)
async def refresh(
    request: RefreshRequest,
    db: DbSession,
) -> Token:
    """
    Refresh access token using refresh token.
    """
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Get user
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Generate new tokens
    access_token = create_access_token(
        subject=str(user.id),
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        role=user.role,
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: CurrentUser,
) -> UserResponse:
    """
    Get current authenticated user info.
    """
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout(
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """
    Logout - revoke all refresh tokens.
    """
    # Revoke all refresh tokens for user
    result = await db.execute(
        select(models.RefreshToken).where(
            models.RefreshToken.user_id == current_user.id,
            models.RefreshToken.revoked_at.is_(None),
        )
    )
    tokens = result.scalars().all()

    for token in tokens:
        token.revoked_at = datetime.now(timezone.utc)

    await db.commit()

    return {"message": "Logged out successfully"}


@router.get("/invite/{token}", response_model=InvitationValidation)
async def validate_invitation(
    token: str,
    db: DbSession,
) -> InvitationValidation:
    """
    Validate an invitation token and return invitation details.

    This is a public endpoint - no authentication required.
    """
    # Find invitation by token
    result = await db.execute(
        select(models.Invitation).where(models.Invitation.token == token)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation",
        )

    # Check if already accepted
    if invitation.accepted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has already been used",
        )

    # Check if expired
    now = datetime.now(timezone.utc)
    expires_at = invitation.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if now > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )

    # Get tenant name
    result = await db.execute(
        select(models.Tenant).where(models.Tenant.id == invitation.tenant_id)
    )
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    return InvitationValidation(
        email=invitation.email,
        tenant_name=tenant.name,
        tenant_id=str(invitation.tenant_id),
        role=invitation.role,
        expires_at=invitation.expires_at.isoformat(),
        is_valid=True,
    )


@router.post("/invite/{token}/accept", response_model=Token)
async def accept_invitation(
    token: str,
    request: AcceptInvitationRequest,
    db: DbSession,
) -> Token:
    """
    Accept an invitation and create a new user account.

    This is a public endpoint - no authentication required.
    """
    # Find invitation by token
    result = await db.execute(
        select(models.Invitation).where(models.Invitation.token == token)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation",
        )

    # Check if already accepted
    if invitation.accepted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has already been used",
        )

    # Check if expired
    now = datetime.now(timezone.utc)
    expires_at = invitation.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if now > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )

    # Check if email is already registered (race condition protection)
    result = await db.execute(
        select(models.User).where(models.User.email == invitation.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Validate password length
    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    # Create user
    user = models.User(
        tenant_id=invitation.tenant_id,
        email=invitation.email,
        password_hash=get_password_hash(request.password),
        name=request.name,
        role=invitation.role,
        status="active",
        email_verified=True,  # Invitation implies email ownership
    )
    db.add(user)

    # Mark invitation as accepted
    invitation.accepted_at = now

    await db.commit()
    await db.refresh(user)

    # Update last login
    user.last_login_at = now
    await db.commit()

    # Generate tokens
    access_token = create_access_token(
        subject=str(user.id),
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        role=user.role,
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    # Store refresh token
    token_record = models.RefreshToken(
        user_id=user.id,
        token_hash=get_password_hash(refresh_token),
        expires_at=now,  # Will be set by token creation
    )
    db.add(token_record)
    await db.commit()

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )
