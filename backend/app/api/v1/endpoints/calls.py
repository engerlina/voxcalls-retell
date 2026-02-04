"""
Call management endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import DbSession, CurrentUser
from app.db import models
from app.schemas.call import CallResponse, CallDetailResponse
from app.services.elevenlabs import ElevenLabsService

router = APIRouter()


@router.get("", response_model=list[CallResponse])
async def list_calls(
    current_user: CurrentUser,
    db: DbSession,
    limit: int = 50,
    offset: int = 0,
) -> list[CallResponse]:
    """
    List calls.

    Admins see all tenant calls. Users see only their calls.
    """
    query = select(models.Call).where(
        models.Call.tenant_id == current_user.tenant_id
    ).order_by(models.Call.created_at.desc()).limit(limit).offset(offset)

    if current_user.role == "user":
        query = query.where(models.Call.user_id == current_user.id)

    result = await db.execute(query)
    calls = result.scalars().all()
    return [CallResponse.model_validate(c) for c in calls]


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
