"""
Phone number management endpoints.
"""
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import DbSession, CurrentUser, CurrentAdmin
from app.db import models
from app.schemas.phone_number import PhoneNumberResponse, PhoneNumberClaim, PhoneNumberAssignAgent
from app.services.elevenlabs import ElevenLabsService

logger = logging.getLogger(__name__)
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


@router.get("/{phone_number_id}", response_model=PhoneNumberResponse)
async def get_phone_number(
    phone_number_id: UUID,
    current_user: CurrentAdmin,
    db: DbSession,
) -> PhoneNumberResponse:
    """
    Get a single phone number by ID.

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

    return PhoneNumberResponse.model_validate(number)


@router.patch("/{phone_number_id}/agent", response_model=PhoneNumberResponse)
async def assign_agent_to_number(
    phone_number_id: UUID,
    request: PhoneNumberAssignAgent,
    current_user: CurrentAdmin,
    db: DbSession,
) -> PhoneNumberResponse:
    """
    Assign or unassign an agent to a phone number.

    This endpoint:
    1. Updates the database assignment
    2. Imports the phone number to ElevenLabs (if not already imported)
    3. Assigns the phone number to the agent in ElevenLabs

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

    elevenlabs = ElevenLabsService()

    if request.agent_id:
        # Verify agent exists in tenant and has an ElevenLabs agent ID
        result = await db.execute(
            select(models.Agent).where(
                models.Agent.id == request.agent_id,
                models.Agent.tenant_id == current_user.tenant_id,
                models.Agent.status != "deleted",
            )
        )
        agent = result.scalar_one_or_none()

        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found",
            )

        if not agent.elevenlabs_agent_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent does not have an ElevenLabs agent ID. Please sync the agent first.",
            )

        # Step 1: Import phone number to ElevenLabs if not already imported
        if not number.elevenlabs_phone_id:
            try:
                logger.info(f"Importing phone number {number.phone_number} to ElevenLabs")
                import_result = await elevenlabs.import_phone_number(
                    phone_number=number.phone_number,
                    twilio_sid=number.twilio_sid,
                )
                number.elevenlabs_phone_id = import_result.get("phone_number_id")
                logger.info(f"Phone number imported, ElevenLabs ID: {number.elevenlabs_phone_id}")
            except Exception as e:
                logger.error(f"Failed to import phone number to ElevenLabs: {e}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to import phone number to ElevenLabs: {str(e)}",
                )

        # Step 2: Assign phone number to agent in ElevenLabs
        try:
            logger.info(f"Assigning phone {number.elevenlabs_phone_id} to agent {agent.elevenlabs_agent_id}")
            await elevenlabs.assign_phone_to_agent(
                phone_id=number.elevenlabs_phone_id,
                agent_id=agent.elevenlabs_agent_id,
            )
            logger.info("Phone number assigned to agent in ElevenLabs successfully")
        except Exception as e:
            logger.error(f"Failed to assign phone to agent in ElevenLabs: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to assign phone number to agent in ElevenLabs: {str(e)}",
            )

        number.assigned_agent_id = request.agent_id
    else:
        # Unassign agent - also unassign in ElevenLabs
        if number.elevenlabs_phone_id:
            try:
                logger.info(f"Unassigning phone {number.elevenlabs_phone_id} from agent in ElevenLabs")
                await elevenlabs.assign_phone_to_agent(
                    phone_id=number.elevenlabs_phone_id,
                    agent_id=None,  # None to unassign
                )
            except Exception as e:
                logger.warning(f"Failed to unassign phone from agent in ElevenLabs: {e}")
                # Don't fail the request, just log the warning

        number.assigned_agent_id = None

    await db.commit()
    await db.refresh(number)

    return PhoneNumberResponse.model_validate(number)


@router.post("/claim", response_model=PhoneNumberResponse)
async def claim_number(
    claim: PhoneNumberClaim,
    current_user: CurrentAdmin,
    db: DbSession,
) -> PhoneNumberResponse:
    """
    Claim a phone number for the tenant.

    This endpoint:
    1. Assigns the phone number to the tenant
    2. Imports the phone number to ElevenLabs
    3. Optionally assigns an agent to the phone number

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

    # Import phone number to ElevenLabs if not already imported
    elevenlabs = ElevenLabsService()
    if not number.elevenlabs_phone_id:
        try:
            logger.info(f"Importing phone number {number.phone_number} to ElevenLabs on claim")
            import_result = await elevenlabs.import_phone_number(
                phone_number=number.phone_number,
                twilio_sid=number.twilio_sid,
            )
            number.elevenlabs_phone_id = import_result.get("phone_number_id")
            logger.info(f"Phone number imported, ElevenLabs ID: {number.elevenlabs_phone_id}")
        except Exception as e:
            logger.error(f"Failed to import phone number to ElevenLabs: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to import phone number to ElevenLabs: {str(e)}",
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
        if agent and agent.elevenlabs_agent_id:
            number.assigned_agent_id = agent.id
            # Also assign in ElevenLabs
            try:
                logger.info(f"Assigning phone to agent {agent.elevenlabs_agent_id} in ElevenLabs")
                await elevenlabs.assign_phone_to_agent(
                    phone_id=number.elevenlabs_phone_id,
                    agent_id=agent.elevenlabs_agent_id,
                )
            except Exception as e:
                logger.error(f"Failed to assign phone to agent in ElevenLabs: {e}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to assign phone to agent in ElevenLabs: {str(e)}",
                )

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

    This also unassigns the phone number from any agent in ElevenLabs.

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

    # Unassign from agent in ElevenLabs if assigned
    if number.elevenlabs_phone_id and number.assigned_agent_id:
        elevenlabs = ElevenLabsService()
        try:
            logger.info(f"Unassigning phone {number.elevenlabs_phone_id} from agent in ElevenLabs")
            await elevenlabs.assign_phone_to_agent(
                phone_id=number.elevenlabs_phone_id,
                agent_id=None,  # None to unassign
            )
        except Exception as e:
            logger.warning(f"Failed to unassign phone from agent in ElevenLabs: {e}")
            # Don't fail the request, just log the warning

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
