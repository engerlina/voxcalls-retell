"""
Agent schemas.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AgentBase(BaseModel):
    """Base agent fields."""

    name: str
    system_prompt: str | None = None
    welcome_message: str | None = None
    voice_id: str | None = None
    llm_model: str = "gpt-4o-mini"
    language: str = "en"


class AgentCreate(AgentBase):
    """Agent creation schema."""

    max_conversation_turns: int = 100
    min_silence_duration: float = 0.4
    temperature: float = 0.7


class AgentUpdate(BaseModel):
    """Agent update schema."""

    name: str | None = None
    system_prompt: str | None = None
    welcome_message: str | None = None
    voice_id: str | None = None
    llm_model: str | None = None
    language: str | None = None
    max_conversation_turns: int | None = None
    min_silence_duration: float | None = None
    temperature: float | None = None
    knowledge_base_ids: list[str] | None = None
    tools_config: dict | None = None
    status: str | None = None


class AgentResponse(AgentBase):
    """Agent response schema."""

    id: UUID
    tenant_id: UUID
    elevenlabs_agent_id: str | None
    assigned_user_id: UUID | None
    max_conversation_turns: int
    min_silence_duration: float
    temperature: float
    knowledge_base_ids: list[str]
    tools_config: dict | None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
