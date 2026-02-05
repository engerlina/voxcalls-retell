# VoxCalls Voice Agent Platform - Requirements Specification

> Multi-tenant voice AI platform built as a wrapper on Retell AI Conversational API

**Version**: 3.0
**Last Updated**: February 6, 2026
**Architecture**: Retell AI Wrapper

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Architecture](#architecture)
3. [Infrastructure Stack](#infrastructure-stack)
4. [Multi-Tenant System](#multi-tenant-system)
5. [Role-Based Access Control](#role-based-access-control)
6. [Authentication System](#authentication-system)
7. [Voice AI Capabilities](#voice-ai-capabilities)
8. [Agent Management](#agent-management)
9. [Knowledge Base (RAG)](#knowledge-base-rag)
10. [Phone Number Management](#phone-number-management)
11. [Call Management & Recording](#call-management--recording)
12. [Agent Tools & Webhooks](#agent-tools--webhooks)
13. [Billing & Usage Tracking](#billing--usage-tracking)
14. [Frontend Dashboard](#frontend-dashboard)
15. [API Reference](#api-reference)
16. [Environment Variables](#environment-variables)
17. [Database Schema](#database-schema)

---

## Platform Overview

VoxCalls is a **production-grade, multi-tenant voice AI platform** that wraps the Retell AI Conversational API. It enables businesses to deploy AI-powered voice agents with:

- Inbound and outbound phone call handling via Twilio SIP trunking
- Natural, multilingual conversations with conversation flows
- Custom knowledge bases (RAG)
- Agent transfer capabilities for multi-language support
- Call recording and transcription
- 24/7 operation without human intervention

### Value Proposition

| What Retell Provides | What VoxCalls Adds |
|---------------------|-------------------|
| Voice AI engine (STT → LLM → TTS) | Multi-tenant isolation |
| Agent conversation handling | User management & authentication |
| Conversation flows (node-based) | Phone number pool management |
| Agent transfer capabilities | Billing & usage tracking |
| Webhook/tool execution | Admin dashboards |
| Call recording & transcripts | Team collaboration |
| Phone ↔ agent routing via SIP | Centralized SIP trunk management |

### Key Differentiators

- **True multi-tenancy** - Complete data isolation between organizations
- **Three-tier role system** - Super Admin → Tenant Admin → User
- **Conversation Flows** - Visual node-based conversation design
- **Agent Transfer** - Multi-language routing with preserved context
- **SIP Trunk Integration** - Single Twilio SIP trunk for all tenants
- **Usage-based billing** - Track and bill per conversation minute
- **Self-service onboarding** - Tenants can configure agents without platform support

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VoxCalls Platform                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐         ┌──────────────────────┐                  │
│  │      VERCEL          │         │      RAILWAY         │                  │
│  │  ┌────────────────┐  │         │  ┌────────────────┐  │                  │
│  │  │   Next.js      │  │  HTTP   │  │   FastAPI      │  │                  │
│  │  │   Frontend     │◄─┼─────────┼─►│   Backend      │  │                  │
│  │  │   Dashboard    │  │   API   │  │   API          │  │                  │
│  │  └────────────────┘  │         │  └───────┬────────┘  │                  │
│  └──────────────────────┘         │          │           │                  │
│                                   │  ┌───────▼────────┐  │                  │
│                                   │  │   PostgreSQL   │  │                  │
│                                   │  │   Database     │  │                  │
│                                   │  │   (Railway)    │  │                  │
│                                   │  └────────────────┘  │                  │
│                                   └──────────────────────┘                  │
│                                              │                               │
│                    ┌─────────────────────────┼─────────────────────────┐    │
│                    │                         │                         │    │
│                    ▼                         ▼                         ▼    │
│           ┌────────────────┐       ┌────────────────┐       ┌────────────┐ │
│           │   Retell AI    │       │     Twilio     │       │   Redis    │ │
│           │   Conv API     │       │  SIP Trunking  │       │  (Cache)   │ │
│           │                │       │                │       │ (Optional) │ │
│           │ • Agents       │       │ • SIP Trunk    │       │            │ │
│           │ • LLMs         │       │ • Phone #s     │       │            │ │
│           │ • Conv Flows   │       │                │       │            │ │
│           │ • Recording    │       │                │       │            │ │
│           └────────────────┘       └────────────────┘       └────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. INBOUND CALL FLOW
   Phone Call → Twilio SIP → Retell Agent → Conversation → Recording
                                  ↑
                         Agent config from
                         VoxCalls DB (tenant-specific)

2. AGENT CONFIGURATION FLOW
   User Dashboard → VoxCalls API → PostgreSQL (store mapping)
                         ↓
                   Retell API (create/update agent + LLM)
                         ↓
                   Store agent_id + llm_id ↔ tenant mapping

3. CONVERSATION FLOW
   User designs flow → VoxCalls API → Retell Conversation Flow API
                           ↓
                     Store flow_id ↔ tenant mapping
                           ↓
                     Attach to agent config
```

---

## Infrastructure Stack

### Production Environment

| Component | Service | Purpose |
|-----------|---------|---------|
| **Frontend** | Vercel | Next.js dashboard hosting |
| **Backend API** | Railway | FastAPI application server |
| **Database** | Railway PostgreSQL | Multi-tenant data storage |
| **Voice AI** | Retell AI API | Conversational AI engine |
| **Telephony** | Twilio SIP Trunking | Phone connectivity |
| **Cache** | Railway Redis (optional) | Session caching, rate limiting |

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14+, TypeScript, Tailwind CSS |
| **UI Components** | shadcn/ui (Radix UI primitives) |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Alembic |
| **Database** | PostgreSQL 15+ |
| **Auth** | JWT tokens, bcrypt password hashing |
| **API Clients** | Retell Python SDK, Twilio Python SDK |

### Frontend Stack Details

```
Next.js 14+ (App Router)
├── TypeScript (strict mode)
├── Tailwind CSS (utility-first styling)
├── shadcn/ui
│   ├── Radix UI primitives (accessibility)
│   ├── Pre-built components (Button, Card, Dialog, etc.)
│   └── Fully customizable (copy into project)
├── Icons: Lucide React (recommended for shadcn/ui)
└── Color Palette: Purple & White (defined below)
```

### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary Accent** | Purple | `#724a9e` | Buttons, links, active states, brand elements |
| **Primary Background** | White | `#ffffff` | Main backgrounds, cards |
| **Secondary Background** | Light Gray | `#f8f9fa` | Page backgrounds, alternating rows |
| **Text Primary** | Charcoal | `#1a1a2e` | Headings, body text |
| **Text Secondary** | Slate | `#64748b` | Muted text, placeholders, labels |
| **Border** | Light Border | `#e2e8f0` | Card borders, dividers, inputs |
| **Success** | Emerald | `#10b981` | Success states, confirmations |
| **Error** | Rose | `#f43f5e` | Errors, destructive actions |
| **Warning** | Amber | `#f59e0b` | Warnings, pending states |

---

## Multi-Tenant System

### Tenant Hierarchy

```
Platform (VoxCalls)
│
├── Tenant A (Organization)
│   ├── Admin Users (can manage tenant)
│   └── Regular Users (can use agents)
│
├── Tenant B (Organization)
│   ├── Admin Users
│   └── Regular Users
│
└── Tenant C (Organization)
    ├── Admin Users
    └── Regular Users
```

### Tenant Model

```python
class Tenant:
    id: UUID                    # Primary key
    name: str                   # Organization name
    slug: str                   # URL-friendly identifier (unique)
    status: TenantStatus        # active, suspended, trial, cancelled

    # Subscription
    plan: PlanType              # free, starter, pro, enterprise
    trial_ends_at: datetime     # Trial expiration
    subscription_id: str        # External billing reference

    # Limits
    max_users: int              # User limit for plan
    max_agents: int             # Agent limit for plan
    max_phone_numbers: int      # Phone number limit
    monthly_minutes_limit: int  # Conversation minutes limit

    # Metadata
    created_at: datetime
    updated_at: datetime
    settings: JSON              # Tenant-wide settings
```

### Tenant Isolation

**Database Level**:
- All tables include `tenant_id` foreign key
- Row-level security enforced at application layer
- Tenant ID extracted from JWT and validated on every request

**API Level**:
- Every endpoint scoped to authenticated user's tenant
- Cross-tenant access prevented by middleware
- Super Admin can access any tenant with explicit tenant_id parameter

**External Resources**:
- Retell agents tagged with tenant metadata
- Retell LLMs mapped to tenant in our DB
- Phone numbers assigned to single tenant at a time

---

## Role-Based Access Control

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPER ADMIN                                    │
│                     (Platform-Level Access)                              │
│                                                                          │
│  • Manage ALL tenants (create, suspend, delete)                         │
│  • View platform-wide analytics                                          │
│  • Manage phone number pool (buy, allocate)                             │
│  • Configure platform settings                                           │
│  • Access any tenant's data (with audit log)                            │
│  • Manage Super Admin accounts                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              ADMIN                                       │
│                      (Tenant-Level Access)                               │
│                                                                          │
│  • Manage users within their tenant (invite, remove, change roles)      │
│  • Configure ALL agents for their tenant                                 │
│  • Manage ALL knowledge base documents                                   │
│  • View ALL calls and recordings for tenant                             │
│  • Claim/release phone numbers from pool                                │
│  • Configure tenant settings (billing contact, etc.)                    │
│  • View tenant usage and billing                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                               USER                                       │
│                      (Personal Access Only)                              │
│                                                                          │
│  • Configure their OWN agent (if assigned)                              │
│  • Manage their OWN knowledge base documents                            │
│  • View their OWN calls and recordings                                  │
│  • Use their assigned phone number                                       │
│  • Update their profile and preferences                                  │
│  • Cannot see other users' data                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### User Model

```python
class User:
    id: UUID                    # Primary key
    tenant_id: UUID             # FK to tenant (NULL for super admins)

    # Identity
    email: str                  # Unique, used for login
    password_hash: str          # bcrypt hashed
    name: str                   # Display name

    # Role
    role: UserRole              # super_admin, admin, user

    # Status
    status: UserStatus          # active, invited, suspended
    email_verified: bool

    # Assignment
    assigned_agent_id: str      # Retell agent ID (for users)
    assigned_phone_number_id: UUID  # FK to phone_numbers

    # Metadata
    created_at: datetime
    last_login_at: datetime
    settings: JSON              # User preferences
```

---

## Authentication System

### Authentication Flow

```
1. REGISTRATION (Tenant Creation)
   POST /api/v1/auth/register
   - Creates new tenant
   - Creates first user as Admin
   - Returns JWT tokens

2. LOGIN
   POST /api/v1/auth/login
   - Validates credentials
   - Returns access_token (15min) + refresh_token (7d)

3. TOKEN REFRESH
   POST /api/v1/auth/refresh
   - Validates refresh_token
   - Returns new access_token

4. INVITATION FLOW
   Admin invites user → Email sent → User clicks link → Sets password → Active
```

### JWT Token Structure

```json
{
  "sub": "user_uuid",
  "tenant_id": "tenant_uuid",
  "role": "admin",
  "email": "user@example.com",
  "iat": 1707100000,
  "exp": 1707100900
}
```

---

## Voice AI Capabilities

### Retell AI Integration Points

| Feature | Retell API | VoxCalls Wrapper |
|---------|-----------|------------------|
| Create LLM | `client.llm.create()` | Add tenant mapping |
| Create Agent | `client.agent.create()` | Add tenant mapping |
| Update Agent | `client.agent.update()` | Validate ownership |
| Delete Agent | `client.agent.delete()` | Remove mappings |
| List Calls | `client.call.list()` | Filter by tenant |
| Get Recording | `client.call.retrieve()` | Validate access |
| Import Phone | `client.phone_number.import_()` | Bind to agent |

### LLM Configuration (Response Engine)

Retell uses LLMs (Response Engines) to power agent conversations:

```python
llm = client.llm.create(
    general_prompt="You are a helpful assistant...",
    start_speaker="agent",
    model="gpt-4o",  # or "claude-3-5-sonnet-20241022"
    model_temperature=0.7,
    states=[...],  # Conversation flow states
    starting_state="greeting",
    general_tools=[...],  # Available tools
)
```

### Conversation States (Flow)

```python
states = [
    {
        "name": "greeting",
        "state_prompt": "Greet the customer warmly...",
        "edges": [
            {
                "destination_state_name": "booking",
                "description": "Customer wants to book"
            },
            {
                "destination_state_name": "inquiry",
                "description": "Customer has a question"
            }
        ]
    },
    # ... more states
]
```

### Text-to-Speech Voices

| Provider | Voice Examples |
|----------|---------------|
| ElevenLabs | 11labs-Adrian, 11labs-Rachel |
| OpenAI | openai-nova, openai-shimmer |
| Deepgram | deepgram-aura-asteria |
| Retell | retell-Marissa, retell-Niamh |

### Language Support

Retell supports 20+ languages:
- English (US, UK, AU, etc.)
- Spanish, French, German, Italian, Portuguese
- Mandarin, Cantonese, Japanese, Korean
- Arabic, Hindi, and more

---

## Agent Management

### Agent Configuration

Each agent maps to a Retell agent + LLM with VoxCalls metadata:

```python
class Agent:
    id: UUID                          # VoxCalls ID
    tenant_id: UUID                   # FK to tenant
    retell_agent_id: str              # Retell agent ID
    retell_llm_id: str                # Retell LLM ID

    # Assignment
    assigned_user_id: UUID            # FK to user (optional)
    assigned_phone_number_id: UUID    # FK to phone_number

    # Configuration (mirrored from Retell)
    name: str
    system_prompt: str
    welcome_message: str
    voice_id: str
    llm_model: str
    language: str

    # Settings
    responsiveness: float             # 0.0 - 1.0
    interruption_sensitivity: float   # 0.0 - 1.0
    ambient_sound: str                # coffee-shop, call-center, etc.

    # Status
    status: AgentStatus               # active, paused, deleted
    created_at: datetime
    updated_at: datetime
```

### Agent Creation Flow

```
1. User submits agent config via dashboard
2. VoxCalls API validates permissions
3. VoxCalls API creates LLM in Retell
4. Retell returns llm_id
5. VoxCalls API creates Agent in Retell with llm_id
6. Retell returns agent_id
7. VoxCalls stores mapping in PostgreSQL
8. If phone number specified, bind via Retell API
```

---

## Phone Number Management

### SIP Trunk Configuration

VoxCalls uses a single Twilio SIP trunk for all phone connectivity:

```
Twilio SIP Trunk
├── Termination URI: your-trunk.pstn.twilio.com
├── Authentication: Username/Password
└── Routes calls to Retell via SIP
```

### Phone Number Model

```python
class PhoneNumber:
    id: UUID                    # VoxCalls ID

    # Phone data
    phone_number: str           # E.164 format (+1234567890)
    country_code: str           # US, AU, GB, etc.
    number_type: NumberType     # local, mobile, toll_free

    # Retell data
    retell_phone_id: str        # Retell phone number ID

    # Assignment
    tenant_id: UUID             # Assigned tenant (NULL = pool)
    assigned_user_id: UUID      # Assigned user within tenant
    assigned_agent_id: UUID     # FK to agent

    # SIP Configuration
    sip_trunk_uri: str          # Twilio termination URI
    sip_username: str           # SIP auth username
    sip_password: str           # SIP auth password (encrypted)

    # Status
    status: PhoneStatus         # available, assigned, suspended
    assigned_at: datetime
    created_at: datetime
```

### Phone Import Flow

```python
# Import phone number to Retell
phone = client.phone_number.import_(
    phone_number="+61XXXXXXXXX",
    termination_uri="your-trunk.pstn.twilio.com",
    sip_trunk_auth_username="username",
    sip_trunk_auth_password="password",
    inbound_agent_id="agent_xxxxx",
    nickname="Main Line"
)
```

---

## Call Management & Recording

### Call Data Model

```python
class Call:
    id: UUID                    # VoxCalls ID
    tenant_id: UUID             # FK to tenant
    user_id: UUID               # FK to user
    agent_id: UUID              # FK to agent

    # Retell data
    retell_call_id: str         # Retell call ID

    # Call metadata
    phone_number: str           # Caller/callee number
    direction: CallDirection    # inbound, outbound
    status: CallStatus          # in_progress, completed, failed

    # Timing
    started_at: datetime
    ended_at: datetime
    duration_seconds: int

    # Quality
    call_successful: bool
    disconnection_reason: str

    # Recording
    recording_url: str          # Retell recording URL

    # Summary (from Retell)
    call_analysis: JSON         # Post-call analysis data

    created_at: datetime
```

### Transcript Storage

```python
class CallTranscript:
    id: UUID
    call_id: UUID               # FK to call

    # Message data
    sequence: int               # Order in conversation
    role: MessageRole           # user, agent
    content: str                # Message text

    # Timing
    start_time_ms: int          # Relative to call start
    end_time_ms: int

    created_at: datetime
```

---

## Agent Tools & Webhooks

### Built-in Tools

| Tool Type | Description |
|-----------|-------------|
| `end_call` | Gracefully end conversation |
| `transfer_call` | Transfer to another phone number |
| `agent_transfer` | Transfer to another Retell agent |
| `press_digit` | Press DTMF digits |
| `send_sms` | Send SMS to caller |
| `check_availability_cal` | Cal.com integration |

### Custom Webhook Tools

```python
{
    "type": "custom",
    "name": "book_appointment",
    "description": "Submit a booking request",
    "url": "https://your-webhook.com/book",
    "method": "POST",
    "parameters": {
        "type": "object",
        "properties": {
            "patient_name": {"type": "string"},
            "appointment_type": {"type": "string"},
            "preferred_datetime": {"type": "string"}
        },
        "required": ["patient_name", "appointment_type"]
    }
}
```

---

## Billing & Usage Tracking

### Usage Tracking

Every call is tracked for billing:

```python
class UsageRecord:
    id: UUID
    tenant_id: UUID
    user_id: UUID
    call_id: UUID

    # Usage metrics
    conversation_minutes: float     # Billable minutes
    llm_input_tokens: int
    llm_output_tokens: int

    # Pricing (at time of usage)
    rate_per_minute: Decimal
    total_cost: Decimal

    recorded_at: datetime
```

---

## Frontend Dashboard

### Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/login` | Public | User authentication |
| `/register` | Public | Tenant registration |
| `/dashboard` | User+ | Main dashboard |
| `/dashboard/agent` | User+ | Agent configuration |
| `/dashboard/knowledge` | User+ | Knowledge base |
| `/dashboard/calls` | User+ | Call history |
| `/dashboard/team` | Admin+ | Team management |
| `/dashboard/settings` | Admin+ | Tenant settings |
| `/dashboard/billing` | Admin+ | Usage & billing |
| `/admin` | Super Admin | Platform admin |
| `/admin/tenants` | Super Admin | Tenant management |
| `/admin/phone-numbers` | Super Admin | Number pool |
| `/admin/analytics` | Super Admin | Platform metrics |

---

## API Reference

### Authentication

```
POST   /api/v1/auth/register          # Create tenant + first admin
POST   /api/v1/auth/login             # Get tokens
POST   /api/v1/auth/refresh           # Refresh access token
POST   /api/v1/auth/logout            # Revoke refresh token
GET    /api/v1/auth/me                # Current user info
```

### Agents

```
GET    /api/v1/agents                 # List agents
POST   /api/v1/agents                 # Create agent
GET    /api/v1/agents/{id}            # Get agent
PATCH  /api/v1/agents/{id}            # Update agent
DELETE /api/v1/agents/{id}            # Delete agent
POST   /api/v1/agents/{id}/pause      # Pause agent
POST   /api/v1/agents/{id}/resume     # Resume agent
```

### Calls

```
GET    /api/v1/calls                  # List calls
GET    /api/v1/calls/{id}             # Get call + transcript
GET    /api/v1/calls/{id}/audio       # Get audio recording
GET    /api/v1/calls/{id}/transcript  # Get transcript only
```

### Phone Numbers

```
GET    /api/v1/phone-numbers/available    # List available (Admin+)
POST   /api/v1/phone-numbers/claim        # Claim number (Admin+)
POST   /api/v1/phone-numbers/release      # Release number (Admin+)
GET    /api/v1/phone-numbers/mine         # Get assigned number
```

---

## Environment Variables

### Backend (Railway)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/voxcalls

# Authentication
JWT_SECRET_KEY=your-256-bit-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Retell AI
RETELL_API_KEY=key_xxxxxxxxxxxxx

# Twilio SIP Trunking
TWILIO_TERMINATION_SIP_URL=your-trunk.pstn.twilio.com
SIP_USERNAME=your-sip-username
SIP_PASSWORD=your-sip-password

# Application
API_BASE_URL=https://api.voxcalls.com
FRONTEND_URL=https://voxcalls.com
ENVIRONMENT=production

# Encryption (for secrets)
ENCRYPTION_KEY=your-256-bit-encryption-key

# Optional: Redis
REDIS_URL=redis://user:pass@host:6379
```

### Frontend (Vercel)

```bash
# API
NEXT_PUBLIC_API_URL=https://api.voxcalls.com

# Application
NEXT_PUBLIC_APP_NAME=VoxCalls
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## Database Schema

### Core Tables

```sql
-- Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    plan VARCHAR(50) DEFAULT 'free',
    trial_ends_at TIMESTAMP,
    subscription_id VARCHAR(255),
    max_users INT DEFAULT 5,
    max_agents INT DEFAULT 1,
    max_phone_numbers INT DEFAULT 1,
    monthly_minutes_limit INT DEFAULT 100,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    assigned_agent_id UUID,
    assigned_phone_number_id UUID,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- Agents
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    retell_agent_id VARCHAR(255) UNIQUE,
    retell_llm_id VARCHAR(255),
    assigned_user_id UUID REFERENCES users(id),
    assigned_phone_number_id UUID,
    name VARCHAR(255) NOT NULL,
    system_prompt TEXT,
    welcome_message TEXT,
    voice_id VARCHAR(255),
    llm_model VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    responsiveness FLOAT DEFAULT 0.8,
    interruption_sensitivity FLOAT DEFAULT 0.7,
    ambient_sound VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Phone Numbers
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(50) NOT NULL,
    country_code VARCHAR(10),
    number_type VARCHAR(50),
    retell_phone_id VARCHAR(255),
    tenant_id UUID REFERENCES tenants(id),
    assigned_user_id UUID REFERENCES users(id),
    assigned_agent_id UUID REFERENCES agents(id),
    sip_trunk_uri VARCHAR(255),
    status VARCHAR(50) DEFAULT 'available',
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Calls
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    user_id UUID REFERENCES users(id),
    agent_id UUID REFERENCES agents(id),
    retell_call_id VARCHAR(255),
    phone_number VARCHAR(50),
    direction VARCHAR(50),
    status VARCHAR(50),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INT,
    call_successful BOOLEAN,
    disconnection_reason TEXT,
    recording_url TEXT,
    call_analysis JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Call Transcripts
CREATE TABLE call_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES calls(id) NOT NULL,
    sequence INT NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    start_time_ms INT,
    end_time_ms INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage Records
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    user_id UUID REFERENCES users(id),
    call_id UUID REFERENCES calls(id),
    conversation_minutes FLOAT,
    llm_input_tokens INT,
    llm_output_tokens INT,
    rate_per_minute DECIMAL(10, 4),
    total_cost DECIMAL(10, 4),
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Invitations
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_agents_retell ON agents(retell_agent_id);
CREATE INDEX idx_phone_numbers_tenant ON phone_numbers(tenant_id);
CREATE INDEX idx_phone_numbers_status ON phone_numbers(status);
CREATE INDEX idx_calls_tenant ON calls(tenant_id);
CREATE INDEX idx_calls_user ON calls(user_id);
CREATE INDEX idx_calls_retell ON calls(retell_call_id);
CREATE INDEX idx_usage_tenant_date ON usage_records(tenant_id, recorded_at);
```

---

## Implementation Phases

### Phase 1: Foundation (Current)
- [x] Retell agent setup script
- [x] Documentation update for Retell
- [ ] Database schema and migrations
- [ ] Authentication system (register, login, JWT)
- [ ] Basic tenant and user models
- [ ] Super Admin seeding

### Phase 2: Core Features
- [ ] Retell agent integration (create, update, delete)
- [ ] Phone number management via Retell
- [ ] Knowledge base integration
- [ ] Basic dashboard UI

### Phase 3: Call Management
- [ ] Call history sync from Retell
- [ ] Transcript storage
- [ ] Recording access
- [ ] Call detail views

### Phase 4: Multi-Tenancy
- [ ] Invitation system
- [ ] Role-based permissions
- [ ] Team management UI
- [ ] Tenant isolation verification

### Phase 5: Billing & Polish
- [ ] Usage tracking
- [ ] Billing reports
- [ ] Admin analytics
- [ ] Production hardening

---

*Generated: February 2026*
*Architecture: Retell AI Wrapper v3.0*
