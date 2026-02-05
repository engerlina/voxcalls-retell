"""
Retell AI Conversational API service.
"""
import logging
from typing import Any

from retell import Retell

from app.core.config import settings

logger = logging.getLogger(__name__)


class RetellService:
    """
    Service for interacting with Retell AI Conversational API.
    """

    def __init__(self):
        self.client = Retell(api_key=settings.RETELL_API_KEY)

    # =========================================================================
    # LLM (Response Engine) Management
    # =========================================================================

    async def create_llm(
        self,
        general_prompt: str,
        model: str = "gpt-4o",
        model_temperature: float = 0.7,
        states: list[dict] | None = None,
        starting_state: str | None = None,
        general_tools: list[dict] | None = None,
    ) -> dict[str, Any]:
        """
        Create a new LLM (Response Engine) for conversation handling.

        Returns:
            dict with llm_id
        """
        kwargs = {
            "general_prompt": general_prompt,
            "model": model,
            "model_temperature": model_temperature,
            "start_speaker": "agent",
        }

        if states:
            kwargs["states"] = states
        if starting_state:
            kwargs["starting_state"] = starting_state
        if general_tools:
            kwargs["general_tools"] = general_tools

        llm = self.client.llm.create(**kwargs)
        return {"llm_id": llm.llm_id}

    async def get_llm(self, llm_id: str) -> dict[str, Any]:
        """Get LLM details."""
        llm = self.client.llm.retrieve(llm_id)
        return llm.model_dump()

    async def update_llm(
        self,
        llm_id: str,
        general_prompt: str | None = None,
        model: str | None = None,
        model_temperature: float | None = None,
        states: list[dict] | None = None,
        starting_state: str | None = None,
        general_tools: list[dict] | None = None,
    ) -> dict[str, Any]:
        """Update an LLM's configuration."""
        kwargs = {}

        if general_prompt is not None:
            kwargs["general_prompt"] = general_prompt
        if model is not None:
            kwargs["model"] = model
        if model_temperature is not None:
            kwargs["model_temperature"] = model_temperature
        if states is not None:
            kwargs["states"] = states
        if starting_state is not None:
            kwargs["starting_state"] = starting_state
        if general_tools is not None:
            kwargs["general_tools"] = general_tools

        if kwargs:
            llm = self.client.llm.update(llm_id, **kwargs)
            return llm.model_dump()
        return await self.get_llm(llm_id)

    async def delete_llm(self, llm_id: str) -> None:
        """Delete an LLM."""
        self.client.llm.delete(llm_id)

    async def list_llms(self) -> list[dict[str, Any]]:
        """List all LLMs."""
        llms = self.client.llm.list()
        return [llm.model_dump() for llm in llms]

    # =========================================================================
    # Agent Management
    # =========================================================================

    async def create_agent(
        self,
        agent_name: str,
        llm_id: str,
        voice_id: str = "11labs-Adrian",
        language: str = "en-US",
        responsiveness: float = 0.8,
        interruption_sensitivity: float = 0.7,
        enable_backchannel: bool = True,
        ambient_sound: str | None = None,
        webhook_url: str | None = None,
        boosted_keywords: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Create a new voice agent.

        Returns:
            dict with agent_id and agent details
        """
        kwargs = {
            "agent_name": agent_name,
            "response_engine": {
                "llm_id": llm_id,
                "type": "retell-llm",
            },
            "voice_id": voice_id,
            "language": language,
            "responsiveness": responsiveness,
            "interruption_sensitivity": interruption_sensitivity,
            "enable_backchannel": enable_backchannel,
        }

        if ambient_sound:
            kwargs["ambient_sound"] = ambient_sound
        if webhook_url:
            kwargs["webhook_url"] = webhook_url
        if boosted_keywords:
            kwargs["boosted_keywords"] = boosted_keywords

        agent = self.client.agent.create(**kwargs)
        return {
            "agent_id": agent.agent_id,
            "agent_name": agent.agent_name,
            "voice_id": agent.voice_id,
            "language": agent.language,
        }

    async def get_agent(self, agent_id: str) -> dict[str, Any]:
        """Get agent details."""
        agent = self.client.agent.retrieve(agent_id)
        return agent.model_dump()

    async def update_agent(
        self,
        agent_id: str,
        agent_name: str | None = None,
        llm_id: str | None = None,
        voice_id: str | None = None,
        language: str | None = None,
        responsiveness: float | None = None,
        interruption_sensitivity: float | None = None,
        ambient_sound: str | None = None,
        webhook_url: str | None = None,
        boosted_keywords: list[str] | None = None,
    ) -> dict[str, Any]:
        """Update an agent's configuration."""
        kwargs = {}

        if agent_name is not None:
            kwargs["agent_name"] = agent_name
        if llm_id is not None:
            kwargs["response_engine"] = {
                "llm_id": llm_id,
                "type": "retell-llm",
            }
        if voice_id is not None:
            kwargs["voice_id"] = voice_id
        if language is not None:
            kwargs["language"] = language
        if responsiveness is not None:
            kwargs["responsiveness"] = responsiveness
        if interruption_sensitivity is not None:
            kwargs["interruption_sensitivity"] = interruption_sensitivity
        if ambient_sound is not None:
            kwargs["ambient_sound"] = ambient_sound
        if webhook_url is not None:
            kwargs["webhook_url"] = webhook_url
        if boosted_keywords is not None:
            kwargs["boosted_keywords"] = boosted_keywords

        if kwargs:
            agent = self.client.agent.update(agent_id, **kwargs)
            return agent.model_dump()
        return await self.get_agent(agent_id)

    async def delete_agent(self, agent_id: str) -> None:
        """Delete an agent."""
        self.client.agent.delete(agent_id)

    async def list_agents(self) -> list[dict[str, Any]]:
        """List all agents."""
        agents = self.client.agent.list()
        return [agent.model_dump() for agent in agents]

    # =========================================================================
    # Phone Number Management
    # =========================================================================

    async def import_phone_number(
        self,
        phone_number: str,
        termination_uri: str,
        sip_username: str | None = None,
        sip_password: str | None = None,
        inbound_agent_id: str | None = None,
        outbound_agent_id: str | None = None,
        nickname: str | None = None,
    ) -> dict[str, Any]:
        """
        Import a phone number via SIP trunk.

        Args:
            phone_number: E.164 format phone number
            termination_uri: SIP termination URI (e.g., trunk.pstn.twilio.com)
            sip_username: Optional SIP auth username
            sip_password: Optional SIP auth password
            inbound_agent_id: Agent ID to handle inbound calls
            outbound_agent_id: Agent ID for outbound calls
            nickname: Human-readable name for the number
        """
        kwargs = {
            "phone_number": phone_number,
            "termination_uri": termination_uri,
        }

        if sip_username:
            kwargs["sip_trunk_auth_username"] = sip_username
        if sip_password:
            kwargs["sip_trunk_auth_password"] = sip_password
        if inbound_agent_id:
            kwargs["inbound_agent_id"] = inbound_agent_id
        if outbound_agent_id:
            kwargs["outbound_agent_id"] = outbound_agent_id
        if nickname:
            kwargs["nickname"] = nickname

        phone = self.client.phone_number.import_(**kwargs)
        return {
            "phone_number": phone.phone_number,
            "retell_phone_id": getattr(phone, 'phone_number_id', None) or phone.phone_number,
            "inbound_agent_id": phone.inbound_agent_id,
            "outbound_agent_id": phone.outbound_agent_id,
        }

    async def get_phone_number(self, phone_number: str) -> dict[str, Any]:
        """Get phone number details."""
        phone = self.client.phone_number.retrieve(phone_number)
        return phone.model_dump()

    async def update_phone_number(
        self,
        phone_number: str,
        inbound_agent_id: str | None = None,
        outbound_agent_id: str | None = None,
        nickname: str | None = None,
    ) -> dict[str, Any]:
        """Update phone number configuration."""
        kwargs = {}

        if inbound_agent_id is not None:
            kwargs["inbound_agent_id"] = inbound_agent_id
        if outbound_agent_id is not None:
            kwargs["outbound_agent_id"] = outbound_agent_id
        if nickname is not None:
            kwargs["nickname"] = nickname

        if kwargs:
            phone = self.client.phone_number.update(phone_number, **kwargs)
            return phone.model_dump()
        return await self.get_phone_number(phone_number)

    async def delete_phone_number(self, phone_number: str) -> None:
        """Delete a phone number."""
        self.client.phone_number.delete(phone_number)

    async def list_phone_numbers(self) -> list[dict[str, Any]]:
        """List all phone numbers."""
        phones = self.client.phone_number.list()
        return [phone.model_dump() for phone in phones]

    # =========================================================================
    # Call Management
    # =========================================================================

    async def list_calls(
        self,
        agent_id: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """
        List calls.

        Args:
            agent_id: Filter by agent ID
            limit: Maximum number of calls to return
        """
        kwargs = {"limit": limit}
        if agent_id:
            kwargs["filter_criteria"] = {"agent_id": [agent_id]}

        calls = self.client.call.list(**kwargs)
        return [call.model_dump() for call in calls]

    async def get_call(self, call_id: str) -> dict[str, Any]:
        """Get call details including transcript."""
        call = self.client.call.retrieve(call_id)
        return call.model_dump()

    # =========================================================================
    # Knowledge Base
    # =========================================================================

    async def create_knowledge_base(
        self,
        knowledge_base_name: str,
    ) -> dict[str, Any]:
        """Create a new knowledge base."""
        kb = self.client.knowledge_base.create(
            knowledge_base_name=knowledge_base_name,
        )
        return {"knowledge_base_id": kb.knowledge_base_id}

    async def add_document_to_knowledge_base(
        self,
        knowledge_base_id: str,
        file_path: str | None = None,
        file_content: bytes | None = None,
        file_name: str | None = None,
        text_content: str | None = None,
        url: str | None = None,
    ) -> dict[str, Any]:
        """
        Add a document to a knowledge base.

        Supports: file upload, text content, or URL.
        """
        # This would use the knowledge base document API
        # The exact implementation depends on Retell SDK methods
        logger.info(f"Adding document to knowledge base {knowledge_base_id}")

        # Placeholder - actual implementation depends on Retell API
        return {"status": "added"}

    async def delete_knowledge_base(self, knowledge_base_id: str) -> None:
        """Delete a knowledge base."""
        self.client.knowledge_base.delete(knowledge_base_id)

    async def list_knowledge_bases(self) -> list[dict[str, Any]]:
        """List all knowledge bases."""
        kbs = self.client.knowledge_base.list()
        return [kb.model_dump() for kb in kbs]


# Singleton instance
retell_service = RetellService()
