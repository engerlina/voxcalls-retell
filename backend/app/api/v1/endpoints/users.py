"""
User management endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import DbSession, CurrentUser, CurrentAdmin
from app.db import models
from app.schemas.user import UserResponse, UserUpdate, InvitationCreate, InvitationResponse

router = APIRouter()


@router.get("", response_model=list[UserResponse])
async def list_users(
    current_user: CurrentAdmin,
    db: DbSession,
) -> list[UserResponse]:
    """
    List all users in tenant.

    Requires admin role.
    """
    result = await db.execute(
        select(models.User).where(models.User.tenant_id == current_user.tenant_id)
    )
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> UserResponse:
    """
    Get user by ID.

    Users can get their own info. Admins can get any user in tenant.
    """
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check access
    if current_user.role != "super_admin":
        if user.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        if current_user.role == "user" and user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    update: UserUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> UserResponse:
    """
    Update user.

    Users can update their own info. Admins can update any user in tenant.
    """
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check access
    if current_user.role != "super_admin":
        if user.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        if current_user.role == "user" and user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

    # Update fields
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    current_user: CurrentAdmin,
    db: DbSession,
) -> dict:
    """
    Remove user from tenant.

    Requires admin role. Cannot delete self.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )

    result = await db.execute(
        select(models.User).where(
            models.User.id == user_id,
            models.User.tenant_id == current_user.tenant_id,
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}


@router.patch("/{user_id}/role", response_model=UserResponse)
async def change_user_role(
    user_id: UUID,
    role: str,
    current_user: CurrentAdmin,
    db: DbSession,
) -> UserResponse:
    """
    Change user role.

    Requires admin role. Can only set admin or user roles.
    """
    if role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'admin' or 'user'",
        )

    result = await db.execute(
        select(models.User).where(
            models.User.id == user_id,
            models.User.tenant_id == current_user.tenant_id,
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.role = role
    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


# Invitation endpoints
@router.post("/invite", response_model=InvitationResponse)
async def invite_user(
    invitation: InvitationCreate,
    current_user: CurrentAdmin,
    db: DbSession,
) -> InvitationResponse:
    """
    Invite a user to the tenant.

    Requires admin role.
    """
    import secrets
    from datetime import datetime, timedelta, timezone

    # Check if email already exists
    result = await db.execute(
        select(models.User).where(models.User.email == invitation.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check for existing pending invitation
    result = await db.execute(
        select(models.Invitation).where(
            models.Invitation.email == invitation.email,
            models.Invitation.tenant_id == current_user.tenant_id,
            models.Invitation.accepted_at.is_(None),
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation already pending",
        )

    # Create invitation
    invite = models.Invitation(
        tenant_id=current_user.tenant_id,
        email=invitation.email,
        role=invitation.role,
        token=secrets.token_urlsafe(32),
        invited_by=current_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    # TODO: Send invitation email

    return InvitationResponse.model_validate(invite)


@router.get("/invitations", response_model=list[InvitationResponse])
async def list_invitations(
    current_user: CurrentAdmin,
    db: DbSession,
) -> list[InvitationResponse]:
    """
    List pending invitations.

    Requires admin role.
    """
    result = await db.execute(
        select(models.Invitation).where(
            models.Invitation.tenant_id == current_user.tenant_id,
            models.Invitation.accepted_at.is_(None),
        )
    )
    invitations = result.scalars().all()
    return [InvitationResponse.model_validate(i) for i in invitations]
