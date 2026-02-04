# VoxCalls Voice Agent Platform - Requirements Specification

> Multi-tenant voice AI platform built as a wrapper on ElevenLabs Conversational AI API

**Version**: 2.0
**Last Updated**: February 5, 2026
**Architecture**: 11Labs Wrapper

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

VoxCalls is a **production-grade, multi-tenant voice AI platform** that wraps the ElevenLabs Conversational AI API. It enables businesses to deploy AI-powered voice agents with:

- Inbound and outbound phone call handling
- Natural, multilingual conversations
- Custom knowledge bases (RAG)
- Call recording and transcription
- 24/7 operation without human intervention

### Value Proposition

| What 11Labs Provides | What VoxCalls Adds |
|---------------------|-------------------|
| Voice AI engine (STT → LLM → TTS) | Multi-tenant isolation |
| Agent conversation handling | User management & authentication |
| Knowledge base / RAG | Phone number pool management |
| Webhook/tool execution | Billing & usage tracking |
| Call recording & transcripts | Admin dashboards |
| Phone ↔ agent routing | Team collaboration |

### Key Differentiators

- **True multi-tenancy** - Complete data isolation between organizations
- **Three-tier role system** - Super Admin → Tenant Admin → User
- **Phone number pooling** - Centralized number management with tenant assignment
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
│           │   ElevenLabs   │       │     Twilio     │       │   Redis    │ │
│           │   Conv AI API  │       │   (Phone #s)   │       │  (Cache)   │ │
│           │                │       │                │       │ (Optional) │ │
│           │ • Agents       │       │ • Buy numbers  │       │            │ │
│           │ • Knowledge    │       │ • SIP trunk    │       │            │ │
│           │ • Conversations│       │ • SMS          │       │            │ │
│           │ • Recording    │       │                │       │            │ │
│           └────────────────┘       └────────────────┘       └────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. INBOUND CALL FLOW
   Phone Call → Twilio → ElevenLabs Agent → Conversation → Recording
                              ↑
                     Agent config from
                     VoxCalls DB (tenant-specific)

2. AGENT CONFIGURATION FLOW
   User Dashboard → VoxCalls API → PostgreSQL (store mapping)
                         ↓
                   ElevenLabs API (create/update agent)
                         ↓
                   Store agent_id ↔ tenant mapping

3. KNOWLEDGE BASE FLOW
   User uploads doc → VoxCalls API → ElevenLabs KB API
                           ↓
                     Store doc_id ↔ tenant mapping
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
| **Voice AI** | ElevenLabs API | Conversational AI engine |
| **Telephony** | Twilio | Phone numbers & SIP |
| **Cache** | Railway Redis (optional) | Session caching, rate limiting |

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14+, TypeScript, Tailwind CSS |
| **UI Components** | shadcn/ui (Radix UI primitives) |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Alembic |
| **Database** | PostgreSQL 15+ |
| **Auth** | JWT tokens, bcrypt password hashing |
| **API Clients** | ElevenLabs Python SDK, Twilio Python SDK |

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

**shadcn/ui Components to Use**:
- Layout: Card, Separator, Tabs, Sheet (mobile nav)
- Forms: Input, Select, Textarea, Checkbox, Switch, Slider
- Feedback: Alert, Toast, Badge, Progress
- Overlay: Dialog, Dropdown Menu, Popover, Tooltip
- Data: Table, Avatar, Skeleton (loading states)
- Navigation: Breadcrumb, Navigation Menu, Pagination

**Why shadcn/ui**:
- Not a component library - components are copied into your project
- Full control over styling and behavior
- Built on Radix UI (accessibility-first)
- Works perfectly with Tailwind CSS
- No runtime dependency

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

**Purple Scale (for hover/active states)**:
```
--purple-50:  #f5f0f9   (lightest - subtle backgrounds)
--purple-100: #ebe0f3
--purple-200: #d4bfe6
--purple-300: #b794d4
--purple-400: #9a69c2
--purple-500: #724a9e   (PRIMARY - main accent)
--purple-600: #5c3b80   (hover state)
--purple-700: #472d62   (active/pressed)
--purple-800: #321f45
--purple-900: #1d1228   (darkest)
```

**Tailwind Config**:
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f0f9',
          100: '#ebe0f3',
          200: '#d4bfe6',
          300: '#b794d4',
          400: '#9a69c2',
          500: '#724a9e',  // Primary
          600: '#5c3b80',  // Hover
          700: '#472d62',  // Active
          800: '#321f45',
          900: '#1d1228',
        },
      },
    },
  },
}
```

**CSS Variables (for shadcn/ui)**:
```css
/* globals.css */
:root {
  --background: 0 0% 100%;           /* White */
  --foreground: 234 43% 14%;         /* Charcoal #1a1a2e */

  --primary: 269 36% 46%;            /* Purple #724a9e */
  --primary-foreground: 0 0% 100%;   /* White text on purple */

  --secondary: 210 20% 98%;          /* Light gray #f8f9fa */
  --secondary-foreground: 234 43% 14%;

  --muted: 210 20% 98%;
  --muted-foreground: 215 16% 47%;   /* Slate #64748b */

  --accent: 269 36% 46%;             /* Purple */
  --accent-foreground: 0 0% 100%;

  --border: 214 32% 91%;             /* #e2e8f0 */
  --input: 214 32% 91%;
  --ring: 269 36% 46%;               /* Purple focus ring */

  --destructive: 347 77% 60%;        /* Rose #f43f5e */
  --destructive-foreground: 0 0% 100%;
}
```

### Future Migration Path

- **Authentication**: May migrate to Supabase Auth
- **Database**: May migrate to Supabase PostgreSQL
- **Realtime**: May add Supabase Realtime for live updates

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
- 11Labs agents tagged with tenant metadata
- 11Labs documents mapped to tenant in our DB
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

### Role Definitions

#### Super Admin (Platform Level)

| Permission | Description |
|------------|-------------|
| `platform:manage` | Full platform configuration |
| `tenants:create` | Create new tenant organizations |
| `tenants:read:all` | View all tenants |
| `tenants:update:all` | Modify any tenant |
| `tenants:delete` | Delete/suspend tenants |
| `phone_numbers:pool:manage` | Buy, allocate, deallocate numbers |
| `users:super_admin:manage` | Create/remove super admins |
| `analytics:platform` | View platform-wide metrics |
| `billing:platform` | View/manage platform billing |

#### Admin (Tenant Level)

| Permission | Description |
|------------|-------------|
| `tenant:settings` | Configure tenant settings |
| `users:invite` | Invite users to tenant |
| `users:remove` | Remove users from tenant |
| `users:roles:manage` | Change user roles (Admin/User) |
| `agents:manage:all` | Full access to all tenant agents |
| `documents:manage:all` | Full access to all tenant documents |
| `calls:view:all` | View all tenant call history |
| `phone_numbers:claim` | Claim numbers from pool |
| `phone_numbers:release` | Release numbers back to pool |
| `billing:tenant` | View tenant usage and billing |

#### User (Personal Level)

| Permission | Description |
|------------|-------------|
| `profile:manage` | Update own profile |
| `agent:manage:own` | Configure assigned agent |
| `documents:manage:own` | Manage own documents |
| `calls:view:own` | View own call history |
| `phone_number:use` | Use assigned phone number |

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
    assigned_agent_id: str      # 11Labs agent ID (for users)
    assigned_phone_number_id: UUID  # FK to phone_numbers

    # Metadata
    created_at: datetime
    last_login_at: datetime
    settings: JSON              # User preferences
```

### Permission Checking Examples

```python
# Middleware checks
def require_super_admin(user: User):
    if user.role != "super_admin":
        raise HTTPException(403, "Super admin access required")

def require_tenant_admin(user: User):
    if user.role not in ["super_admin", "admin"]:
        raise HTTPException(403, "Admin access required")

def require_tenant_member(user: User, tenant_id: UUID):
    if user.role == "super_admin":
        return  # Super admins can access any tenant
    if user.tenant_id != tenant_id:
        raise HTTPException(403, "Access denied to this tenant")

# Resource ownership checks
def can_access_agent(user: User, agent: Agent) -> bool:
    if user.role == "super_admin":
        return True
    if user.tenant_id != agent.tenant_id:
        return False
    if user.role == "admin":
        return True
    return agent.assigned_user_id == user.id

def can_access_call(user: User, call: Call) -> bool:
    if user.role == "super_admin":
        return True
    if user.tenant_id != call.tenant_id:
        return False
    if user.role == "admin":
        return True
    return call.user_id == user.id
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
  "tenant_id": "tenant_uuid",  // null for super_admin
  "role": "admin",
  "email": "user@example.com",
  "iat": 1707100000,
  "exp": 1707100900
}
```

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- bcrypt hashing with cost factor 12

### Session Management

- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- Refresh tokens stored in database (can be revoked)
- Single active refresh token per device (optional)

---

## Voice AI Capabilities

### 11Labs Integration Points

| Feature | 11Labs API | VoxCalls Wrapper |
|---------|-----------|------------------|
| Create Agent | `POST /v1/convai/agents/create` | Add tenant mapping |
| Update Agent | `PATCH /v1/convai/agents/{id}` | Validate ownership |
| Delete Agent | `DELETE /v1/convai/agents/{id}` | Remove mappings |
| List Conversations | `GET /v1/convai/conversations` | Filter by tenant |
| Get Recording | `GET /v1/convai/conversations/{id}/audio` | Validate access |

### LLM Providers (via 11Labs)

| Provider | Models |
|----------|--------|
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo |
| Anthropic | claude-3-5-sonnet, claude-3-haiku |
| ElevenLabs | elevenlabs_v2 (native) |

### Text-to-Speech Models

| Model | Use Case |
|-------|----------|
| eleven_turbo_v2_5 | English, fastest latency |
| eleven_multilingual_v2 | All languages |
| eleven_flash_v2_5 | Ultra-low latency |

### Voice Selection

Users can select any voice from:
- ElevenLabs voice library (thousands of voices)
- Custom cloned voices (in their 11Labs account)
- Voice Design voices (AI-generated)

### Language Support

11Labs supports 29+ languages with automatic detection:
- English (US, UK, AU, etc.)
- Spanish, French, German, Italian, Portuguese
- Mandarin, Japanese, Korean
- Arabic, Hindi, and more

---

## Agent Management

### Agent Configuration

Each agent maps to an 11Labs agent with VoxCalls metadata:

```python
class Agent:
    id: UUID                          # VoxCalls ID
    tenant_id: UUID                   # FK to tenant
    elevenlabs_agent_id: str          # 11Labs agent ID

    # Assignment
    assigned_user_id: UUID            # FK to user (optional)
    assigned_phone_number_id: UUID    # FK to phone_number

    # Configuration (mirrored from 11Labs)
    name: str
    system_prompt: str
    welcome_message: str
    voice_id: str
    llm_model: str
    language: str

    # Settings
    max_conversation_turns: int
    min_silence_duration: float       # 0.2 - 1.0 seconds

    # Status
    status: AgentStatus               # active, paused, deleted
    created_at: datetime
    updated_at: datetime
```

### Agent Creation Flow

```
1. User submits agent config via dashboard
2. VoxCalls API validates permissions
3. VoxCalls API calls 11Labs to create agent
4. 11Labs returns agent_id
5. VoxCalls stores mapping in PostgreSQL
6. If phone number specified, update 11Labs phone assignment
```

### Agent Limits by Plan

| Plan | Max Agents | Max Concurrent Calls |
|------|------------|---------------------|
| Free | 1 | 1 |
| Starter | 5 | 3 |
| Pro | 20 | 10 |
| Enterprise | Unlimited | Custom |

---

## Knowledge Base (RAG)

### Document Management

```python
class Document:
    id: UUID                    # VoxCalls ID
    tenant_id: UUID             # FK to tenant
    user_id: UUID               # FK to user who uploaded
    elevenlabs_doc_id: str      # 11Labs document ID

    # Metadata
    name: str
    source_type: SourceType     # file, url, text
    source_url: str             # Original URL if applicable
    file_name: str              # Original filename
    file_size_bytes: int

    # Status
    status: DocStatus           # processing, ready, failed
    created_at: datetime
```

### Document Upload Flow

```
1. User uploads file/URL/text via dashboard
2. VoxCalls API validates permissions
3. VoxCalls API uploads to 11Labs KB API
4. 11Labs processes and returns doc_id
5. VoxCalls stores mapping in PostgreSQL
6. Document attached to user's agent config
```

### Supported Formats

- PDF (.pdf)
- Word (.docx)
- Text (.txt)
- Markdown (.md)
- URL import (web scraping)

### Limits by Plan

| Plan | Max Documents | Max Size per Doc |
|------|---------------|------------------|
| Free | 5 | 5 MB |
| Starter | 25 | 10 MB |
| Pro | 100 | 25 MB |
| Enterprise | Unlimited | 50 MB |

---

## Phone Number Management

### Phone Number Pool

Super Admins manage a central pool of Twilio phone numbers that can be assigned to tenants.

```python
class PhoneNumber:
    id: UUID                    # VoxCalls ID

    # Twilio data
    twilio_sid: str             # Twilio Phone Number SID
    phone_number: str           # E.164 format (+1234567890)
    country_code: str           # US, AU, GB, etc.
    number_type: NumberType     # local, mobile, toll_free

    # 11Labs data
    elevenlabs_phone_id: str    # 11Labs phone number ID

    # Assignment
    tenant_id: UUID             # Assigned tenant (NULL = pool)
    assigned_user_id: UUID      # Assigned user within tenant
    assigned_agent_id: UUID     # FK to agent

    # Capabilities
    supports_inbound: bool
    supports_outbound: bool
    supports_sms: bool

    # Status
    status: PhoneStatus         # available, assigned, suspended
    assigned_at: datetime
    created_at: datetime
```

### Phone Number Lifecycle

```
1. PURCHASE (Super Admin)
   - Super Admin searches Twilio for available numbers
   - Purchases number via Twilio API
   - Imports to 11Labs with platform Twilio credentials
   - Number added to pool (status: available)

2. CLAIM (Tenant Admin)
   - Admin browses available numbers in pool
   - Claims number for their tenant
   - Number assigned to tenant (status: assigned)
   - Admin assigns to specific user/agent

3. RELEASE (Tenant Admin)
   - Admin releases number from user
   - Number returns to pool (status: available)
   - 11Labs assignment cleared

4. DECOMMISSION (Super Admin)
   - Super Admin removes number from pool
   - Number deleted from 11Labs
   - Number released in Twilio (optional)
```

### Phone Number Endpoints

| Endpoint | Access | Description |
|----------|--------|-------------|
| `GET /api/v1/admin/phone-numbers/pool` | Super Admin | List all numbers |
| `POST /api/v1/admin/phone-numbers/purchase` | Super Admin | Buy from Twilio |
| `POST /api/v1/admin/phone-numbers/import` | Super Admin | Import existing |
| `DELETE /api/v1/admin/phone-numbers/{id}` | Super Admin | Remove from pool |
| `GET /api/v1/phone-numbers/available` | Admin | List claimable |
| `POST /api/v1/phone-numbers/claim` | Admin | Claim for tenant |
| `POST /api/v1/phone-numbers/release` | Admin | Release to pool |
| `GET /api/v1/phone-numbers/mine` | User | Get assigned number |

---

## Call Management & Recording

### Call Data Model

```python
class Call:
    id: UUID                    # VoxCalls ID
    tenant_id: UUID             # FK to tenant
    user_id: UUID               # FK to user
    agent_id: UUID              # FK to agent

    # 11Labs data
    elevenlabs_conversation_id: str

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
    failure_reason: str

    # Usage tracking
    llm_tokens_used: int
    tts_characters_used: int

    # Summary (from 11Labs)
    transcript_summary: str

    created_at: datetime
```

### Transcript Storage

```python
class CallTranscript:
    id: UUID
    call_id: UUID               # FK to call

    # Message data
    sequence: int               # Order in conversation
    role: MessageRole           # user, assistant
    content: str                # Message text

    # Timing
    start_time_ms: int          # Relative to call start
    end_time_ms: int

    created_at: datetime
```

### Recording Access

Recordings are stored by 11Labs. VoxCalls provides proxied access:

```
GET /api/v1/calls/{call_id}/audio
- Validates user can access this call
- Fetches signed URL from 11Labs
- Returns audio stream or redirect
```

### Call Sync Strategy

```
Option A: Webhook-based (Recommended)
- Configure 11Labs webhook to POST to VoxCalls on call events
- Real-time call tracking

Option B: Polling-based
- Periodic job syncs conversations from 11Labs
- Batch updates to PostgreSQL

Option C: On-demand
- Fetch from 11Labs when user requests call history
- Cache in PostgreSQL
```

---

## Agent Tools & Webhooks

### Tool Configuration

Tools are configured per-agent and executed by 11Labs during conversations.

```python
class AgentTool:
    id: UUID
    agent_id: UUID              # FK to agent
    tenant_id: UUID             # FK to tenant

    # Tool definition
    name: str                   # lookup_customer, book_appointment
    description: str            # Natural language description
    tool_type: ToolType         # webhook, system

    # Webhook config
    endpoint_url: str
    http_method: str            # GET, POST, PUT, DELETE
    headers: JSON               # Static headers

    # Schema
    parameters_schema: JSON     # JSON Schema for parameters

    # Security
    requires_auth: bool
    auth_header_name: str
    auth_secret_key: str        # Reference to secret (not actual value)

    # Settings
    timeout_seconds: int
    retry_count: int

    status: ToolStatus          # active, disabled
    created_at: datetime
```

### Built-in Tools

| Tool | Description | Configuration |
|------|-------------|---------------|
| `transfer_call` | Transfer to human agent | Target phone number |
| `end_call` | Gracefully end conversation | Optional goodbye message |
| `send_sms` | Send SMS to caller | Message template |

### Secret Management

Webhook authentication secrets stored securely:

```python
class TenantSecret:
    id: UUID
    tenant_id: UUID

    name: str                   # Human-readable name
    key: str                    # Reference key (e.g., "stripe_api_key")
    encrypted_value: str        # AES-256 encrypted

    created_at: datetime
    updated_at: datetime
```

---

## Billing & Usage Tracking

### Usage Tracking

Every conversation is tracked for billing:

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
    tts_characters: int
    stt_seconds: float

    # Pricing (at time of usage)
    rate_per_minute: Decimal
    total_cost: Decimal

    recorded_at: datetime
```

### Monthly Aggregation

```python
class MonthlyUsage:
    id: UUID
    tenant_id: UUID

    year: int
    month: int

    # Aggregates
    total_calls: int
    total_minutes: float
    total_llm_tokens: int
    total_tts_characters: int

    # Billing
    subtotal: Decimal
    credits_applied: Decimal
    amount_due: Decimal

    # Status
    status: BillingStatus       # pending, invoiced, paid
    invoice_id: str             # External invoice reference
```

### Plan Limits

```python
class Plan:
    id: str                     # free, starter, pro, enterprise
    name: str

    # Limits
    monthly_minutes: int        # Included minutes
    max_users: int
    max_agents: int
    max_phone_numbers: int
    max_documents: int

    # Pricing
    base_price: Decimal         # Monthly fee
    overage_rate: Decimal       # Per minute over limit

    # Features
    features: JSON              # Feature flags
```

### Overage Handling

```
When tenant exceeds monthly_minutes:
1. Check if overage enabled for tenant
2. If enabled: continue service, bill at overage_rate
3. If disabled: pause agents, notify admin
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

### Dashboard Components

**User Dashboard**
- Agent status card (active/paused)
- Phone number display
- Quick stats (calls today, minutes used)
- Recent calls list

**Agent Configuration**
- System prompt editor
- Welcome message
- Voice selector (browse 11Labs voices)
- LLM model selector
- Language settings
- Response speed slider

**Knowledge Base**
- Document list with status
- Upload modal (file, URL, text)
- Search functionality
- Delete confirmation

**Call History**
- Filterable call table
- Call detail panel
- Transcript viewer (chat format)
- Audio player
- Download options

**Team Management (Admin)**
- User list with roles
- Invite user modal
- Change role dropdown
- Remove user action

**Billing (Admin)**
- Current plan display
- Usage charts
- Invoice history
- Upgrade prompts

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

### Users

```
GET    /api/v1/users                  # List tenant users (Admin+)
POST   /api/v1/users/invite           # Invite user (Admin+)
GET    /api/v1/users/{id}             # Get user (Admin+ or self)
PATCH  /api/v1/users/{id}             # Update user
DELETE /api/v1/users/{id}             # Remove user (Admin+)
PATCH  /api/v1/users/{id}/role        # Change role (Admin+)
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

### Documents

```
GET    /api/v1/documents              # List documents
POST   /api/v1/documents/file         # Upload file
POST   /api/v1/documents/url          # Import from URL
POST   /api/v1/documents/text         # Create from text
GET    /api/v1/documents/{id}         # Get document
DELETE /api/v1/documents/{id}         # Delete document
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

### Tenant Settings

```
GET    /api/v1/tenant                 # Get tenant info
PATCH  /api/v1/tenant                 # Update tenant (Admin+)
GET    /api/v1/tenant/usage           # Get usage stats (Admin+)
```

### Super Admin

```
GET    /api/v1/admin/tenants                      # List all tenants
POST   /api/v1/admin/tenants                      # Create tenant
GET    /api/v1/admin/tenants/{id}                 # Get tenant
PATCH  /api/v1/admin/tenants/{id}                 # Update tenant
DELETE /api/v1/admin/tenants/{id}                 # Delete tenant
POST   /api/v1/admin/tenants/{id}/suspend         # Suspend tenant
POST   /api/v1/admin/tenants/{id}/activate        # Activate tenant

GET    /api/v1/admin/phone-numbers                # List all numbers
POST   /api/v1/admin/phone-numbers/search         # Search Twilio
POST   /api/v1/admin/phone-numbers/purchase       # Buy number
POST   /api/v1/admin/phone-numbers/import         # Import existing
DELETE /api/v1/admin/phone-numbers/{id}           # Remove number
PATCH  /api/v1/admin/phone-numbers/{id}/allocate  # Assign to tenant

GET    /api/v1/admin/analytics                    # Platform metrics
GET    /api/v1/admin/users                        # All users (filtered)
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

# ElevenLabs
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token

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
    role VARCHAR(50) NOT NULL,  -- super_admin, admin, user
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
    elevenlabs_agent_id VARCHAR(255) UNIQUE,
    assigned_user_id UUID REFERENCES users(id),
    assigned_phone_number_id UUID,
    name VARCHAR(255) NOT NULL,
    system_prompt TEXT,
    welcome_message TEXT,
    voice_id VARCHAR(255),
    llm_model VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    max_conversation_turns INT DEFAULT 100,
    min_silence_duration FLOAT DEFAULT 0.4,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Phone Numbers
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twilio_sid VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    country_code VARCHAR(10),
    number_type VARCHAR(50),
    elevenlabs_phone_id VARCHAR(255),
    tenant_id UUID REFERENCES tenants(id),
    assigned_user_id UUID REFERENCES users(id),
    assigned_agent_id UUID REFERENCES agents(id),
    supports_inbound BOOLEAN DEFAULT TRUE,
    supports_outbound BOOLEAN DEFAULT TRUE,
    supports_sms BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'available',
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    elevenlabs_doc_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50),
    source_url TEXT,
    file_name VARCHAR(255),
    file_size_bytes INT,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Calls
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    user_id UUID REFERENCES users(id),
    agent_id UUID REFERENCES agents(id),
    elevenlabs_conversation_id VARCHAR(255),
    phone_number VARCHAR(50),
    direction VARCHAR(50),
    status VARCHAR(50),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INT,
    call_successful BOOLEAN,
    failure_reason TEXT,
    transcript_summary TEXT,
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
    tts_characters INT,
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
CREATE INDEX idx_phone_numbers_tenant ON phone_numbers(tenant_id);
CREATE INDEX idx_phone_numbers_status ON phone_numbers(status);
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_calls_tenant ON calls(tenant_id);
CREATE INDEX idx_calls_user ON calls(user_id);
CREATE INDEX idx_usage_tenant_date ON usage_records(tenant_id, recorded_at);
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Database schema and migrations
- [ ] Authentication system (register, login, JWT)
- [ ] Basic tenant and user models
- [ ] Super Admin seeding

### Phase 2: Core Features
- [ ] 11Labs agent integration (create, update, delete)
- [ ] Phone number management (Twilio + 11Labs)
- [ ] Knowledge base integration
- [ ] Basic dashboard UI

### Phase 3: Call Management
- [ ] Call history sync
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
*Architecture: 11Labs Wrapper v2.0*
