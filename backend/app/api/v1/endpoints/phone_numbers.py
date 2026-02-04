"""
Phone number management endpoints.
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import DbSession, CurrentUser, CurrentAdmin
from app.db import models
from app.schemas.phone_number import PhoneNumberResponse, PhoneNumberClaim

router = APIRouter()


@router.get("/available", response_model=list[PhoneNumberResponse])
async def list_available_numbers(
    current_user: CurrentAdmin,
    db: DbSession,
) -> list[PhoneNumberResponse]:
    """
    List phone numbers available for claiming.

    Requires admin role.
    """
    result = await db.execute(
        select(models.PhoneNumber).where(
            models.PhoneNumber.status == "available",
            models.PhoneNumber.tenant_id.is_(None),
        )
    )
    numbers = result.scalars().all()
    return [PhoneNumberResponse.model_validate(n) for n in numbers]


@router.get("/mine", response_model=PhoneNumberResponse | None)
async def get_my_number(
    current_user: CurrentUser,
    db: DbSession,
) -> PhoneNumberResponse | None:
    """
    Get current user's assigned phone number.
    """
    if not current_user.assigned_phone_number_id:
        return None

    result = await db.execute(
        select(models.PhoneNumber).where(
            models.PhoneNumber.id == current_user.assigned_phone_number_id
        )
    )
    number = result.scalar_one_or_none()

    if not number:
        return None

    return PhoneNumberResponse.model_validate(number)


@router.get("", response_model=list[PhoneNumberResponse])
async def list_tenant_numbers(
    current_user: CurrentAdmin,
    db: DbSession,
) -> list[PhoneNumberResponse]:
    """
    List all phone numbers assigned to tenant.

    Requires admin role.
    """
    result = await db.execute(
        select(models.PhoneNumber).where(
            models.PhoneNumber.tenant_id == current_user.tenant_id
        )
    )
    numbers = result.scalars().all()
    return [PhoneNumberResponse.model_validate(n) for n in numbers]


@router.post("/claim", response_model=PhoneNumberResponse)
async def claim_number(
    claim: PhoneNumberClaim,
    current_user: CurrentAdmin,
    db: DbSession,
) -> PhoneNumberResponse:
    """
    Claim a phone number for the tenant.

    Requires admin role.
    """
    # Get the phone number
    result = await db.execute(
        select(models.PhoneNumber).where(
            models.PhoneNumber.id == claim.phone_number_id,
            models.PhoneNumber.status == "available",
        )
    )
    number = result.scalar_one_or_none()

    if not number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone number not available",
        )

    # Check tenant limits
    result = await db.execute(
        select(models.Tenant).where(models.Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one()

    result = await db.execute(
        select(models.PhoneNumber).where(
            models.PhoneNumber.tenant_id == current_user.tenant_id
        )
    )
    current_count = len(result.scalars().all())

    if current_count >= tenant.max_phone_numbers:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Phone number limit reached ({tenant.max_phone_numbers})",
        )

    # Assign to tenant
    number.tenant_id = current_user.tenant_id
    number.status = "assigned"
    number.assigned_at = datetime.now(timezone.utc)

    # Optionally assign to agent
    if claim.agent_id:
        result = await db.execute(
            select(models.Agent).where(
                models.Agent.id == claim.agent_id,
                models.Agent.tenant_id == current_user.tenant_id,
            )
        )
        agent = result.scalar_one_or_none()
        if agent:
            number.assigned_agent_id = agent.id

    await db.commit()
    await db.refresh(number)

    return PhoneNumberResponse.model_validate(number)


@router.post("/release", response_model=dict)
async def release_number(
    phone_number_id: UUID,
    current_user: CurrentAdmin,
    db: DbSession,
) -> dict:
    """
    Release a phone number back to the pool.

    Requires admin role.
    """
    result = await db.execute(
        select(models.PhoneNumber).where(
            models.PhoneNumber.id == phone_number_id,
            models.PhoneNumber.tenant_id == current_user.tenant_id,
        )
    )
    number = result.scalar_one_or_none()

    if not number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone number not found",
        )

    # Release
    number.tenant_id = None
    number.assigned_user_id = None
    number.assigned_agent_id = None
    number.status = "available"
    number.assigned_at = None

    await db.commit()

    return {"message": "Phone number released"}


@router.patch("/{phone_number_id}/assign")
async def assign_number_to_user(
    phone_number_id: UUID,
    user_id: UUID,
    agent_id: UUID | None = None,
    current_user: CurrentAdmin = None,
    db: DbSession = None,
) -> PhoneNumberResponse:
    """
    Assign a phone number to a user (and optionally an agent).

    Requires admin role.
    """
    # Get phone number
    result = await db.execute(
        select(models.PhoneNumber).where(
            models.PhoneNumber.id == phone_number_id,
            models.PhoneNumber.tenant_id == current_user.tenant_id,
        )
    )
    number = result.scalar_one_or_none()

    if not number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone number not found",
        )

    # Verify user exists in tenant
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

    # Assign
    number.assigned_user_id = user_id
    user.assigned_phone_number_id = phone_number_id

    if agent_id:
        result = await db.execute(
            select(models.Agent).where(
                models.Agent.id == agent_id,
                models.Agent.tenant_id == current_user.tenant_id,
            )
        )
        agent = result.scalar_one_or_none()
        if agent:
            number.assigned_agent_id = agent_id
            user.assigned_agent_id = agent_id

    await db.commit()
    await db.refresh(number)

    return PhoneNumberResponse.model_validate(number)
