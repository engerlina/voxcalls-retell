"""
Super Admin endpoints.
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import DbSession, CurrentSuperAdmin
from app.db import models
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse
from app.schemas.phone_number import (
    PhoneNumberCreate,
    PhoneNumberResponse,
    TwilioNumberSearch,
    TwilioNumberResult,
    TwilioNumberBulkResult,
    PurchaseNumberRequest,
)
from app.schemas.user import UserResponse, AdminInvitationCreate, AdminInvitationResponse, AdminUserUpdate
from app.services.twilio import TwilioService
from app.services.elevenlabs import ElevenLabsService

logger = logging.getLogger(__name__)
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


@router.post("/phone-numbers/search-by-country", response_model=TwilioNumberBulkResult)
async def search_twilio_numbers_by_country(
    current_user: CurrentSuperAdmin,
    country_code: str = "AU",
    limit_per_type: int = 10,
) -> TwilioNumberBulkResult:
    """
    Search for available numbers in a country, grouped by type.

    Returns up to limit_per_type numbers for each type (local, mobile, toll_free).
    Includes pricing information per number type.
    Requires super_admin role.
    """
    twilio = TwilioService()

    results: dict = {
        "local": [],
        "mobile": [],
        "toll_free": [],
        "pricing": {},
    }

    # Fetch pricing for this country
    try:
        pricing_data = await twilio.get_phone_number_pricing(country_code)
        for price_info in pricing_data.get("phone_number_prices", []):
            number_type = price_info.get("number_type", "").lower()
            current_price = price_info.get("current_price")
            if number_type and current_price:
                # Map Twilio's number types to our types
                if number_type == "local":
                    results["pricing"]["local"] = current_price
                elif number_type == "mobile":
                    results["pricing"]["mobile"] = current_price
                elif number_type in ["toll free", "tollfree", "toll_free"]:
                    results["pricing"]["toll_free"] = current_price
    except Exception:
        pass  # Pricing is optional

    for number_type in ["local", "mobile", "toll_free"]:
        try:
            numbers = await twilio.search_available_numbers(
                country_code=country_code,
                number_type=number_type,
                limit=limit_per_type,
            )
            results[number_type] = numbers
        except Exception:
            # Some countries may not support all types
            results[number_type] = []

    return TwilioNumberBulkResult(**results)


@router.get("/phone-numbers/addresses")
async def list_twilio_addresses(
    current_user: CurrentSuperAdmin,
) -> list[dict]:
    """
    List all addresses in the Twilio account.

    This helps find the address SID needed for purchasing numbers
    in countries that require regulatory addresses (e.g., Australia).
    Requires super_admin role.
    """
    try:
        twilio = TwilioService()
        addresses = await twilio.get_addresses()
        return addresses
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch addresses: {str(e)}",
        )


@router.post("/phone-numbers/purchase", response_model=PhoneNumberResponse)
async def purchase_number(
    request: PurchaseNumberRequest,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> PhoneNumberResponse:
    """
    Purchase a number from Twilio and add to pool.

    Requires super_admin role.
    """
    # Purchase from Twilio
    try:
        twilio = TwilioService()
        twilio_number = await twilio.purchase_number(request.phone_number)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to purchase number from Twilio: {str(e)}",
        )

    # Import to ElevenLabs
    elevenlabs_phone_id = None
    try:
        elevenlabs = ElevenLabsService()
        elevenlabs_phone = await elevenlabs.import_phone_number(
            phone_number=twilio_number["phone_number"],
            twilio_sid=twilio_number["sid"],
        )
        elevenlabs_phone_id = elevenlabs_phone.get("phone_number_id")
    except Exception:
        # ElevenLabs import is optional - continue without it
        pass

    # Add to database with the number_type and country_code from the request
    db_number = models.PhoneNumber(
        twilio_sid=twilio_number["sid"],
        phone_number=twilio_number["phone_number"],
        country_code=request.country_code,
        number_type=request.number_type,
        elevenlabs_phone_id=elevenlabs_phone_id,
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


@router.post("/phone-numbers/sync-elevenlabs")
async def sync_phone_numbers_to_elevenlabs(
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> dict:
    """
    Sync all phone numbers with assigned agents to ElevenLabs.

    This endpoint:
    1. Finds all phone numbers that have an assigned agent
    2. Imports them to ElevenLabs if not already imported
    3. Assigns them to their agents in ElevenLabs

    Use this to fix phone numbers that were assigned before ElevenLabs
    integration was implemented.

    Requires super_admin role.
    """
    elevenlabs = ElevenLabsService()

    # Find all phone numbers with assigned agents
    result = await db.execute(
        select(models.PhoneNumber)
        .options(selectinload(models.PhoneNumber.assigned_agent))
        .where(models.PhoneNumber.assigned_agent_id.isnot(None))
    )
    phone_numbers = result.scalars().all()

    synced = []
    errors = []

    for number in phone_numbers:
        agent = number.assigned_agent
        if not agent or not agent.elevenlabs_agent_id:
            errors.append({
                "phone_number": number.phone_number,
                "error": "Agent not found or missing ElevenLabs agent ID",
            })
            continue

        try:
            # Step 1: Import to ElevenLabs if not already imported
            if not number.elevenlabs_phone_id:
                logger.info(f"Importing phone number {number.phone_number} to ElevenLabs")
                import_result = await elevenlabs.import_phone_number(
                    phone_number=number.phone_number,
                    twilio_sid=number.twilio_sid,
                )
                number.elevenlabs_phone_id = import_result.get("phone_number_id")
                logger.info(f"Phone number imported, ElevenLabs ID: {number.elevenlabs_phone_id}")

            # Step 2: Assign to agent in ElevenLabs
            logger.info(f"Assigning phone {number.elevenlabs_phone_id} to agent {agent.elevenlabs_agent_id}")
            await elevenlabs.assign_phone_to_agent(
                phone_id=number.elevenlabs_phone_id,
                agent_id=agent.elevenlabs_agent_id,
            )

            synced.append({
                "phone_number": number.phone_number,
                "elevenlabs_phone_id": number.elevenlabs_phone_id,
                "agent_name": agent.name,
            })

        except Exception as e:
            logger.error(f"Failed to sync phone number {number.phone_number}: {e}")
            errors.append({
                "phone_number": number.phone_number,
                "error": str(e),
            })

    await db.commit()

    return {
        "message": f"Synced {len(synced)} phone numbers to ElevenLabs",
        "synced": synced,
        "errors": errors,
    }


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


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    update: AdminUserUpdate,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> UserResponse:
    """
    Update a user (admin level).

    Requires super_admin role.
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

    update_data = update.model_dump(exclude_unset=True)

    # Validate role if being updated
    if "role" in update_data:
        if update_data["role"] not in ["super_admin", "admin", "user"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role. Must be 'super_admin', 'admin', or 'user'",
            )

    # Validate status if being updated
    if "status" in update_data:
        if update_data["status"] not in ["active", "inactive", "suspended"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be 'active', 'inactive', or 'suspended'",
            )

    # Validate tenant_id if being updated
    if "tenant_id" in update_data and update_data["tenant_id"] is not None:
        result = await db.execute(
            select(models.Tenant).where(models.Tenant.id == update_data["tenant_id"])
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant not found",
            )

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


# ============================================================================
# User Invitations
# ============================================================================


@router.post("/invitations", response_model=AdminInvitationResponse)
async def create_admin_invitation(
    invitation: AdminInvitationCreate,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> AdminInvitationResponse:
    """
    Create a user invitation for any tenant.

    Requires super_admin role. Creates a magic link that allows a user
    to sign up directly into the specified tenant.
    """
    # Validate tenant exists
    result = await db.execute(
        select(models.Tenant).where(models.Tenant.id == invitation.tenant_id)
    )
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    # Check email is not already registered
    result = await db.execute(
        select(models.User).where(models.User.email == invitation.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check no pending invitation for this email in this tenant
    result = await db.execute(
        select(models.Invitation).where(
            models.Invitation.email == invitation.email,
            models.Invitation.tenant_id == invitation.tenant_id,
            models.Invitation.accepted_at.is_(None),
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pending invitation already exists for this email",
        )

    # Validate role (only admin or user allowed)
    if invitation.role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'admin' or 'user'",
        )

    # Generate secure token
    token = secrets.token_urlsafe(32)

    # Create invitation with 7-day expiry
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    db_invitation = models.Invitation(
        tenant_id=invitation.tenant_id,
        email=invitation.email,
        role=invitation.role,
        token=token,
        invited_by=current_user.id,
        expires_at=expires_at,
    )
    db.add(db_invitation)
    await db.commit()
    await db.refresh(db_invitation)

    # Generate magic link
    magic_link = f"{settings.FRONTEND_URL}/invite/{token}"

    # Build response manually to include magic_link
    return AdminInvitationResponse(
        id=db_invitation.id,
        tenant_id=db_invitation.tenant_id,
        email=db_invitation.email,
        role=db_invitation.role,
        expires_at=db_invitation.expires_at,
        accepted_at=db_invitation.accepted_at,
        created_at=db_invitation.created_at,
        magic_link=magic_link,
    )


@router.get("/invitations", response_model=list[AdminInvitationResponse])
async def list_pending_invitations(
    current_user: CurrentSuperAdmin,
    db: DbSession,
    tenant_id: UUID | None = None,
) -> list[AdminInvitationResponse]:
    """
    List pending invitations (not yet accepted).

    Requires super_admin role. Can filter by tenant.
    """
    query = select(models.Invitation).where(
        models.Invitation.accepted_at.is_(None)
    )

    if tenant_id:
        query = query.where(models.Invitation.tenant_id == tenant_id)

    result = await db.execute(query)
    invitations = result.scalars().all()

    responses = []
    for inv in invitations:
        magic_link = f"{settings.FRONTEND_URL}/invite/{inv.token}"
        responses.append(AdminInvitationResponse(
            id=inv.id,
            tenant_id=inv.tenant_id,
            email=inv.email,
            role=inv.role,
            expires_at=inv.expires_at,
            accepted_at=inv.accepted_at,
            created_at=inv.created_at,
            magic_link=magic_link,
        ))

    return responses


@router.post("/invitations/{invitation_id}/regenerate", response_model=AdminInvitationResponse)
async def regenerate_invitation(
    invitation_id: UUID,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> AdminInvitationResponse:
    """
    Regenerate an invitation token with a new 7-day expiry.

    Requires super_admin role. Only works for pending invitations.
    """
    result = await db.execute(
        select(models.Invitation).where(models.Invitation.id == invitation_id)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    if invitation.accepted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot regenerate an accepted invitation",
        )

    # Generate new token and expiry
    invitation.token = secrets.token_urlsafe(32)
    invitation.expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    await db.commit()
    await db.refresh(invitation)

    magic_link = f"{settings.FRONTEND_URL}/invite/{invitation.token}"

    return AdminInvitationResponse(
        id=invitation.id,
        tenant_id=invitation.tenant_id,
        email=invitation.email,
        role=invitation.role,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        created_at=invitation.created_at,
        magic_link=magic_link,
    )


@router.delete("/invitations/{invitation_id}")
async def delete_invitation(
    invitation_id: UUID,
    current_user: CurrentSuperAdmin,
    db: DbSession,
) -> dict:
    """
    Delete a pending invitation.

    Requires super_admin role.
    """
    result = await db.execute(
        select(models.Invitation).where(models.Invitation.id == invitation_id)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    if invitation.accepted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an accepted invitation",
        )

    await db.delete(invitation)
    await db.commit()

    return {"message": "Invitation deleted"}
