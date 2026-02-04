"""
Twilio service for phone number management.
"""
from typing import Any

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.core.config import settings


class TwilioService:
    """
    Service for interacting with Twilio API.
    """

    def __init__(self):
        self.client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN,
        )

    async def search_available_numbers(
        self,
        country_code: str = "US",
        area_code: str | None = None,
        contains: str | None = None,
        number_type: str = "local",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """
        Search for available phone numbers.
        """
        search_params = {"limit": limit}

        if area_code:
            search_params["area_code"] = area_code
        if contains:
            search_params["contains"] = contains

        # Select the appropriate number type
        if number_type == "local":
            numbers = self.client.available_phone_numbers(country_code).local.list(
                **search_params
            )
        elif number_type == "mobile":
            numbers = self.client.available_phone_numbers(country_code).mobile.list(
                **search_params
            )
        elif number_type == "toll_free":
            numbers = self.client.available_phone_numbers(country_code).toll_free.list(
                **search_params
            )
        else:
            numbers = self.client.available_phone_numbers(country_code).local.list(
                **search_params
            )

        return [
            {
                "phone_number": n.phone_number,
                "friendly_name": n.friendly_name,
                "country_code": country_code,
                "capabilities": {
                    "voice": n.capabilities.get("voice", False),
                    "sms": n.capabilities.get("sms", False),
                    "mms": n.capabilities.get("mms", False),
                },
            }
            for n in numbers
        ]

    async def purchase_number(self, phone_number: str) -> dict[str, Any]:
        """
        Purchase a phone number from Twilio.
        """
        try:
            incoming_phone_number = self.client.incoming_phone_numbers.create(
                phone_number=phone_number
            )

            return {
                "sid": incoming_phone_number.sid,
                "phone_number": incoming_phone_number.phone_number,
                "friendly_name": incoming_phone_number.friendly_name,
                "country_code": incoming_phone_number.phone_number[:2],
            }
        except TwilioRestException as e:
            raise Exception(f"Failed to purchase number: {e.msg}")

    async def get_number(self, sid: str) -> dict[str, Any]:
        """
        Get phone number details.
        """
        number = self.client.incoming_phone_numbers(sid).fetch()

        return {
            "sid": number.sid,
            "phone_number": number.phone_number,
            "friendly_name": number.friendly_name,
            "voice_url": number.voice_url,
            "sms_url": number.sms_url,
        }

    async def update_number_webhooks(
        self,
        sid: str,
        voice_url: str | None = None,
        sms_url: str | None = None,
    ) -> dict[str, Any]:
        """
        Update phone number webhook URLs.
        """
        update_params = {}

        if voice_url:
            update_params["voice_url"] = voice_url
        if sms_url:
            update_params["sms_url"] = sms_url

        number = self.client.incoming_phone_numbers(sid).update(**update_params)

        return {
            "sid": number.sid,
            "phone_number": number.phone_number,
            "voice_url": number.voice_url,
            "sms_url": number.sms_url,
        }

    async def release_number(self, sid: str) -> None:
        """
        Release (delete) a phone number.
        """
        self.client.incoming_phone_numbers(sid).delete()

    async def list_numbers(self) -> list[dict[str, Any]]:
        """
        List all phone numbers in the Twilio account.
        """
        numbers = self.client.incoming_phone_numbers.list()

        return [
            {
                "sid": n.sid,
                "phone_number": n.phone_number,
                "friendly_name": n.friendly_name,
                "capabilities": n.capabilities,
            }
            for n in numbers
        ]
