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
    llm_model: str = "gpt-4o"
    language: str = "en-US"


class AgentCreate(AgentBase):
    """Agent creation schema."""

    responsiveness: float = 0.8
    interruption_sensitivity: float = 0.7
    ambient_sound: str | None = None
    temperature: float = 0.7


class AgentUpdate(BaseModel):
    """Agent update schema."""

    name: str | None = None
    system_prompt: str | None = None
    welcome_message: str | None = None
    voice_id: str | None = None
    llm_model: str | None = None
    language: str | None = None
    responsiveness: float | None = None
    interruption_sensitivity: float | None = None
    ambient_sound: str | None = None
    temperature: float | None = None
    knowledge_base_ids: list[str] | None = None
    tools_config: dict | None = None
    status: str | None = None


class AgentResponse(AgentBase):
    """Agent response schema."""

    id: UUID
    tenant_id: UUID
    retell_agent_id: str | None
    retell_llm_id: str | None
    assigned_user_id: UUID | None
    responsiveness: float
    interruption_sensitivity: float
    ambient_sound: str | None
    temperature: float
    knowledge_base_ids: list[str]
    tools_config: dict | None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
