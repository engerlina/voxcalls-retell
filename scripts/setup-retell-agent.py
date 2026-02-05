#!/usr/bin/env python3
"""
Lok Dentists - Retell AI Agent Setup Script

This script creates the voice agent for Lok Dentists using the Retell AI API.
It sets up:
1. English LLM with conversation states
2. Voice agent with the LLM
3. Phone number import (optional)

Usage:
    pip install retell-sdk python-dotenv
    python setup-retell-agent.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file in project root
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Verify API key
RETELL_API_KEY = os.getenv("RETELL_API_KEY")
if not RETELL_API_KEY:
    print("ERROR: RETELL_API_KEY not found in .env file")
    sys.exit(1)

# Twilio SIP configuration
TWILIO_TERMINATION_SIP_URL = os.getenv("TWILIO_TERMINATION_SIP_URL")
SIP_USERNAME = os.getenv("SIP_USERNAME")
SIP_PASSWORD = os.getenv("SIP_PASSWORD")

try:
    from retell import Retell
except ImportError:
    print("ERROR: retell-sdk not installed. Run: pip install retell-sdk")
    sys.exit(1)

# Initialize Retell client
client = Retell(api_key=RETELL_API_KEY)

# =============================================================================
# LOK DENTISTS - ENGLISH AGENT CONFIGURATION
# =============================================================================

GENERAL_PROMPT = """You are Lily, a friendly and efficient AI receptionist for Lok Dentists, a family-owned dental practice with locations in Chatswood and Sydney CBD.

KEY RULES:
- Ask ONE question at a time during booking
- Do NOT repeat booking details until the final summary
- Be warm, professional, and concise
- Do not elaborate unless asked
- Default to English but be ready to transfer to Cantonese or Mandarin agents if requested

TEAM MEMBERS:
- Dr Kenny (only available at Sussex St CBD)
- Dr Adrian (only available in Chatswood, EXCEPT during renovation)
- Dr Joyce
- Dr Calvin
- Dr Daena
- Ms Cathy (Oral Health Therapist - cleans)

IMPORTANT DATES:
- Renovation period: 16 Feb - 23 Mar 2026
- During renovation, Chatswood is CLOSED. Only Sussex St (CBD) is available.
- Dr Adrian is available in the city on Wednesday and Thursday during renovation.

LOCATIONS:
- Chatswood: [Chatswood address]
- Sussex St CBD: [CBD address]

EMERGENCY NUMBER: 0402 012 082

APPOINTMENT RULES:
- For cleans, offer Ms Cathy first
- Appointments must be within 3 months
- If date is too far out, take a message for callback
- Always collect: name, appointment type, preferred dentist, preferred date/time, phone number"""

# Tools are defined at the state level for custom functions
# For the basic LLM, we only use end_call which is a built-in type
BOOKING_TOOLS = [
    {
        "type": "end_call",
        "name": "end_call",
        "description": "End the call when the conversation is complete or the caller wants to disconnect.",
    },
]

# Note: Custom webhook tools should be added via the Retell dashboard or
# as state-specific tools. The API format for custom tools requires
# specific parameters that vary by tool type.

CONVERSATION_STATES = [
    {
        "name": "welcome",
        "state_prompt": """Greet the caller warmly:
"Hello, thank you for calling Lok Dentists. This is Lily speaking. How can I help you today?"

Listen for their intent:
- Booking an appointment
- Asking a question about services, hours, pricing, or team
- Dental emergency
- Language preference (Cantonese or Mandarin)

If they ask for Cantonese or Mandarin, let them know you'll transfer them to an agent who speaks that language (not implemented in this demo, acknowledge politely).""",
        "edges": [
            {
                "destination_state_name": "collect_name",
                "description": "Caller wants to book or schedule an appointment"
            },
            {
                "destination_state_name": "clinic_info",
                "description": "Caller has a question about services, hours, pricing, locations, or team"
            },
            {
                "destination_state_name": "emergency",
                "description": "Caller has a dental emergency or is in severe pain"
            }
        ]
    },
    {
        "name": "clinic_info",
        "state_prompt": """Answer the caller's question about Lok Dentists. Use the information from your knowledge to answer:

SERVICES: General dentistry, cosmetic dentistry, dental implants, orthodontics, emergency care, children's dentistry

HOURS:
- Monday to Friday: 9am - 6pm
- Saturday: 9am - 2pm (Chatswood only)
- Sunday: Closed

LOCATIONS:
- Chatswood (main practice)
- Sussex St CBD

TEAM: Dr Kenny (CBD only), Dr Adrian (Chatswood only), Dr Joyce, Dr Calvin, Dr Daena, Ms Cathy (cleans)

PAYMENT: HICAPS, all major health funds, payment plans available

After answering, ask if there's anything else you can help with.""",
        "edges": [
            {
                "destination_state_name": "anything_else",
                "description": "Question has been answered"
            }
        ]
    },
    {
        "name": "emergency",
        "state_prompt": """This is a dental emergency. Say:
"For dental emergencies, please call our emergency line directly at 0402 012 082. They can assist you immediately. Is there anything else I can help you with?"

Do NOT offer to transfer - just provide the number.""",
        "edges": [
            {
                "destination_state_name": "anything_else",
                "description": "Emergency number provided"
            }
        ]
    },
    {
        "name": "collect_name",
        "state_prompt": """Ask for the patient's name:
"Can I get your name please?"

Wait for their response. Do NOT ask multiple questions at once.""",
        "edges": [
            {
                "destination_state_name": "collect_type",
                "description": "Caller has provided their name"
            }
        ]
    },
    {
        "name": "collect_type",
        "state_prompt": """Ask what type of appointment they need:
"What type of appointment are you looking for? For example, a consultation, a clean, or something else?"

If they say consultation or other, ask briefly what it's regarding so we can note it for the dentist.""",
        "edges": [
            {
                "destination_state_name": "collect_dentist",
                "description": "Appointment type has been identified"
            }
        ]
    },
    {
        "name": "collect_dentist",
        "state_prompt": """Ask if they have a preferred dentist:

RULES:
- If it's a CLEAN, offer Ms Cathy: "For cleans, we have Ms Cathy available. Would you like to see her, or do you have a preference?"
- If they name someone, validate against the team
- If Dr Kenny: "Dr Kenny is only available at our city location on Sussex St."
- If Dr Adrian: "Dr Adrian is only available in Chatswood." (unless renovation period)
- If they don't have a preference: "Happy to book you with anyone available"

Team: Dr Kenny, Dr Adrian, Dr Joyce, Dr Calvin, Dr Daena, Ms Cathy""",
        "edges": [
            {
                "destination_state_name": "collect_datetime",
                "description": "Dentist preference has been noted"
            }
        ]
    },
    {
        "name": "collect_datetime",
        "state_prompt": """Ask for their preferred date and time:
"When would you like to come in? You can give me a specific date or something like 'Monday afternoons' if that works better."

RULES:
- If date is between 16 Feb - 23 Mar 2026, mention Chatswood is closed for renovation
- If they want an appointment more than 3 months out, take their details for a callback
- After getting date/time, ask for their phone number for confirmation""",
        "edges": [
            {
                "destination_state_name": "submit_booking",
                "description": "Date/time preference and phone number collected"
            }
        ]
    },
    {
        "name": "submit_booking",
        "state_prompt": """Recap the booking details ONCE:
"Let me confirm: [Name], looking for a [appointment type] with [dentist] around [date/time] at [location]. Is that correct?"

If confirmed, use the book_appointment function to submit.

After booking, say: "I've recorded your appointment preference. You'll receive a call back during business hours to confirm the exact time."

Then ask: "Would you like me to send you an SMS confirmation with the details?" """,
        "edges": [
            {
                "destination_state_name": "send_sms_state",
                "description": "Caller wants SMS confirmation"
            },
            {
                "destination_state_name": "anything_else",
                "description": "Caller does not want SMS or booking is complete"
            }
        ]
    },
    {
        "name": "send_sms_state",
        "state_prompt": """Use the send_sms function to send confirmation details.
Include: appointment type, preferred dentist, date/time, clinic contact.

Confirm: "I've sent that SMS to you now." """,
        "edges": [
            {
                "destination_state_name": "anything_else",
                "description": "SMS sent"
            }
        ]
    },
    {
        "name": "anything_else",
        "state_prompt": """Ask: "Is there anything else I can help you with today?"

If yes, help them with their next request.
If no, thank them warmly and end the call using the end_call function.""",
        "edges": [
            {
                "destination_state_name": "welcome",
                "description": "Caller needs more help"
            },
            {
                "destination_state_name": "end_call_state",
                "description": "Caller is done and does not need more help"
            }
        ]
    },
    {
        "name": "end_call_state",
        "state_prompt": """Say: "Thank you for calling Lok Dentists. Have a wonderful day!"

Then use the end_call function to end the call."""
    }
]


def create_llm():
    """Create the LLM (Response Engine) with conversation states."""
    print("\n1. Creating LLM (Response Engine)...")

    llm = client.llm.create(
        general_prompt=GENERAL_PROMPT,
        start_speaker="agent",
        model="gpt-4o",
        model_temperature=0.7,
        general_tools=BOOKING_TOOLS,
        states=CONVERSATION_STATES,
        starting_state="welcome",
    )

    print(f"   LLM created successfully!")
    print(f"   LLM ID: {llm.llm_id}")
    return llm.llm_id


def create_agent(llm_id: str):
    """Create the voice agent with the LLM."""
    print("\n2. Creating Voice Agent...")

    agent = client.agent.create(
        agent_name="Lok Dentists - Lily (English)",
        response_engine={
            "llm_id": llm_id,
            "type": "retell-llm",
        },
        voice_id="11labs-Adrian",  # Female Australian voice - update as needed
        language="en-AU",
        interruption_sensitivity=0.7,
        responsiveness=0.8,
        enable_backchannel=True,
        ambient_sound="call-center",
        end_call_after_silence_ms=30000,
        boosted_keywords=["Lok", "Dentists", "Chatswood", "CBD", "Sussex", "Kenny", "Adrian", "Joyce", "Calvin", "Daena", "Cathy"],
        webhook_url="https://your-webhook-url.com/retell-events",  # Replace with actual webhook
    )

    print(f"   Agent created successfully!")
    print(f"   Agent ID: {agent.agent_id}")
    print(f"   Agent Name: {agent.agent_name}")
    return agent.agent_id


def import_phone_number(agent_id: str, phone_number: str = None):
    """Import a phone number and bind it to the agent."""
    if not TWILIO_TERMINATION_SIP_URL:
        print("\n3. Skipping phone number import (TWILIO_TERMINATION_SIP_URL not set)")
        return None

    if not phone_number:
        print("\n3. Skipping phone number import (no phone number provided)")
        print("   To import a number, call: import_phone_number(agent_id, '+61xxxxxxxxx')")
        return None

    print(f"\n3. Importing phone number {phone_number}...")

    phone = client.phone_number.import_(
        phone_number=phone_number,
        termination_uri=TWILIO_TERMINATION_SIP_URL,
        sip_trunk_auth_username=SIP_USERNAME,
        sip_trunk_auth_password=SIP_PASSWORD,
        inbound_agent_id=agent_id,
        nickname="Lok Dentists Main Line",
    )

    print(f"   Phone number imported successfully!")
    print(f"   Phone: {phone.phone_number}")
    print(f"   Inbound Agent ID: {phone.inbound_agent_id}")
    return phone


def list_existing_agents():
    """List all existing agents."""
    print("\nExisting Agents:")
    print("-" * 50)
    agents = client.agent.list()
    for agent in agents:
        print(f"  - {agent.agent_name}: {agent.agent_id}")
    return agents


def list_existing_llms():
    """List all existing LLMs."""
    print("\nExisting LLMs:")
    print("-" * 50)
    llms = client.llm.list()
    for llm in llms:
        print(f"  - {llm.llm_id}")
    return llms


def main():
    """Main setup function."""
    print("=" * 60)
    print("LOK DENTISTS - RETELL AI AGENT SETUP")
    print("=" * 60)

    print(f"\nAPI Key: {RETELL_API_KEY[:10]}...")
    print(f"SIP URL: {TWILIO_TERMINATION_SIP_URL or 'Not configured'}")

    # List existing resources
    list_existing_agents()
    list_existing_llms()

    # Create new resources
    llm_id = create_llm()
    agent_id = create_agent(llm_id)

    # Phone number import is optional - uncomment to use
    # import_phone_number(agent_id, "+61XXXXXXXXX")  # Replace with actual number

    print("\n" + "=" * 60)
    print("SETUP COMPLETE!")
    print("=" * 60)
    print(f"\nLLM ID: {llm_id}")
    print(f"Agent ID: {agent_id}")
    print("\nNext steps:")
    print("1. Update webhook URLs in the script with your actual endpoints")
    print("2. Test the agent in the Retell dashboard")
    print("3. Import a phone number when ready for live calls")
    print("\nTo test the agent, visit: https://dashboard.retellai.com")


if __name__ == "__main__":
    main()
