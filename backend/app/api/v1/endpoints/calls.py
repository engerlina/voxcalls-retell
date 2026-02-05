"""
Call management endpoints.

Fetches conversation history from ElevenLabs API.
"""
import logging
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import DbSession, CurrentUser
from app.db import models
from app.schemas.call import CallResponse, CallDetailResponse, ElevenLabsConversationResponse
from app.services.elevenlabs import ElevenLabsService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=list[ElevenLabsConversationResponse])
async def list_calls(
    current_user: CurrentUser,
    db: DbSession,
    agent_id: UUID | None = Query(None, description="Filter by agent ID"),
    limit: int = Query(50, le=100),
) -> list[ElevenLabsConversationResponse]:
    """
    List calls/conversations from ElevenLabs.

    Fetches conversations for all agents belonging to the tenant.
    """
    # Get all agents for this tenant
    if agent_id:
        query = select(models.Agent).where(
            models.Agent.id == agent_id,
            models.Agent.tenant_id == current_user.tenant_id,
        )
    else:
        query = select(models.Agent).where(
            models.Agent.tenant_id == current_user.tenant_id
        )

    result = await db.execute(query)
    agents = result.scalars().all()

    # Build a map of elevenlabs_agent_id -> agent for quick lookup
    agent_map = {
        a.elevenlabs_agent_id: a
        for a in agents
        if a.elevenlabs_agent_id
    }

    if not agent_map:
        return []

    # Fetch conversations from ElevenLabs for each agent
    elevenlabs = ElevenLabsService()
    all_conversations: list[ElevenLabsConversationResponse] = []

    for elevenlabs_agent_id, agent in agent_map.items():
        try:
            response = await elevenlabs.list_conversations(
                agent_id=elevenlabs_agent_id,
                page_size=limit,
            )

            conversations = response.get("conversations", [])

            for conv in conversations:
                # Map ElevenLabs conversation to our response format
                all_conversations.append(
                    ElevenLabsConversationResponse(
                        conversation_id=conv.get("conversation_id", ""),
                        agent_id=str(agent.id),
                        agent_name=agent.name,
                        status=conv.get("status", "unknown"),
                        start_time=conv.get("start_time_unix_secs"),
                        end_time=conv.get("end_time_unix_secs"),
                        duration_seconds=_calculate_duration(
                            conv.get("start_time_unix_secs"),
                            conv.get("end_time_unix_secs"),
                        ),
                        message_count=conv.get("message_count"),
                        call_successful=conv.get("analysis", {}).get("call_successful") if conv.get("analysis") else None,
                    )
                )

        except Exception as e:
            logger.warning(f"Failed to fetch conversations for agent {agent.name}: {e}")
            continue

    # Sort by start_time descending (most recent first)
    all_conversations.sort(
        key=lambda c: c.start_time or 0,
        reverse=True,
    )

    return all_conversations[:limit]


def _calculate_duration(start_unix: int | None, end_unix: int | None) -> int | None:
    """Calculate duration in seconds from unix timestamps."""
    if start_unix and end_unix:
        return end_unix - start_unix
    return None


@router.get("/conversation/{conversation_id}")
async def get_conversation_details(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """
    Get detailed conversation information from ElevenLabs.

    Returns full conversation data including transcript, metadata, and analysis.
    """
    # Verify user has access by checking if the conversation belongs to one of their agents
    result = await db.execute(
        select(models.Agent).where(
            models.Agent.tenant_id == current_user.tenant_id,
            models.Agent.elevenlabs_agent_id.isnot(None),
        )
    )
    agents = result.scalars().all()
    agent_map = {a.elevenlabs_agent_id: a for a in agents}

    if not agent_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No agents found",
        )

    # Fetch conversation details from ElevenLabs
    elevenlabs = ElevenLabsService()
    try:
        conversation = await elevenlabs.get_conversation(conversation_id)
    except Exception as e:
        logger.error(f"Failed to fetch conversation {conversation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Verify the conversation belongs to one of the tenant's agents
    conv_agent_id = conversation.get("agent_id")
    if conv_agent_id not in agent_map:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Add our agent info to the response
    agent = agent_map[conv_agent_id]
    conversation["voxcalls_agent_id"] = str(agent.id)
    conversation["voxcalls_agent_name"] = agent.name

    # Get audio URL if available
    try:
        audio_url = await elevenlabs.get_conversation_audio(conversation_id)
        conversation["audio_url"] = audio_url
    except Exception:
        conversation["audio_url"] = None

    return conversation


@router.get("/{call_id}", response_model=CallDetailResponse)
async def get_call(
    call_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> CallDetailResponse:
    """
    Get call details with transcripts.
    """
    result = await db.execute(
        select(models.Call)
        .where(
            models.Call.id == call_id,
            models.Call.tenant_id == current_user.tenant_id,
        )
        .options(selectinload(models.Call.transcripts))
        .options(selectinload(models.Call.agent))
    )
    call = result.scalar_one_or_none()

    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found",
        )

    # Users can only see their calls
    if current_user.role == "user" and call.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    response = CallDetailResponse.model_validate(call)
    if call.agent:
        response.agent_name = call.agent.name

    return response


@router.get("/{call_id}/audio")
async def get_call_audio(
    call_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Get call audio recording.

    Returns audio stream or redirect to signed URL.
    """
    result = await db.execute(
        select(models.Call).where(
            models.Call.id == call_id,
            models.Call.tenant_id == current_user.tenant_id,
        )
    )
    call = result.scalar_one_or_none()

    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found",
        )

    # Users can only access their calls
    if current_user.role == "user" and call.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if not call.elevenlabs_conversation_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No recording available",
        )

    # Get audio from ElevenLabs
    try:
        elevenlabs = ElevenLabsService()
        audio_url = await elevenlabs.get_conversation_audio(
            call.elevenlabs_conversation_id
        )

        # Redirect to signed URL
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=audio_url)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audio: {str(e)}",
        )


@router.get("/{call_id}/transcript")
async def get_call_transcript(
    call_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[dict]:
    """
    Get call transcript only.
    """
    result = await db.execute(
        select(models.Call)
        .where(
            models.Call.id == call_id,
            models.Call.tenant_id == current_user.tenant_id,
        )
        .options(selectinload(models.Call.transcripts))
    )
    call = result.scalar_one_or_none()

    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found",
        )

    # Users can only see their calls
    if current_user.role == "user" and call.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return [
        {
            "sequence": t.sequence,
            "role": t.role,
            "content": t.content,
            "start_time_ms": t.start_time_ms,
            "end_time_ms": t.end_time_ms,
        }
        for t in call.transcripts
    ]
