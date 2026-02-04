"""
Super Admin endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func

from app.core.deps import DbSession, CurrentSuperAdmin
from app.db import models
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse
from app.schemas.phone_number import (
    PhoneNumberCreate,
    PhoneNumberResponse,
    TwilioNumberSearch,
    TwilioNumberResult,
)
from app.schemas.user import UserResponse
from app.services.twilio import TwilioService
from app.services.elevenlabs import ElevenLabsService

router = APIRouter()


# ============================================================================
# Tenant Management
# ============================================================================


@router.get("/tenants", response_model=list[TenantResponse])
async def list_tenants(
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> list[TenantResponse]:
    """
    List all tenants.

    Requires super_admin role.
    """
    result = await db.execute(select(models.Tenant))
    tenants = result.scalars().all()
    return [TenantResponse.model_validate(t) for t in tenants]


@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    tenant: TenantCreate,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> TenantResponse:
    """
    Create a new tenant.

    Requires super_admin role.
    """
    # Check slug uniqueness
    result = await db.execute(
        select(models.Tenant).where(models.Tenant.slug == tenant.slug)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant slug already exists",
        )

    db_tenant = models.Tenant(**tenant.model_dump())
    db.add(db_tenant)
    await db.commit()
    await db.refresh(db_tenant)

    return TenantResponse.model_validate(db_tenant)


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: UUID,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> TenantResponse:
    """
    Get tenant by ID.

    Requires super_admin role.
    """
    result = await db.execute(
        select(models.Tenant).where(models.Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    return TenantResponse.model_validate(tenant)


@router.patch("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: UUID,
    update: TenantUpdate,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> TenantResponse:
    """
    Update tenant.

    Requires super_admin role.
    """
    result = await db.execute(
        select(models.Tenant).where(models.Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    await db.commit()
    await db.refresh(tenant)

    return TenantResponse.model_validate(tenant)


@router.post("/tenants/{tenant_id}/suspend")
async def suspend_tenant(
    tenant_id: UUID,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> dict:
    """
    Suspend a tenant.

    Requires super_admin role.
    """
    result = await db.execute(
        select(models.Tenant).where(models.Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    tenant.status = "suspended"
    await db.commit()

    return {"message": "Tenant suspended"}


@router.post("/tenants/{tenant_id}/activate")
async def activate_tenant(
    tenant_id: UUID,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> dict:
    """
    Activate a tenant.

    Requires super_admin role.
    """
    result = await db.execute(
        select(models.Tenant).where(models.Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    tenant.status = "active"
    await db.commit()

    return {"message": "Tenant activated"}


# ============================================================================
# Phone Number Pool Management
# ============================================================================


@router.get("/phone-numbers", response_model=list[PhoneNumberResponse])
async def list_all_phone_numbers(
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> list[PhoneNumberResponse]:
    """
    List all phone numbers in the pool.

    Requires super_admin role.
    """
    result = await db.execute(select(models.PhoneNumber))
    numbers = result.scalars().all()
    return [PhoneNumberResponse.model_validate(n) for n in numbers]


@router.post("/phone-numbers/search", response_model=list[TwilioNumberResult])
async def search_twilio_numbers(
    search: TwilioNumberSearch,
    current_user: CurrentSuperAdmin,
) -> list[TwilioNumberResult]:
    """
    Search for available numbers in Twilio.

    Requires super_admin role.
    """
    twilio = TwilioService()
    numbers = await twilio.search_available_numbers(
        country_code=search.country_code,
        area_code=search.area_code,
        contains=search.contains,
        number_type=search.number_type,
    )
    return numbers


@router.post("/phone-numbers/purchase", response_model=PhoneNumberResponse)
async def purchase_number(
    phone_number: str,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> PhoneNumberResponse:
    """
    Purchase a number from Twilio and add to pool.

    Requires super_admin role.
    """
    # Purchase from Twilio
    twilio = TwilioService()
    twilio_number = await twilio.purchase_number(phone_number)

    # Import to ElevenLabs
    elevenlabs = ElevenLabsService()
    elevenlabs_phone = await elevenlabs.import_phone_number(
        phone_number=twilio_number["phone_number"],
        twilio_sid=twilio_number["sid"],
    )

    # Add to database
    db_number = models.PhoneNumber(
        twilio_sid=twilio_number["sid"],
        phone_number=twilio_number["phone_number"],
        country_code=twilio_number.get("country_code"),
        number_type=twilio_number.get("number_type", "local"),
        elevenlabs_phone_id=elevenlabs_phone.get("phone_number_id"),
        supports_inbound=True,
        supports_outbound=True,
        status="available",
    )
    db.add(db_number)
    await db.commit()
    await db.refresh(db_number)

    return PhoneNumberResponse.model_validate(db_number)


@router.post("/phone-numbers/import", response_model=PhoneNumberResponse)
async def import_existing_number(
    number: PhoneNumberCreate,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> PhoneNumberResponse:
    """
    Import an existing Twilio number to the pool.

    Requires super_admin role.
    """
    # Check if already exists
    result = await db.execute(
        select(models.PhoneNumber).where(
            models.PhoneNumber.twilio_sid == number.twilio_sid
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already in pool",
        )

    # Import to ElevenLabs
    elevenlabs = ElevenLabsService()
    elevenlabs_phone = await elevenlabs.import_phone_number(
        phone_number=number.phone_number,
        twilio_sid=number.twilio_sid,
    )

    # Add to database
    db_number = models.PhoneNumber(
        **number.model_dump(),
        elevenlabs_phone_id=elevenlabs_phone.get("phone_number_id"),
        status="available",
    )
    db.add(db_number)
    await db.commit()
    await db.refresh(db_number)

    return PhoneNumberResponse.model_validate(db_number)


@router.delete("/phone-numbers/{phone_number_id}")
async def delete_phone_number(
    phone_number_id: UUID,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> dict:
    """
    Remove a phone number from the pool.

    Requires super_admin role. Number must not be assigned.
    """
    result = await db.execute(
        select(models.PhoneNumber).where(models.PhoneNumber.id == phone_number_id)
    )
    number = result.scalar_one_or_none()

    if not number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone number not found",
        )

    if number.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete assigned phone number. Release it first.",
        )

    # Delete from ElevenLabs
    if number.elevenlabs_phone_id:
        try:
            elevenlabs = ElevenLabsService()
            await elevenlabs.delete_phone_number(number.elevenlabs_phone_id)
        except Exception:
            pass

    await db.delete(number)
    await db.commit()

    return {"message": "Phone number deleted"}


# ============================================================================
# Analytics
# ============================================================================


@router.get("/analytics")
async def get_platform_analytics(
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> dict:
    """
    Get platform-wide analytics.

    Requires super_admin role.
    """
    # Count tenants
    result = await db.execute(select(func.count(models.Tenant.id)))
    total_tenants = result.scalar()

    # Count users
    result = await db.execute(select(func.count(models.User.id)))
    total_users = result.scalar()

    # Count agents
    result = await db.execute(
        select(func.count(models.Agent.id)).where(models.Agent.status != "deleted")
    )
    total_agents = result.scalar()

    # Count phone numbers
    result = await db.execute(select(func.count(models.PhoneNumber.id)))
    total_phone_numbers = result.scalar()

    result = await db.execute(
        select(func.count(models.PhoneNumber.id)).where(
            models.PhoneNumber.status == "available"
        )
    )
    available_phone_numbers = result.scalar()

    # Count calls
    result = await db.execute(select(func.count(models.Call.id)))
    total_calls = result.scalar()

    return {
        "tenants": {
            "total": total_tenants,
        },
        "users": {
            "total": total_users,
        },
        "agents": {
            "total": total_agents,
        },
        "phone_numbers": {
            "total": total_phone_numbers,
            "available": available_phone_numbers,
            "assigned": total_phone_numbers - available_phone_numbers,
        },
        "calls": {
            "total": total_calls,
        },
    }


@router.get("/users", response_model=list[UserResponse])
async def list_all_users(
    current_user: CurrentSuperAdmin,
    db: DbSession,
    tenant_id: UUID | None = None,
) -> list[UserResponse]:
    """
    List all users (optionally filtered by tenant).

    Requires super_admin role.
    """
    query = select(models.User)

    if tenant_id:
        query = query.where(models.User.tenant_id == tenant_id)

    result = await db.execute(query)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]
