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

        For countries that require regulatory addresses (e.g., Australia),
        the TWILIO_ADDRESS_SID setting must be configured.
        """
        try:
            # Build purchase params
            purchase_params = {"phone_number": phone_number}

            # Add address if configured (required for some countries like AU)
            if settings.TWILIO_ADDRESS_SID:
                purchase_params["address_sid"] = settings.TWILIO_ADDRESS_SID

            incoming_phone_number = self.client.incoming_phone_numbers.create(
                **purchase_params
            )

            return {
                "sid": incoming_phone_number.sid,
                "phone_number": incoming_phone_number.phone_number,
                "friendly_name": incoming_phone_number.friendly_name,
            }
        except TwilioRestException as e:
            raise Exception(f"Failed to purchase number: {e.msg}")

    async def get_phone_number_pricing(self, country_code: str = "AU") -> dict[str, Any]:
        """
        Get phone number pricing for a country.
        Returns monthly and per-minute pricing by number type.
        """
        try:
            pricing = self.client.pricing.v1.phone_numbers.countries(country_code).fetch()

            result = {
                "country": pricing.country,
                "iso_country": pricing.iso_country,
                "price_unit": pricing.price_unit,
                "phone_number_prices": [],
            }

            for price in pricing.phone_number_prices:
                result["phone_number_prices"].append({
                    "number_type": price.get("number_type", "unknown"),
                    "base_price": price.get("base_price"),
                    "current_price": price.get("current_price"),
                })

            return result
        except Exception:
            # Return empty pricing if not available
            return {
                "country": country_code,
                "iso_country": country_code,
                "price_unit": "USD",
                "phone_number_prices": [],
            }

    async def get_addresses(self) -> list[dict[str, Any]]:
        """
        List all addresses in the Twilio account.
        Useful for finding the address SID to configure.
        """
        addresses = self.client.addresses.list()
        return [
            {
                "sid": addr.sid,
                "friendly_name": addr.friendly_name,
                "customer_name": addr.customer_name,
                "street": addr.street,
                "city": addr.city,
                "region": addr.region,
                "postal_code": addr.postal_code,
                "iso_country": addr.iso_country,
            }
            for addr in addresses
        ]

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
