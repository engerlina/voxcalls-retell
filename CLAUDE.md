# CLAUDE.md - VoxCalls Voice Agent Platform (11Labs Wrapper)

## Project Overview

VoxCalls is a **multi-tenant voice AI platform** built as a wrapper on top of the **ElevenLabs Conversational AI API**. It provides:

- Multi-tenant architecture with isolated data and configuration
- Inbound call handling via phone numbers
- AI-powered voice conversations
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
| **Database** | PostgreSQL |
| **Voice/Telephony** | ElevenLabs Conversational AI API |
| **Phone Numbers** | (TBD - depends on 11Labs capabilities) |

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
VoiceAgent03-Wrapper/
├── CLAUDE.md                    # This file
├── voxcalls-requirements.md     # Full platform requirements
├── agentic-coding-protocol.md   # Protocol reference
├── tasks/
│   ├── todo.md                  # Current task planning
│   └── lessons.md               # Self-improvement log
├── backend/                     # FastAPI backend (TBD)
└── frontend/                    # Next.js frontend (TBD)
```

---

## Key Design Decisions

### 11Labs API Wrapper Approach

This platform wraps the ElevenLabs Conversational AI API rather than building voice infrastructure from scratch. This means:

1. **Dependent on 11Labs capabilities** - Features limited by what 11Labs API exposes
2. **Simplified voice stack** - No need for LiveKit, Deepgram, or direct TTS integration
3. **Multi-tenancy is our value-add** - 11Labs provides voice AI; we provide multi-tenant management

### What We Build vs What 11Labs Provides

| Feature | 11Labs | VoxCalls (Our Layer) |
|---------|--------|----------------------|
| Voice AI conversations | Yes | Wrapper |
| Phone numbers | TBD | Management layer |
| Multi-tenancy | No | Yes |
| User management | No | Yes |
| Knowledge base (RAG) | Yes | Management UI |
| Call recording | TBD | Storage/playback |
| Dashboard | No | Yes |
| Billing/metering | No | Yes |

---

## Commands

```bash
# Backend
cd backend && uvicorn main:app --reload

# Frontend
cd frontend && npm run dev

# Tests
pytest backend/tests/
```

---

## External APIs

- **ElevenLabs**: Conversational AI, TTS, voice cloning
- **Twilio/Vonage**: Phone numbers (if 11Labs doesn't provide)
- **PostgreSQL**: Multi-tenant data storage
- **Redis**: Session caching (optional)

---

*Last updated: February 2026*
