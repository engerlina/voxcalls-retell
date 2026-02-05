"""
Agent management endpoints.
"""
import logging
from uuid import UUID

import httpx
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import DbSession, CurrentUser, CurrentAdmin
from app.db import models
from app.schemas.agent import AgentCreate, AgentUpdate, AgentResponse
from app.services.elevenlabs import ElevenLabsService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=list[AgentResponse])
async def list_agents(
    current_user: CurrentUser,
    db: DbSession,
) -> list[AgentResponse]:
    """
    List agents.

    Admins see all tenant agents. Users see only their assigned agent.
    """
    query = select(models.Agent).where(
        models.Agent.tenant_id == current_user.tenant_id,
        models.Agent.status != "deleted",
    )

    if current_user.role == "user":
        query = query.where(models.Agent.assigned_user_id == current_user.id)

    result = await db.execute(query)
    agents = result.scalars().all()
    return [AgentResponse.model_validate(a) for a in agents]


@router.post("", response_model=AgentResponse)
async def create_agent(
    agent: AgentCreate,
    current_user: CurrentAdmin,
    db: DbSession,
) -> AgentResponse:
    """
    Create a new agent.

    Requires admin role.
    """
    # Check tenant limits
    result = await db.execute(
        select(models.Tenant).where(models.Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one()

    result = await db.execute(
        select(models.Agent).where(
            models.Agent.tenant_id == current_user.tenant_id,
            models.Agent.status != "deleted",
        )
    )
    agent_count = len(result.scalars().all())

    if agent_count >= tenant.max_agents:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Agent limit reached ({tenant.max_agents})",
        )

    # Create agent in database first
    db_agent = models.Agent(
        tenant_id=current_user.tenant_id,
        **agent.model_dump(),
    )
    db.add(db_agent)
    await db.flush()

    # Create agent in ElevenLabs
    try:
        elevenlabs = ElevenLabsService()
        elevenlabs_agent = await elevenlabs.create_agent(
            name=agent.name,
            system_prompt=agent.system_prompt,
            welcome_message=agent.welcome_message,
            voice_id=agent.voice_id,
            llm_model=agent.llm_model,
            language=agent.language,
        )
        # ElevenLabs returns either "agent_id" or "id" depending on API version
        db_agent.elevenlabs_agent_id = elevenlabs_agent.get("agent_id") or elevenlabs_agent.get("id")
    except httpx.HTTPStatusError as e:
        await db.rollback()
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"ElevenLabs API error: {e.response.status_code} - {error_detail}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create agent in ElevenLabs ({e.response.status_code}): {error_detail}",
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"ElevenLabs error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create agent in ElevenLabs: {str(e)}",
        )

    await db.commit()
    await db.refresh(db_agent)

    return AgentResponse.model_validate(db_agent)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> AgentResponse:
    """
    Get agent by ID.
    """
    result = await db.execute(
        select(models.Agent).where(
            models.Agent.id == agent_id,
            models.Agent.tenant_id == current_user.tenant_id,
        )
    )
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )

    # Users can only see their assigned agent
    if current_user.role == "user" and agent.assigned_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return AgentResponse.model_validate(agent)


@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    update: AgentUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> AgentResponse:
    """
    Update agent configuration.
    """
    result = await db.execute(
        select(models.Agent).where(
            models.Agent.id == agent_id,
            models.Agent.tenant_id == current_user.tenant_id,
        )
    )
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )

    # Users can only update their assigned agent
    if current_user.role == "user" and agent.assigned_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Update local fields
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)

    # Update in ElevenLabs
    if agent.elevenlabs_agent_id:
        try:
            elevenlabs = ElevenLabsService()
            await elevenlabs.update_agent(
                agent_id=agent.elevenlabs_agent_id,
                name=agent.name,
                system_prompt=agent.system_prompt,
                welcome_message=agent.welcome_message,
                voice_id=agent.voice_id,
                llm_model=agent.llm_model,
                language=agent.language,
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update agent in ElevenLabs: {str(e)}",
            )

    await db.commit()
    await db.refresh(agent)

    return AgentResponse.model_validate(agent)


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: UUID,
    current_user: CurrentAdmin,
    db: DbSession,
) -> dict:
    """
    Delete agent.

    Requires admin role.
    """
    result = await db.execute(
        select(models.Agent).where(
            models.Agent.id == agent_id,
            models.Agent.tenant_id == current_user.tenant_id,
        )
    )
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )

    # Soft delete
    agent.status = "deleted"

    # Delete from ElevenLabs
    if agent.elevenlabs_agent_id:
        try:
            elevenlabs = ElevenLabsService()
            await elevenlabs.delete_agent(agent.elevenlabs_agent_id)
        except Exception:
            pass  # Continue even if ElevenLabs delete fails

    await db.commit()

    return {"message": "Agent deleted successfully"}


@router.post("/{agent_id}/pause")
async def pause_agent(
    agent_id: UUID,
    current_user: CurrentAdmin,
    db: DbSession,
) -> dict:
    """
    Pause agent.

    Requires admin role.
    """
    result = await db.execute(
        select(models.Agent).where(
            models.Agent.id == agent_id,
            models.Agent.tenant_id == current_user.tenant_id,
        )
    )
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )

    agent.status = "paused"
    await db.commit()

    return {"message": "Agent paused"}


@router.post("/{agent_id}/resume")
async def resume_agent(
    agent_id: UUID,
    current_user: CurrentAdmin,
    db: DbSession,
) -> dict:
    """
    Resume agent.

    Requires admin role.
    """
    result = await db.execute(
        select(models.Agent).where(
            models.Agent.id == agent_id,
            models.Agent.tenant_id == current_user.tenant_id,
        )
    )
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )

    agent.status = "active"
    await db.commit()

    return {"message": "Agent resumed"}
