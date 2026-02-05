# CLAUDE.md - VoxCalls Voice Agent Platform (Retell AI)

## Project Overview

VoxCalls is a **multi-tenant voice AI platform** built as a wrapper on top of the **Retell AI Conversational API**. It provides:

- Multi-tenant architecture with isolated data and configuration
- Inbound call handling via Twilio SIP trunking
- AI-powered voice conversations with conversation flows
- Custom knowledge bases (RAG)
- Call recording and transcription
- Web dashboard for configuration

## Who You Are

You are a senior software engineer working on this codebase. You write production-quality code, verify your own work, and learn from mistakes.

You don't ask for hand-holding. You figure things out.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend API** | Python 3.x, FastAPI |
| **Frontend** | Next.js, TypeScript, Tailwind CSS |
| **Database** | PostgreSQL (Railway) |
| **Voice/Telephony** | Retell AI Conversational API |
| **Phone Numbers** | Twilio SIP Trunking |

---

## Workflow Orchestration

### Rule #1: Plan Mode Default

Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).

- Before writing code, write a plan in `tasks/todo.md`
- If something goes sideways, STOP and re-plan immediately
- Write detailed specs upfront to reduce ambiguity

### Rule #2: Subagent Strategy

Use subagents liberally to keep the main context window clean.

- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

### Rule #3: Self-Improvement Loop

After ANY correction from the user, update `tasks/lessons.md` with the pattern.

### Rule #4: Verification Before Done

Never mark a task complete without PROVING it works.

- Run the code and confirm it executes
- Run relevant tests
- Check for regressions

### Rule #5: Demand Elegance (Balanced)

For non-trivial changes, pause and ask "is there a more elegant way?"

### Rule #6: Autonomous Bug Fixing

When given a bug report, just fix it. Don't ask for hand-holding.

---

## Core Principles

### Simplicity First
Make every change as simple as possible. Impact minimal code.

### No Laziness
Find root causes. No temporary fixes. Senior developer standards.

### Minimal Impact
Changes should only touch what's necessary.

---

## File Structure

```
VoiceAgent04-Retell/
├── CLAUDE.md                    # This file
├── voxcalls-requirements.md     # Full platform requirements
├── agentic-coding-protocol.md   # Protocol reference
├── tasks/
│   ├── todo.md                  # Current task planning
│   └── lessons.md               # Self-improvement log
├── scripts/
│   ├── lok-dentists-retell-flow.jsx  # Flow visualization (React)
│   └── setup-retell-agent.py    # Agent setup script
├── backend/                     # FastAPI backend
└── frontend/                    # Next.js frontend
```

---

## Key Design Decisions

### Retell AI API Wrapper Approach

This platform wraps the Retell AI Conversational API rather than building voice infrastructure from scratch. This means:

1. **Dependent on Retell capabilities** - Features limited by what Retell API exposes
2. **Simplified voice stack** - Retell handles STT, LLM, TTS, and telephony
3. **Conversation Flows** - Retell's node-based conversation flow builder for complex interactions
4. **Multi-tenancy is our value-add** - Retell provides voice AI; we provide multi-tenant management

### What We Build vs What Retell Provides

| Feature | Retell | VoxCalls (Our Layer) |
|---------|--------|----------------------|
| Voice AI conversations | Yes | Wrapper |
| Conversation Flows | Yes | Management UI |
| Agent Transfer | Yes | Multi-tenant routing |
| Phone numbers (SIP) | Yes | Twilio SIP Trunking |
| Multi-tenancy | No | Yes |
| User management | No | Yes |
| Knowledge base (RAG) | Yes | Management UI |
| Call recording | Yes | Storage/playback |
| Dashboard | No | Yes |
| Billing/metering | No | Yes |

### Twilio SIP Trunking Configuration

We use a single Twilio SIP trunk for all inbound calls:

- **Termination SIP URL**: Configure in `.env` as `TWILIO_TERMINATION_SIP_URL`
- **SIP Credentials**: `SIP_USERNAME` and `SIP_PASSWORD`
- Retell connects to Twilio via SIP trunk for call handling

---

## Environment Variables

```bash
# Retell AI
RETELL_API_KEY=key_xxxxx

# Twilio SIP Trunking
TWILIO_TERMINATION_SIP_URL=your-trunk.pstn.twilio.com
SIP_USERNAME=your-sip-username
SIP_PASSWORD=your-sip-password

# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/voxcalls

# JWT Auth
JWT_SECRET_KEY=your-256-bit-secret
```

---

## Commands

```bash
# Backend
cd backend && uvicorn main:app --reload

# Frontend
cd frontend && npm run dev

# Tests
pytest backend/tests/

# Run Retell setup script
python scripts/setup-retell-agent.py
```

---

## External APIs

- **Retell AI**: Conversational AI, Agent Transfer, Voice Synthesis
- **Twilio**: SIP Trunking for phone connectivity
- **PostgreSQL**: Multi-tenant data storage (Railway)
- **Redis**: Session caching (optional)

---

## Retell API Key Concepts

### Conversation Flows
- Node-based conversation design
- Types: conversation, agent_transfer, call_transfer, function, ending
- Edges define transitions between nodes with LLM-evaluated conditions

### Agent Transfer
- Transfer caller to another Retell agent mid-call
- Preserves full conversation history
- Used for language routing (English, Cantonese, Mandarin)

### Custom Tools (Functions)
- Webhook-based function calls during conversation
- Used for booking appointments, sending SMS, etc.

### Voices
- Multiple voice providers (Retell, ElevenLabs, OpenAI, etc.)
- Language-specific voice selection

---

*Last updated: February 2026*
