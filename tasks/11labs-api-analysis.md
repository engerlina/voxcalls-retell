# ElevenLabs API vs VoxCalls Requirements Analysis

**Date**: February 5, 2026
**Purpose**: Determine feasibility of building VoxCalls as a multi-tenant wrapper on 11Labs Conversational AI API

---

## Executive Summary

**Verdict: FEASIBLE with caveats**

The ElevenLabs Conversational AI API provides robust infrastructure for building a multi-tenant voice agent platform. However, several gaps exist that require workarounds or additional integrations.

### Key Findings

| Category | Status | Notes |
|----------|--------|-------|
| Agent Creation/Management | **SUPPORTED** | Full API coverage |
| Knowledge Base (RAG) | **SUPPORTED** | Full API coverage |
| Phone Numbers | **PARTIALLY SUPPORTED** | BYOT (Bring Your Own Twilio/SIP) |
| Call Recording | **SUPPORTED** | Audio retrieval via API |
| Transcripts | **SUPPORTED** | Full conversation history |
| Multi-Tenancy | **NOT PROVIDED** | Must build ourselves |
| Webhooks/Tools | **SUPPORTED** | Full configuration via API |
| Voice Selection | **SUPPORTED** | Any voice ID works |

---

## Detailed Capability Mapping

### 1. Agent Management

#### VoxCalls Requirement
- Create agents per tenant/user
- Configure system prompts, LLM models, voice settings
- Per-tenant isolation

#### 11Labs API Coverage

| Endpoint | Purpose | Coverage |
|----------|---------|----------|
| `POST /v1/convai/agents/create` | Create agent | FULL |
| `GET /v1/convai/agents/{agent_id}` | Get agent details | FULL |
| `PATCH /v1/convai/agents/{agent_id}` | Update agent config | FULL |
| `DELETE /v1/convai/agents/{agent_id}` | Delete agent | FULL |

**Agent Configuration Options**:
- `name` - Agent name
- `conversation_config.agent.first_message` - Welcome message
- `conversation_config.agent.language` - Primary language
- `conversation_config.agent.prompt.prompt` - System prompt
- `conversation_config.agent.prompt.llm` - LLM model (gpt-4o, gpt-4o-mini, etc.)
- `conversation_config.agent.prompt.temperature` - Response creativity
- `conversation_config.agent.prompt.max_tokens` - Token limit
- `conversation_config.agent.prompt.knowledge_base` - RAG documents
- `conversation_config.tts.voice_id` - Voice selection
- `conversation_config.tts.model_id` - TTS model (eleven_turbo_v2_5, eleven_multilingual_v2)

**Gap**: No native multi-tenancy. Must track `agent_id → tenant_id` mapping ourselves.

---

### 2. Phone Number Management

#### VoxCalls Requirement
- Pool of phone numbers managed by admin
- Users claim/release numbers
- Auto-configure webhooks for inbound calls
- Support inbound and outbound calls

#### 11Labs API Coverage

| Endpoint | Purpose | Coverage |
|----------|---------|----------|
| `POST /v1/convai/phone-numbers` | Import phone number | FULL |
| `GET /v1/convai/phone-numbers/{id}` | Get phone number | FULL |
| `PATCH /v1/convai/phone-numbers/{id}` | Update assignment | FULL |
| `DELETE /v1/convai/phone-numbers/{id}` | Remove number | FULL |
| `POST /v1/convai/twilio/outbound-call` | Make outbound call | FULL |

**Critical Finding**: 11Labs does NOT provision phone numbers directly. You must:
1. Purchase numbers from Twilio (or use SIP trunk)
2. Import them into 11Labs with your Twilio SID/Token
3. Assign them to agents

**Providers Supported**:
- Twilio (requires your own account)
- SIP Trunk (custom configuration)

**What This Means**:
- We still need a Twilio account for phone numbers
- 11Labs handles the voice AI; Twilio handles telephony
- We must manage Twilio credentials and number lifecycle

---

### 3. Knowledge Base (RAG)

#### VoxCalls Requirement
- Upload documents (PDF, DOCX, TXT, MD)
- Import from URLs
- Direct text input
- Per-tenant document isolation
- Semantic search during calls

#### 11Labs API Coverage

| Endpoint | Purpose | Coverage |
|----------|---------|----------|
| `POST /v1/convai/knowledge-base/file` | Upload file | FULL |
| `POST /v1/convai/knowledge-base/url` | Import from URL | FULL |
| `POST /v1/convai/knowledge-base/text` | Create from text | FULL |
| `GET /v1/convai/knowledge-base/documents` | List documents | FULL |
| `GET /v1/convai/knowledge-base/documents/{id}` | Get document | FULL |
| `DELETE /v1/convai/knowledge-base/documents/{id}` | Delete document | FULL |
| `POST /v1/convai/knowledge-base/rag/index/compute` | Rebuild index | FULL |

**Supported File Types**: PDF, DOCX, TXT (and likely more)

**Gap**: Knowledge base appears to be workspace-level, not agent-level. We need to:
1. Track `document_id → tenant_id` mapping ourselves
2. Only attach relevant documents to each agent's config
3. Implement our own isolation logic

---

### 4. Call Management & Recording

#### VoxCalls Requirement
- View call history per user/tenant
- Store transcripts with speaker attribution
- Audio recording and playback
- Call duration, status, timestamps

#### 11Labs API Coverage

| Endpoint | Purpose | Coverage |
|----------|---------|----------|
| `GET /v1/convai/conversations` | List conversations | FULL |
| `GET /v1/convai/conversations/{id}` | Get conversation details | FULL |
| `GET /v1/convai/conversations/{id}/audio` | Get audio recording | FULL |
| `DELETE /v1/convai/conversations/{id}` | Delete conversation | FULL |

**Conversation Data Available**:
- `conversation_id` - Unique ID
- `agent_id` - Which agent handled the call
- `start_time_unix_secs` - Start timestamp
- `call_duration_secs` - Duration
- `message_count` - Number of turns
- `status` - Call status
- `call_successful` - Success indicator
- `direction` - inbound/outbound
- `transcript_summary` - AI-generated summary
- `history` - Full message history with role attribution

**Gap**: Must implement our own `conversation_id → tenant_id` mapping via `agent_id`.

---

### 5. Agent Tools (Webhooks)

#### VoxCalls Requirement
- Call external APIs during conversations
- CRM lookups, appointment booking, order status
- Configurable per tenant

#### 11Labs API Coverage

Tools are configured per-agent via the `conversation_config.agent.prompt.tools` array.

**Supported Tool Types**:
1. **Webhook Tools** - Call external HTTP endpoints
2. **Client Tools** - Execute in the conversation context
3. **System Tools** - Built-in capabilities

**Webhook Configuration**:
```json
{
  "type": "webhook",
  "name": "check_order_status",
  "description": "Check customer order status",
  "response_timeout_secs": 10,
  "api_schema": {
    "url": "https://api.example.com/orders/{order_id}",
    "method": "GET",
    "path_params_schema": {...},
    "query_params_schema": {...},
    "request_body_schema": {...},
    "request_headers": {...}
  }
}
```

**Coverage**: FULL - This matches VoxCalls requirements exactly.

---

### 6. Voice Configuration

#### VoxCalls Requirement
- Select from ElevenLabs voices
- Support custom/cloned voices
- Per-tenant voice selection

#### 11Labs API Coverage
- `voice_id` - Any voice from the ElevenLabs library or user's account
- `model_id` - TTS model selection (turbo vs multilingual)
- `stability`, `similarity_boost` - Voice fine-tuning

**Coverage**: FULL

---

### 7. Language Support

#### VoxCalls Requirement
- 17 languages with auto-detection
- Multilingual conversations

#### 11Labs API Coverage
- `language` parameter on agent config
- `eleven_multilingual_v2` TTS model for non-English
- Deepgram STT integration with auto-detection

**Coverage**: FULL (depends on underlying STT/TTS models)

---

## API Gaps - What Doesn't Exist

### 1. Multi-Tenancy (CRITICAL)

**Gap**: No built-in organization/tenant isolation.

**Impact**: HIGH - This is the core value proposition of VoxCalls.

**Solution**: Build multi-tenancy layer ourselves:
- Database tables: `tenants`, `users`, `tenant_agents`, `tenant_documents`
- Map all 11Labs resources to tenants via our DB
- Enforce tenant isolation at API layer

### 2. Phone Number Provisioning

**Gap**: Cannot purchase phone numbers via 11Labs API.

**Impact**: MEDIUM - Requires Twilio integration.

**Solution**:
- Maintain Twilio integration for number purchasing
- Use 11Labs API to import/assign numbers to agents
- Manage number pool lifecycle ourselves

### 3. User Authentication/Management

**Gap**: No user management in 11Labs.

**Impact**: Expected - Not 11Labs' responsibility.

**Solution**: Build standard auth (JWT, sessions) ourselves.

### 4. Billing/Usage Metering

**Gap**: Cannot query per-tenant usage via API.

**Impact**: MEDIUM - Needed for billing.

**Solution**:
- Track conversations per tenant in our DB
- Use conversation duration for usage calculation
- Query 11Labs account usage for overall billing

### 5. Knowledge Base Isolation

**Gap**: Knowledge base appears workspace-scoped, not agent-scoped.

**Impact**: LOW - Can work around via document-agent association.

**Solution**:
- Upload documents to 11Labs knowledge base
- Track `document_id → tenant_id` mapping
- Only attach relevant document IDs to each agent's config

### 6. Admin Dashboard APIs

**Gap**: No admin-specific endpoints for platform management.

**Impact**: Expected - Must build ourselves.

**Solution**: Build admin APIs using 11Labs primitives + our DB.

---

## Concurrency & Pricing Considerations

### Concurrency Limits

| Plan | Concurrent Calls | Notes |
|------|------------------|-------|
| Free/Starter | Low | Not suitable for production |
| Pro | Higher | Check specific plan |
| Enterprise | Custom | Contact sales |

- **Burst Pricing**: Can exceed limit by 3x at 2x cost
- **Max Burst**: 300 concurrent (non-enterprise)
- **No agent limit**: Unlimited agents on all plans

### Pricing Model
- Pay per minute of conversation
- Credits system
- Enterprise plans available for high volume

---

## Architecture Recommendation

```
┌─────────────────────────────────────────────────────────────────┐
│                     VoxCalls Platform                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │   Next.js       │    │   FastAPI       │                     │
│  │   Dashboard     │◄──►│   Backend       │                     │
│  │   (Frontend)    │    │   (API)         │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                               │
│                    ┌─────────────┼─────────────┐                │
│                    ▼             ▼             ▼                │
│              ┌─────────┐   ┌─────────┐   ┌─────────┐            │
│              │Postgres │   │ElevenLabs│   │ Twilio  │            │
│              │  (our   │   │   API    │   │  (only  │            │
│              │ tenant  │   │ (voice,  │   │ phone   │            │
│              │  data)  │   │  agents) │   │numbers) │            │
│              └─────────┘   └─────────┘   └─────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### What We Build
1. **Multi-tenant data layer** (PostgreSQL)
   - Users, tenants, roles, permissions
   - Resource mappings (agent_id, document_id, phone_number_id)
   - Call/conversation metadata mirror

2. **API wrapper layer** (FastAPI)
   - Tenant-scoped endpoints
   - Authorization/authentication
   - Resource mapping and isolation

3. **Phone number management** (Twilio integration)
   - Purchase numbers
   - Pool management
   - Import to 11Labs

4. **Dashboard** (Next.js)
   - Agent configuration UI
   - Knowledge base management
   - Call history viewer
   - Admin panel

### What 11Labs Provides
1. Voice AI engine (STT → LLM → TTS)
2. Agent conversation handling
3. Knowledge base/RAG
4. Webhook/tool execution
5. Call recording and transcripts
6. Phone number ↔ agent routing

---

## Migration from Original VoxCalls Architecture

### Components to REMOVE
- LiveKit (WebRTC infrastructure)
- Deepgram direct integration
- ElevenLabs TTS direct integration
- Pinecone (RAG vector database)

### Components to KEEP
- Twilio (phone numbers only)
- PostgreSQL (our multi-tenant data)
- Redis (optional, for caching)
- Next.js dashboard (redesign for wrapper)

### Components to ADD
- ElevenLabs API integration layer
- Resource mapping system
- Simplified architecture

---

## Conclusion

**Building VoxCalls as an 11Labs wrapper is viable.**

The 11Labs Conversational AI API provides comprehensive coverage for:
- Agent creation and configuration
- Knowledge base management
- Voice conversations
- Call recording and transcripts
- Webhook integrations

**What we must build ourselves:**
1. Multi-tenant isolation (database + API layer)
2. User authentication and management
3. Phone number lifecycle (via Twilio)
4. Admin dashboard
5. Usage tracking and billing

**Benefits of this approach:**
- Simpler architecture (no LiveKit, Deepgram, Pinecone)
- Faster time to market
- Leverage 11Labs' optimized voice pipeline
- Automatic improvements as 11Labs updates

**Risks:**
- Dependency on 11Labs pricing and availability
- Less control over voice pipeline internals
- Concurrency limits may require enterprise plan
