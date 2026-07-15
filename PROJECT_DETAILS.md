# LeadPilot AI — Master Project Handoff Document

> **Document type:** Technical Bible / Master Handoff
> **Audience:** A senior engineer joining the project for the first time
> **Scope:** The entire `LeadPilot AI` monorepo at `C:\Users\Vedhas\Desktop\Projects\LP 2\LeadPilot-AI`
> **Grounding:** Every statement in this document is derived from reading the actual source code (`apps/web`, `apps/widget`, `apps/agent`, `packages/*`), the Prisma schema, the environment configuration, and the git history. No features are invented; limitations are real and traced to specific files/lines.
> **Companion file:** `AGENTS.md` (work-state memory) and `README.md` (short intro). This document supersedes both for architecture understanding.

---

# LeadPilot AI

## Project Overview

LeadPilot AI is a **B2B SaaS platform that turns a company's website into an intelligent, AI-driven lead-capture and sales-assist system**. A visitor to a customer's website interacts with an embedded chat widget (or voice agent). The widget answers questions using the customer's own knowledge base (Retrieval-Augmented Generation), while an internal "AI Operating System" (AI OS) continuously profiles the visitor, scores the lead, decides the best sales strategy, and records a structured intelligence trail. That intelligence is persisted durably and then surfaced to the customer's sales team through a CRM, an Analytics suite, and a live Dashboard.

The product sits at the intersection of three classic categories:

- **Conversational AI / RAG chatbot** (the public widget)
- **Sales Intelligence / CRM** (the internal dashboard)
- **Analytics** (trends, funnels, engagement, journey)

## Vision

"Every website visitor is a potential customer. Most leave without a trace. LeadPilot AI makes the website itself a 24/7 sales agent that understands the visitor, qualifies them in real time, and hands the sales team a fully-enriched, prioritized lead — automatically."

The long-term vision is a **fully autonomous sales co-pilot** embedded on every SMB/enterprise website: chat + voice, multi-channel knowledge, autonomous lead scoring, and a CRM that writes itself from conversation intelligence.

## Goal of the Project

1. Let any business embed a smart chat widget on their site in minutes (one `<script>` tag).
2. Answer visitor questions accurately using the business's own content (RAG).
3. Silently build a rich profile of every visitor (memory, intent, pain points, goals).
4. Continuously score and qualify each lead (Cold / Warm / Hot) using deterministic, explainable heuristics.
5. Persist all intelligence so it survives restarts and is queryable.
6. Give the business owner a CRM + Analytics + Dashboard that reads that intelligence — no manual data entry.

## What Problem It Solves

| Problem | How LeadPilot AI Solves It |
|---|---|
| Websites get traffic but few conversions | A proactive AI widget engages every visitor and captures intent |
| Visitors ask the same questions repeatedly | RAG answers from the company's knowledge base automatically |
| Sales teams don't know who is hot | Real-time lead scoring + qualification from conversation signals |
| Lead data is manual and incomplete | AI OS auto-extracts name/email/phone, pain points, goals |
| No single view of visitor journey | Persisted timeline + CRM + analytics over all conversations |
| "Chatbots" feel dumb | Goal/Strategy/Action/Sales-Brain engines choose *how* to respond, not just *what* |
| Knowledge lives in many places | TEXT, URL crawl, DOCUMENT upload, and SOCIAL ingestion unify into one vector store |

---

# High Level Architecture

## Conceptual Flow

```
                          ┌─────────────────────────────────────────────┐
                          │                 EXTERNAL SITE                │
                          │   <script src="/widget.js" data-client-id>   │
                          └───────────────┬─────────────────────────────┘
                                          │ visitor message
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   WIDGET (React in Shadow DOM)                    │
│   /widget-dist/widget.js  ──►  config ──► start conversation ──► chat/voice       │
└───────────────┬───────────────────────────────────────────────────────────────────┘
                │ POST /api/widget/chat  (origin-checked)
                ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                     API LAYER (Next.js Route Handlers)             │
│   app/api/widget/chat/route.ts                                                  │
│     1. findProjectByClientId + isOriginAllowed (domain lock)                     │
│     2. chunkCount gate (project must have knowledge)                             │
│     3. getConversationHistory (from Message table)                               │
│     4. getRagReply(): retrieveRelevantChunks() ──► Groq LLM ──► structured JSON  │
│     5. mergeMemoryUpdates() (conversation-memory)                                │
│     6. runAIOS(): the full AI engine pipeline  (see AI OS section)               │
│     7. persistConversation()  (swallow-catch)                                    │
│     8. saveChatTurn()  (Message rows USER + ASSISTANT)                           │
│     9. extractLeadInfo() ──► upsert Lead row                                     │
└───────────────┬───────────────────────────┬──────────────────────────────────────┘
                │                            │
                ▼                            ▼
┌───────────────────────────┐   ┌──────────────────────────────────────────────┐
│     RAG / KNOWLEDGE        │   │            AI OS (in-memory engines)           │
│  embeddings (Gemini 3072)  │   │  memory → lead-scoring → conversation-intel →  │
│  pgvector cosine search   │   │  goal → strategy → action → sales-brain →      │
│  KnowledgeChunk table     │   │  crm-profile → analytics → timeline             │
└─────────────┬─────────────┘   └───────────────────┬──────────────────────────┘
              │                                       │
              ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER (intelligence-store.ts)                    │
│   ConversationIntelligence · LeadProfile · BusinessProfile ·                     │
│   AnalyticsSnapshot · TimelineEvent   (all keyed by conversationId)              │
└───────────────┬─────────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│   CRM  (lib/crm/*)                ANALYTICS (lib/analytics/*)     DASHBOARD UI    │
│   getEnrichedLeads/Conversations  getAnalytics()                  app/dashboard    │
│   getActivityFeed                 overview/leads/conversations    components/crm   │
│   getLiveDashboard                knowledge/journey/engagement    components/analytics
│   searchCRM                                                                       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Voice Variant

```
Widget (voice mode) ──► POST /api/voice/token ──► LiveKit room + AgentDispatch
                                                   │
                                                   ▼
                                        apps/agent (LiveKit agent, OpenAI Realtime)
                                                   │  per turn
                                                   ▼
                                        GET /api/voice/agent-config
                                        POST /api/voice/rag-context  (RAG)
                                                   │  on disconnect
                                                   ▼
                                        POST /api/voice/webhook  (transcript → Lead + VoiceMessage)
```

## Layered Summary

| Layer | Implementation | Key files |
|---|---|---|
| **Frontend (public)** | React widget in Shadow DOM, Vite IIFE bundle | `apps/widget/src/main.tsx`, `apps/web/public/widget.js` |
| **Frontend (app)** | Next.js App Router dashboard/CRM/analytics | `apps/web/app/**` |
| **Backend / API** | Next.js Route Handlers | `apps/web/app/api/**` |
| **Database** | PostgreSQL + Prisma 7 + pgvector | `apps/web/prisma/schema.prisma` |
| **AI Layer** | Groq (chat) + Gemini (embeddings) | `app/api/widget/chat/route.ts`, `lib/embeddings.ts` |
| **RAG** | pgvector cosine search over KnowledgeChunk | `lib/retrieval.ts` |
| **Widget host** | Served statically from Next origin | `apps/web/public/widget-dist/widget.js` |
| **CRM** | Read-only aggregation over persisted intelligence | `apps/web/lib/crm/*` |
| **Analytics** | Pure metric calculators over persisted intelligence + Message table | `apps/web/lib/analytics/*` |
| **Persistence** | Durable Prisma records replacing in-memory Maps | `apps/web/lib/intelligence-store.ts` |
| **AI OS** | Deterministic pure orchestrator of 11 engines | `apps/web/lib/ai-os.ts` |

---

# Tech Stack

## Frameworks & Runtime

| Concern | Technology | Version / Notes |
|---|---|---|
| Monorepo | npm workspaces + Turborepo | Turbo `^2.10.4` |
| Web framework | Next.js (App Router) | `14.2.35` |
| React | React 18 | `18.3.1` |
| Widget build | Vite (library/IIFE mode) | Outputs one self-contained `widget.js` |
| Language | TypeScript (strict) | `5.5.4` |
| Voice agent runtime | Node + `@livekit/agents` | Separate `apps/agent` package |

## Libraries (selected)

| Purpose | Library |
|---|---|
| ORM | `@prisma/client` `^7.8.0` |
| Prisma adapters | `@prisma/adapter-pg`, `@prisma/adapter-neon` |
| DB driver | `pg` |
| Vector search | `pgvector` (via raw SQL `::vector`) |
| Auth | `@supabase/ssr`, `@supabase/supabase-js` |
| LLM (chat) | `groq-sdk`, `@ai-sdk/groq`, `ai` |
| Embeddings | `@google/genai` (Gemini) |
| Voice | `livekit-server-sdk`, `@livekit/agents`, `@livekit/agents-plugin-openai` |
| Web crawl | `cheerio` |
| Doc parse | `pdf-parse`, `mammoth` |
| Validation | `zod` |
| Styling | Tailwind CSS `3.4.7`, `clsx`, `tailwind-merge` |
| Icons | `lucide-react` |
| Dates | `date-fns` |
| Serverless helpers | `@vercel/functions` (`waitUntil`) |

## Database

- **PostgreSQL** hosted on **Supabase** (pooled `DATABASE_URL` + direct `DIRECT_URL`).
- **pgvector** extension for `vector(3072)` embeddings.
- Prisma 7 in "adapter" mode (no `url` in datasource — supplied via `prisma.config.ts`).

## Hosting

- **Vercel** (`NEXT_PUBLIC_APP_URL = https://leadpilot-ai-beryl.vercel.app`).
- Voice agent (`apps/agent`) is a separate long-running worker (LiveKit dispatch).

## Authentication

- **Supabase Auth** (email/password; OAuth landing via `/auth/callback`). SSO buttons on the login UI are **placeholders** (`components/auth/auth-shell.tsx` `e.preventDefault()`).

## AI Providers

| Capability | Provider | Model |
|---|---|---|
| Chat / RAG reply | Groq | `llama-3.3-70b-versatile` |
| Embeddings | Google Gemini | `gemini-embedding-2` (3072-dim) |
| Voice agent LLM | OpenAI Realtime | `alloy` voice, used only in `apps/agent` |

## Embeddings

- Model `gemini-embedding-2` via `@google/genai`, default output dimension **3072** (matches `vector(3072)`).
- No `outputDimensionality` set — relies on the model default.

## ORM

- Prisma 7.8 client generated into `node_modules/.prisma/client`.
- Single shared client via `getSharedPrismaClient()` (`lib/prisma.ts`) keyed to `globalThis`.
- Adapter selection: `PrismaNeon` if connection string matches `neon`/`pooler.neon`, else `PrismaPg` (both `max: 3`).

## Styling

- Tailwind CSS 3.4, Inter font, shared `packages/ui` `Button`, `packages/types` types, `lucide-react` icons.

## Build Tools

- `turbo dev/build/lint/typecheck`; `next build` (with `prisma generate`); `tsc --noEmit` for typecheck.
- `npm run lint` is currently **non-functional** (ESLint interactive prompt) — see Limitations.

---

# Folder Structure

```
LeadPilot-AI/
├── apps/
│   ├── web/                      # Next.js app (the product)
│   │   ├── app/                  # App Router pages + API routes
│   │   │   ├── api/              # ALL backend endpoints
│   │   │   │   ├── analytics/    # GET analytics report
│   │   │   │   ├── auth/         # bootstrap (workspace provisioning)
│   │   │   │   ├── conversations/# CRM conversation list + detail
│   │   │   │   ├── crm/          # dashboard / activity / search
│   │   │   │   ├── dashboard/    # workspace overview counts
│   │   │   │   ├── knowledge/    # sources / ingest / crawl / upload / social
│   │   │   │   ├── leads/        # lead list + detail (PATCH status/score)
│   │   │   │   ├── projects/     # project CRUD + settings
│   │   │   │   ├── voice/        # token / agent-config / rag-context / webhook
│   │   │   │   └── widget/       # config / conversation/start / chat
│   │   │   ├── analytics/        # global analytics page
│   │   │   ├── auth/             # callback
│   │   │   ├── billing/          # "Coming Soon"
│   │   │   ├── dashboard/        # workspace home
│   │   │   ├── integrations/     # "Coming Soon"
│   │   │   ├── leads/            # leads page
│   │   │   ├── login/ signup/ settings/
│   │   │   └── projects/         # project overview/analytics/conversations/leads/kb/settings
│   │   ├── components/           # analytics/ auth/ crm/ layout/ popups/ projects/ ui/ widget-settings
│   │   ├── lib/                  # ALL business logic (see below)
│   │   ├── prisma/               # schema + migrations + seed
│   │   ├── public/               # widget.js loader, widget-dist/ bundle, Images, cdn
│   │   └── scripts/              # seed-conversations, check-analytics, clear-data
│   ├── widget/                   # Vite-built embeddable widget (React)
│   │   └── src/                  # main.tsx, dock-style, fusion template, etc.
│   └── agent/                    # LiveKit voice agent (separate worker)
│       └── src/agent.ts
├── packages/
│   ├── types/                    # shared wire/types: ApiResponse, WidgetConfig, BotObjective
│   ├── ui/                       # shared React Button
│   └── config/                   # eslint + tsconfig.base
├── public-cdn/                   # alternate widget CDN build
├── test-site/                    # local test harness
├── turbo.json / package.json / README.md / AGENTS.md
```

## Key `apps/web/lib` modules

| Path | Responsibility |
|---|---|
| `lib/ai-os.ts` | The AI OS orchestrator (`runAIOS`) |
| `lib/ai-response.ts` | LLM JSON contract, Zod schemas, safe parser |
| `lib/action-engine.ts` | Next-best-action engine |
| `lib/goal-engine.ts` | Current-goal decision engine |
| `lib/strategy-engine.ts` | Communication-strategy engine |
| `lib/sales-brain.ts` | Central sales-mission decision maker |
| `lib/lead-scoring.ts` | Lead score/qualification engine |
| `lib/conversation-intelligence.ts` | Conversation intelligence builder |
| `lib/conversation-memory.ts` | Per-conversation memory manager |
| `lib/crm-intelligence.ts` | Business profile + CRM profile builders |
| `lib/analytics-intelligence.ts` | Analytics snapshot builder |
| `lib/timeline-engine.ts` | Timeline event builder |
| `lib/objectives.ts` | Objective catalog + resolution |
| `lib/intelligence-store.ts` | **Durable persistence** of all 5 intelligence models |
| `lib/embeddings.ts` | Gemini embedding adapter |
| `lib/chunker.ts` | Text chunking/cleaning |
| `lib/retrieval.ts` | pgvector RAG retrieval |
| `lib/crawler.ts` | Website crawler |
| `lib/document-extractor.ts` | PDF/DOCX/TXT text extraction |
| `lib/social-ingest.ts` | Social knowledge ingestion |
| `lib/knowledge-ingest.ts` | URL ingestion + brand extraction |
| `lib/brand-extract.ts` | Heuristic brand color/logo extraction |
| `lib/lead-extractor.ts` | Regex lead PII extraction |
| `lib/setup-pgvector.ts` | pgvector extension + index setup |
| `lib/widget-store.ts` | Widget data layer (project/conversation/message) |
| `lib/validate-origin.ts` | Widget domain-lock check |
| `lib/prisma.ts` | Shared Prisma client + adapter selection |
| `lib/api-response.ts` | `ok()` / `fail()` / CORS helpers |
| `lib/auth.ts` | Workspace resolution helpers |
| `lib/supabase/*` | Supabase client factories + middleware |
| `lib/analytics/*` | Analytics calculators (overview/leads/conversations/knowledge/journey/engagement/summary/messages) |
| `lib/crm/*` | CRM aggregation (dashboard/leads/conversations/activity/search/intelligence/types) |

---

# Database

The Prisma schema lives at `apps/web/prisma/schema.prisma`. The datasource declares `provider = "postgresql"` with **no `url`/`directUrl`** (Prisma 7 forbids it); the URL is supplied by `prisma.config.ts` (`DIRECT_URL`/`DATABASE_URL`).

## Core / Auth Models

### `User`
- `id` (cuid), `email` (unique), `name?`, `createdAt`, `updatedAt`, `workspaces: WorkspaceMember[]`.
- The human account (Supabase auth user mirrored into the app DB).

### `Workspace`
- `id`, `name`, `members: WorkspaceMember[]`, `projects: Project[]`.
- A tenant. Created on first login ("`<name>'s Workspace`").

### `WorkspaceMember`
- Join table `workspaceId`, `userId`, `role: Role` (default `MEMBER`), `@@unique([workspaceId, userId])`.
- **Important:** Although `Role` enum exists (OWNER/ADMIN/MEMBER/VIEWER), **no route enforces the role value** — every protected route only checks that a `WorkspaceMember` row exists. See Limitations.

### `Project`
- `id`, `workspaceId` (FK), `name`, `siteUrl`, `clientId` (unique cuid — the public widget identifier), `widgetConfig: Json` (default `"{}"`), relations to `conversations`, `voiceConversations`, `leads`, `sources`, `chunks`.
- A customer website / widget instance. The `clientId` is what the embed script passes to `/api/widget/*`.

## Conversation / Messaging

### `Conversation`
- `id`, `projectId` (FK), `visitorId` (string), `createdAt`, `messages: Message[]`.
- One chat session between a visitor and the widget.

### `Message`
- `id`, `conversationId` (FK), `role: MessageRole`, `content`, `createdAt`.
- `MessageRole` enum = `USER | ASSISTANT` (stored **uppercase** as string literals).
- `saveChatTurn` writes one `USER` row + one `ASSISTANT` row per turn (`lib/widget-store.ts:199,206`).
- `getConversationHistory` down-shifts `ASSISTANT → "assistant"`, `USER → "user"` for the LLM.

### `VoiceConversation`
- `id`, `projectId`, `visitorId`, `roomName` (unique), `duration?`, `status` (default `"active"`), `messages: VoiceMessage[]`.
- Created when a voice call starts (`/api/voice/token`).

### `VoiceMessage`
- `id`, `voiceConversationId`, `role: String` (plain lowercase `"user"`/`"assistant"` — **not** the enum), `content`, `createdAt`.

## Lead

### `Lead`
- `id`, `projectId`, `visitorId`, `conversationId`, `name?`, `email?`, `phone?`, `score: LeadScore` (default `COLD`), `status: LeadStatus` (default `NEW`), `source: LeadSource` (default `CHAT`), `createdAt`, `updatedAt`.
- `@@unique([projectId, visitorId])` — the de-dup key. Upserted from chat (`extractLeadInfo`) and voice webhook.
- `LeadScore` enum: `HOT | WARM | COLD | SPAM`.
- `LeadStatus` enum: `NEW | CONTACTED | QUALIFIED | WON | LOST`.
- `LeadSource` enum: `CHAT | FORM | MANUAL`.

> **Note:** The `Lead` table holds only *hard* PII and the Prisma enums. All *qualitative* lead intelligence (score reasons, qualification text, pain points, goals, recommended action, business profile, timeline) lives in the **intelligence persistence models** below — `Lead` is never duplicated.

## Knowledge Base

### `KnowledgeSource`
- `id`, `projectId`, `type: SourceType`, `name`, `content: Text`, `status: SourceStatus` (default `PROCESSING`), `createdAt`, `updatedAt`, `chunks: KnowledgeChunk[]`.
- `SourceType` enum: `TEXT | DOCUMENT | URL | SOCIAL`.
- `SourceStatus` enum: `PROCESSING | READY | FAILED`.
- One source produces many chunks.

### `KnowledgeChunk`
- `id` (override `crypto.randomUUID()` in raw inserts), `projectId`, `sourceId`, `content: Text`, `embedding Unsupported("vector(3072)")?`, `metadata: Json` (default `"{}"`), `createdAt`.
- The embedding vector for RAG. Indexed by `ivfflat` on `vector_cosine_ops`, `lists = 100` (`lib/setup-pgvector.ts`).

## Durable Intelligence Persistence

These five models replace the legacy in-memory Maps. **`conversationId` is the shared relationship key.** They store *only* AI-generated intelligence; the base `Conversation`/`Lead` are never duplicated.

### `ConversationIntelligence`
- `conversationId` (PK, String), `projectId?`, `data: Json`, `createdAt`, `updatedAt`, `@@index([projectId])`.
- `data` shape (`ConversationIntelligenceRecord`): `summary`, `visitorSummary`, `businessSummary`, `painPoints[]`, `goals[]`, `interests[]`, `productsDiscussed[]`, `objections[]`, `positiveSignals[]`, `negativeSignals[]`, `nextRecommendedStep`, `conversationQuality` ("Excellent"/"Good"/"Fair"/"Poor"), `engagementScore` (0-100).

### `LeadProfile`
- `conversationId` (PK), `projectId?`, `data: Json`, `createdAt`, `updatedAt`, `@@index([projectId])`.
- `data` shape (`LeadProfileRecord`): `leadScore`, `qualification`, `scoreReasons[]`, `completedObjectives[]`, `pendingObjectives[]`, `visitorStage?`, `currentGoal`, `currentStrategy`, `recommendedAction`, `currentMission`, `confidence`.

### `BusinessProfile`
- `conversationId` (PK), `projectId?`, `data: Json`, `createdAt`, `updatedAt`, `@@index([projectId])`.
- `data` shape (`BusinessProfileRecord`, wider than the in-memory `BusinessProfile`): `industry?`, `businessType?`, `services?`, `company?`, `location?`, `products?`, `communicationStyle?`, `technicalLevel?`.

### `AnalyticsSnapshot`
- `conversationId` (PK), `projectId?`, `data: Json`, `updatedAt`, `@@index([projectId])`.
- `data` shape (`AnalyticsRecord` = all-history series): `leadTrend[]`, `qualificationHistory[]`, `engagementHistory[]`, `conversationQualityHistory[]`, `goalProgressHistory[]`.

### `TimelineEvent`
- `id` (cuid), `conversationId`, `projectId?`, `event`, `description`, `category` (String), `importance` (Int, default 1), `timestamp` (DateTime), `createdAt`.
- `@@unique([conversationId, event, description])` — dedupe key.
- `@@index([conversationId])`, `@@index([projectId])`.
- Append-only: never updated or deleted, only `createMany` with `skipDuplicates`.

---

# APIs

All routes return the envelope `{ success: boolean, data?, error? }` from `lib/api-response.ts`, with `Access-Control-Allow-Origin: *`, methods `GET,POST,OPTIONS`, allowed header `Content-Type`. Every route exports an `OPTIONS` handler returning `204`.

Auth model:
- **Public (origin-checked):** `app/api/widget/*`, `app/api/voice/*` — bypass `middleware.ts`, authenticated by `clientId` + `isOriginAllowed`.
- **Protected (Supabase):** `analytics`, `auth/bootstrap`, `conversations`, `crm/*`, `dashboard`, `knowledge/*` (except ownership gaps, see Limitations), `leads`, `projects` — require `supabase.auth.getUser()` and a `WorkspaceMember` row for the workspace.

## Widget APIs (public)

### `POST /api/widget/chat`
- **Purpose:** Core RAG chat turn. Returns only `{ conversationId, reply }` to the widget.
- **Request:** `{ clientId, conversationId, message, visitorId }` (Zod-validated).
- **Flow:** origin check → `chunkCount > 0` gate → `getConversationHistory` → `getRagReply` (retrieve + Groq JSON) → memory merge → `runAIOS` → `persistConversation` (swallow-catch) → `saveChatTurn` → `extractLeadInfo` upsert Lead.
- **Files:** `app/api/widget/chat/route.ts`, `lib/ai-os.ts`, `lib/retrieval.ts`, `lib/widget-store.ts`, `lib/intelligence-store.ts`.
- **Auth:** origin lock (`isOriginAllowed` vs `project.siteUrl`).
- **Used by:** the embeddable widget.

### `GET /api/widget/config?clientId=`
- **Purpose:** Return `WidgetConfig` for a `clientId`. Falls back to a demo config if project missing.
- **Files:** `app/api/widget/config/route.ts`, `lib/widget-store.ts:toWidgetConfig`.
- **Auth:** origin-checked.

### `POST /api/widget/conversation/start`
- **Purpose:** Create a `Conversation`, return `{ conversationId }`. Demo fallback `demo-conv-<uuid>` if no project.
- **Request:** `{ clientId, visitorId }`.
- **Files:** `app/api/widget/conversation/start/route.ts`, `lib/widget-store.ts:createConversation`.

> **No** `GET /api/widget/conversation` route exists. History is reconstructed server-side per turn from the `Message` table; the widget UI does not re-hydrate prior turns on reload.

## Voice APIs (public, used by LiveKit agent)

### `POST /api/voice/token`
- **Request:** `{ clientId, visitorId }`. Creates `VoiceConversation` + room, issues LiveKit `AccessToken` (ttl 10m), dispatches `leadpilot-agent`.
- **Returns:** `{ token, roomName, voiceConversationId }`.
- **Files:** `app/api/voice/token/route.ts`, `apps/agent/src/agent.ts`.

### `GET /api/voice/agent-config?roomName=`
- Returns `{ projectId, botName, systemPrompt, welcomeMessage }` from `widgetConfig`.

### `POST /api/voice/rag-context`
- **Request:** `{ projectId, query }`. Returns `{ context }` from `retrieveRelevantChunks(projectId, query, 5)`.

### `POST /api/voice/webhook`
- **Request:** `{ roomName, transcript:[{role,content}], duration }`. Marks `VoiceConversation` completed, stores `VoiceMessage`s, upserts `Lead` from user turns.

## Knowledge APIs (protected)

### `GET /api/knowledge/sources?projectId=`
- Lists sources with chunk `_count`. **GET/DELETE only check `getUser()`; no workspace ownership check** (see Limitations).
- **DELETE ?id=** deletes source + chunks.

### `POST /api/knowledge/ingest`
- Body `{ projectId, type:"TEXT"|"URL", name, content }`. Chunks+embeds `content` (a `URL` type here embeds literal text, it does **not** crawl).

### `POST /api/knowledge/crawl`
- Body `{ projectId, url, name }`. Crawls site (`crawlUrl`), chunks+embeds.

### `POST /api/knowledge/upload`
- `multipart/form-data` `{ file, projectId, name }`. PDF/DOCX/TXT ≤10MB. Extracts text, chunks+embeds.

### `POST /api/knowledge/social`
- Body `{ projectId, platform, content, profileUrl?, name? }`. Ingests social bio/post text with attribution prefix.

## Auth / Workspace APIs

### `POST /api/auth/bootstrap`
- Requires Supabase user. In a transaction: upsert `User`, create `Workspace` ("`<name>'s Workspace`") + `WorkspaceMember` OWNER if none exists. Called from login/signup forms.

## Conversations APIs (protected)

### `GET /api/conversations`
- Paginated raw-SQL join of `Conversation`/`Project`/`Lead`/latest-message/message-count, with `search` + `dateRange` (today/7d/30d/all). Each enriched with `getPersistedIntelligence`.

### `GET /api/conversations/[id]`
- Full conversation + messages + lead + `getPersistedIntelligence`. Workspace-guarded.

## CRM APIs (protected)

### `GET /api/crm/dashboard?projectId=`
- `getLiveDashboard({workspaceId, projectId})`. The CRM live aggregator.

### `GET /api/crm/activity?projectId=&limit=`
- `getActivityFeed` — flat activity stream from the append-only timeline.

### `GET /api/crm/search?q=&projectId=`
- `searchCRM` — substring match across persisted intelligence + messages.

## Leads APIs (protected)

### `GET /api/leads`
- `getEnrichedLeads` with 14 intelligence filters + pagination.

### `GET /api/leads/[id]` / `PATCH /api/leads/[id]`
- Lead detail (with intelligence) + PATCH `{ status?, score? }`.

## Projects APIs (protected)

### `POST /api/projects`
- Creates project + workspace auto-provisioning; if `siteUrl` present, fires background crawl + brand extraction via `waitUntil`.

### `DELETE /api/projects/[id]`, `GET|PUT|PATCH /api/projects/[id]/settings`
- Project deletion; widget config read/update (`botName`, `color`, `welcomeMessage`, `mode`, `template`, `objectives`, `brand`, etc.).

## Analytics / Dashboard APIs (protected)

### `GET /api/analytics?projectId=&range=`
- `getAnalytics({projectId, range})` → `AnalyticsReport`. The single analytics endpoint.

### `GET /api/dashboard`
- Workspace overview counts (conversations/messages/leads/projects/knowledgeSources), 7-day trends, recent conversations/leads/activity. **Reads only base tables, not the intelligence layer.**

---

# Widget

## How the widget is built, bundled, and embedded

1. **Loader** `apps/web/public/widget.js` (plain IIFE, no build): reads `data-client-id`, `data-api-url`, `data-widget-src` from its own `<script>` tag, sets `window.__LEADPILOT_CONFIG__`, creates `#leadpilot-widget-container` with a **Shadow DOM**, and injects the real bundle `<script src="{apiUrl}/widget-dist/widget.js">`.
2. **Bundle** `apps/widget/src/main.tsx` → Vite **IIFE** (`formats:["iife"]`, global `LeadPilotWidget`), output `apps/web/public/widget-dist/widget.js` (one minified self-contained file, React bundled in, `cssCodeSplit:false`, `inlineDynamicImports:true`).
3. **Mount:** `window.LeadPilotWidget.mount({ root: shadow, clientId, apiUrl })` renders a React `<Widget>` inside Shadow DOM. `:host { all: initial }` isolates host-page CSS.
4. **Embed snippet** (generated for the customer in `widget-settings-client.tsx` / `embed-snippet-selector.tsx`):
   ```html
   <script async src="{ORIGIN}/widget.js"
           data-client-id="{PROJECT_CLIENT_ID}"
           data-api-url="{ORIGIN}"
           data-widget-src="{ORIGIN}/widget-dist/widget.js"></script>
   ```
5. **No iframe, no external CDN required** — served from the same Next.js origin's `/public`. `middleware.ts` excludes `widget.js`/`widget-dist` from auth.

## Chat flow (end-to-end)

1. Visitor loads page → loader injects bundle → `<Widget>` mounts.
2. `useEffect` → `GET /api/widget/config?clientId=` → sets `config` + welcome message (client-generated from `config.welcomeMessage`).
3. On open (non-voice, no `conversationId` yet) → `POST /api/widget/conversation/start` → stores `conversationId`.
4. Send → `POST /api/widget/chat` with `{ clientId, conversationId, visitorId, message }`.
5. Server (see chat route): origin → chunk gate → history → `getRagReply` (Groq) → memory merge → `runAIOS` → `persistConversation` (swallowed) → `saveChatTurn` → lead upsert.
6. Widget receives **only** `{ conversationId, reply }`. **The reply is NOT streamed** — it is a single buffered JSON object (no SSE / ReadableStream). A typing indicator is shown while awaiting the response.

## Voice flow

- `startVoiceCall` → `POST /api/voice/token` → `Room.connect(livekitUrl, token)` → publish local audio track.
- LiveKit dispatches `leadpilot-agent` (`apps/agent/src/agent.ts`), which uses **OpenAI Realtime** and pulls RAG context per turn from `/api/voice/rag-context`, then POSTs the transcript to `/api/voice/webhook` on disconnect.
- Voice stack is **LiveKit + OpenAI Realtime**, with a self-POST webhook (no Twilio).

## Conversation creation & visitorId

- `visitorId` generated **client-side** (`crypto.randomUUID()` in `localStorage["leadpilot_visitor_id"]`), stable for the widget's life, reused across sessions.
- `conversationId` created server-side; demo fallback `demo-conv-<uuid>` when no project.

## Conversation history

- The widget UI shows only the welcome message + messages of the current session (held in React state).
- The server reconstructs multi-turn context per request via `getConversationHistory(conversationId)` reading the `Message` table (last 20, `MAX_HISTORY_MESSAGES`). So context survives reloads at the DB level, but the widget UI resets on reload.

## Streaming

- **Not implemented.** Responses are buffered and returned as one JSON object. (See Limitations.)

## Memory

- Per-conversation memory (`conversation-memory.ts`) is an **in-memory `Map`** keyed by `conversationId`. The LLM returns `memoryUpdates`; `mergeMemoryUpdates` strips transient reasoning keys, never overwrites with empty values, and de-dupes arrays. `buildMemorySummary` injects a "KNOWN VISITOR INFORMATION" block into the system prompt. (Not yet backed by DB — see Limitations.)

## RAG

- `getRagReply` calls `retrieveRelevantChunks(projectId, message)` (topK=5 cosine), then builds a system prompt from objective instructions + retrieved chunks + memory summary + the structured-response instruction, and calls Groq `llama-3.3-70b-versatile` with `response_format: json_object`, `max_tokens: 700`, `temperature: 0.3`.

## Reply generation

- The LLM returns a JSON object (`AIConversationResponse`): `reply` (the only text shown), plus optional `memoryUpdates`, `analysis`, `recommendation`, `leadScore`, `qualification`, `scoreReasons`, `actionEngine`, `conversationIntelligence`, `aiOS`. `parseAIResponse` never throws — on failure it returns the raw text as `reply`.

---

# Knowledge Base

## Sources

Four source types (`SourceType` enum): `TEXT`, `DOCUMENT`, `URL`, `SOCIAL`. Each `KnowledgeSource` has a `status` (`PROCESSING → READY | FAILED`).

## Chunks

Every source is cleaned (`cleanText`) and split (`chunkText`, default **800 words/chunk, 100-word overlap**, word-based, no sentence awareness) into `KnowledgeChunk` rows. Chunk id is a `crypto.randomUUID()` (raw insert bypasses Prisma's `cuid()` default).

## Embeddings

- `generateEmbedding(text)` → Google Gemini `gemini-embedding-2`, returns `number[]` (3072-dim).
- Each chunk is inserted via raw SQL with `embedding::vector` and `metadata::jsonb`.
- `generateEmbeddings` (plural) exists but is **dead code** (never called).

## Retrieval

- `retrieveRelevantChunks(projectId, query, limit=5)`: embeds the query with the same model, runs
  ```sql
  SELECT content FROM "KnowledgeChunk"
  WHERE "projectId" = $1
  ORDER BY embedding <=> $2::vector
  LIMIT $3
  ```
  returns `content` truncated to 1000 chars. **No similarity threshold** — top-5 returned regardless of relevance. Returns `[]` on error.

## Search

- RAG retrieval is the only "search" — cosine nearest-neighbor over the project's chunks. There is no keyword/BM25 search.

## How knowledge is used

- The chat route retrieves chunks for the visitor's message and injects them into the system prompt so Groq answers from the company's own content. The voice agent uses the same retrieval per turn.

## Ingestion summary by type

| Type | Entry route | Text acquisition | metadata stored |
|---|---|---|---|
| TEXT | `/knowledge/ingest` | `content` as-is | `{index, name}` |
| URL (text) | `/knowledge/ingest` (`type:"URL"`) | `content` as-is (**not crawled**) | `{index, name}` |
| URL (crawl) | `/knowledge/crawl` | `crawlUrl` multi-page | `{index, name, url, pagesVisited}` |
| DOCUMENT | `/knowledge/upload` | `extractTextFromBuffer` | `{index, name, filename}` |
| SOCIAL | `/knowledge/social` | pasted content + attribution prefix | `{index, name, platform, profileUrl?}` |

Brand extraction (`brand-extract.ts`) is triggered on project creation to pull `colors`/`logoUrl` into `widgetConfig.brand`.

---

# AI Architecture

The AI core is a set of **pure, deterministic engines** orchestrated by `runAIOS` in `lib/ai-os.ts`. They consume a conversation's memory, the LLM's `analysis`/`recommendation`, and configured objectives, and produce structured intelligence. **No engine calls an LLM** — the single LLM call happens in the chat route (`getRagReply`); everything after is deterministic computation.

## Engine catalogue

### 1. Conversation Memory Manager — `conversation-memory.ts`
- **Exists because:** The LLM is stateless; we need a durable per-conversation profile of the visitor that survives across turns and is injected into the prompt.
- **Does:** `getConversationMemory`, `mergeMemoryUpdates` (strips `TRANSIENT_KEYS` = intent/confidence/visitorStage/sentiment/recommendation/analysis; never overwrites with empty; de-dupes arrays), `buildMemorySummary` (the prompt block).
- **State:** in-memory `Map` (`memoryStore`). Backend-only by design.

### 2. Conversation Intelligence — `conversation-intelligence.ts`
- **Exists because:** We need a human-readable, structured summary of each conversation (pain points, goals, signals, next step, quality, engagement).
- **Does:** `buildConversationIntelligence` + `computeEngagementScore` (0-100 heuristic: message count + questions + known memory fields + intent interest − sentiment penalty).
- **Output:** `ConversationIntelligence` (summary, visitorSummary, businessSummary, painPoints, goals, interests, productsDiscussed, objections, positive/negativeSignals, nextRecommendedStep, conversationQuality, engagementScore).

### 3. Lead Scoring — `lead-scoring.ts`
- **Exists because:** Sales needs a single 0-100 score + Cold/Warm/Hot bucket per lead, with *explainable* reasons.
- **Does:** `evaluateLead` sums `SCORE_SIGNALS` deltas (business +15, pricing/implementation +10, pain +15, goals +15, email +20, phone +15, demo +20, contact +20, browsing −20, unrelated −30, spam −40), clamps 0-100; `qualify` maps ≤34 Cold / ≤69 Warm / else Hot; `evaluateObjectiveStatus` checks objective completion against memory fields.
- **Output:** `LeadEvaluation { score, qualification, scoreReasons[], completedObjectives[], pendingObjectives[] }`.

### 4. Goal Engine — `goal-engine.ts`
- **Exists because:** The bot must know its *current objective* each turn (greet, build trust, discover needs, offer demo, close, etc.).
- **Does:** `decideGoal` ranks 17 `GoalType`s best-first by sentiment/intent/recommendation/qualification/stage, returns top with `confidence` (clamped 20-100).
- **Output:** `GoalEngineOutput { goal, reason, confidence }`.

### 5. Strategy Engine — `strategy-engine.ts`
- **Exists because:** *How* to talk to the visitor matters (consultative vs. direct vs. urgent).
- **Does:** `decideStrategy` picks one of 11 `StrategyType`s via a decision tree (support → problem-solving → direct → consultative → relationship → advisory → soft-sell → educational → friendly → default consultative). Special-cases care/sensitive businesses.
- **Output:** `StrategyEngineOutput { strategy, reason }`.

### 6. Next-Best-Action Engine — `action-engine.ts`
- **Exists because:** The bot should propose the single best next action (offer demo, ask objective, continue helping) without repeating itself.
- **Does:** `decideAction` ranks `ActionType`s; uses an in-memory `recentActions` Map (last 5) to **guard against repeating offers** unless the conversation progressed.
- **Output:** `ActionEngineOutput { action, reason, confidence }`.

### 7. Sales Brain — `sales-brain.ts`
- **Exists because:** A single "current mission" must be derivable for the sales team / CRM.
- **Does:** `decideSalesMission` combines goal+strategy+lead+conversation+business into `currentMission` + `alternativeMission` + `confidence`. Logic e.g. Hot → "Close Conversation"; Offer* goal → that goal; Understand/Discover → "Understand Visitor".
- **Output:** `SalesBrainDecision { currentMission, reason, confidence, alternativeMission }`.

### 8. CRM Intelligence — `crm-intelligence.ts`
- **Exists because:** We need a lightweight business profile + a unified CRM profile shape that downstream persistence/CRM can consume.
- **Does:** `buildBusinessProfile` (type/industry/company/useCase from memory+analysis); `buildCrmProfile` (assembles lead+business+objectives+timeline+products+interests+goals+painPoints+objections+visitorStage+conversationSummary+recommendedAction+engagement+lastUpdated).
- **Note:** `CRMProfile` is an **intermediate** object — it is never persisted whole; `persistConversation` splits its fields across the lead/business/analytics records.

### 9. Analytics Intelligence — `analytics-intelligence.ts`
- **Exists because:** Dashboards need trend/history series (lead score over time, qualification progression, goal progress, journey).
- **Does:** `buildAnalyticsSnapshot` computes `goalProgress`, `visitorJourney`, intent/products/pain/objections, and records into in-memory `scoreHistory`/`qualificationHistory` Maps (last 20).
- **Output:** `AnalyticsSnapshot` (in-memory shape; persisted form is all-history arrays).

### 10. Timeline Engine — `timeline-engine.ts`
- **Exists because:** A chronological, append-only event log is the backbone of the CRM activity feed and journey analytics.
- **Does:** `buildTimelineEvents` emits `ConversationEvent[]` (journey/information/intent/qualification/action categories, importance 1-3) for milestones (started, shared name/email/phone/company/budget, asked pricing/features/booking, requested demo/contact, qualified warm/hot).
- **Output:** `ConversationEvent[]` — persisted append-only.

### 11. Objectives — `objectives.ts`
- **Exists because:** Each project is configured with objectives (lead-generation / customer-support / general-information) that drive the bot's behaviour and lead scoring.
- **Does:** `getConfiguredObjectives(widgetConfig)` resolves objectives (prefers structured `objectives`, falls back to legacy `questions`, then default catalog); `objectiveMemoryField` maps objective type → memory field proving completion.

### 12. Action Engine helper — also see above (6). The "Action Engine" referenced in the prompt maps to `action-engine.ts`.

### 13. Conversation State
- Represented simply as `state = { stage: analysis?.visitorStage }` inside `runAIOS` (not a separate file). `VisitorStage` ∈ greeting/researching/evaluating/considering_purchase/qualified/existing_customer.

### 14. AI Response Contract — `ai-response.ts`
- Defines the LLM JSON contract + Zod schemas + `buildStructuredResponseInstruction` (injected into the prompt) + `parseAIResponse` (never-throws parser). This is the *input* contract the engines consume.

## Complete execution flow (producer → consumer)

```
[LLM / Groq] getRagReply()
   │  system prompt: objectives + retrieved chunks + memory summary + structured-response instruction
   ▼
parseAIResponse(raw) → { reply, memoryUpdates?, analysis?, recommendation? }
   │  mergeMemoryUpdates(conversationId, memoryUpdates)
   ▼
runAIOS({ conversationId, history, memory, analysis, recommendation, configuredObjectives })
   │  ai-os.ts, in order:
   │   1. buildBusinessProfile            (crm-intelligence)
   │   2. evaluateLead                    (lead-scoring)   ← uses objectiveMemoryField
   │   3. buildConversationIntelligence   (conversation-intelligence)
   │   4. state = { stage }
   │   5. decideGoal                      (goal-engine)
   │   6. decideStrategy                  (strategy-engine) ← uses BusinessProfile
   │   7. decideAction                    (action-engine)   ← uses recentActions cache
   │   8. decideSalesMission              (sales-brain)     ← uses goal+strategy+lead+conversation+business
   │   9. buildCrmProfile                 (crm-intelligence)
   │  10. buildAnalyticsSnapshot          (analytics-intelligence) ← uses scoreHistory caches
   │  11. buildTimelineEvents             (timeline-engine)
   ▼
returns LeadPilotAIOS
   ├─► chat route copies selected fields onto `structured` (reply + leadScore + qualification
   │       + scoreReasons + completed/pendingObjectives + actionEngine + conversationIntelligence + aiOS)
   │       → Widget receives ONLY `structured.reply`
   └─► persistConversation(conversationId, aiOS, project.id)   (swallow-catch)
```

## Data passed between engines

The `LeadPilotAIOS` object is the unified hand-off:

```ts
interface LeadPilotAIOS {
  memory: ConversationMemory;            // conversation-memory
  business: BusinessProfile;              // crm-intelligence (type/industry/company/useCase)
  conversation: ConversationIntelligence; // conversation-intelligence
  lead: LeadEvaluation;                  // lead-scoring
  state: { stage?: string };
  goal: GoalEngineOutput;                // goal-engine
  strategy: StrategyEngineOutput;        // strategy-engine
  nextAction: ActionEngineOutput;        // action-engine
  salesDecision: SalesBrainDecision;     // sales-brain
  crm: CRMProfile;                       // crm-intelligence (intermediate)
  analytics: AnalyticsSnapshot;          // analytics-intelligence
  timeline: ConversationEvent[];         // timeline-engine
}
```

## Outputs

- **To the visitor:** only `reply`.
- **Backend-only:** memory, analysis, recommendation, lead score/qualification, score reasons, action engine, conversation intelligence, the full `aiOS`.
- **Persisted:** the five intelligence records (see Persistence Layer).

## Why each engine exists

Each engine isolates one decision so it is testable, explainable, and independently extendable. The orchestrator guarantees a fully-populated intelligence object even with empty memory/analysis (proven by the seed script with empty memory + undefined analysis).

---

# AI OS

## Dedicated section: `runAIOS()`

`apps/web/lib/ai-os.ts` is the **composition root** of the AI core.

### Input — `AIOSInput`
```ts
interface AIOSInput {
  conversationId: string;
  history: { role: "user" | "assistant"; content: string }[];
  memory: ConversationMemory;
  analysis?: ConversationAnalysis;
  recommendation?: ConversationRecommendation;
  configuredObjectives: BotObjective[];
}
```

### Processing — full pipeline (sequential, top-to-bottom in source)
1. `buildBusinessProfile(memory, analysis)` → `business`
2. `evaluateLead({ objectives, memory, analysis, recommendation })` → `lead` (must precede conversation intelligence for signals)
3. `buildConversationIntelligence({ memory, analysis, recommendation, leadScore, qualification, completedObjectives, pendingObjectives, history })` → `conversation`
4. `state = { stage: analysis?.visitorStage }`
5. `decideGoal({ memory, analysis, recommendation, leadScore, qualification, state, history, configuredObjectives })` → `goal`
6. `decideStrategy({ goal, memory, analysis, recommendation, leadScore, qualification, business })` → `strategy`
7. `decideAction({ conversationId, memory, analysis, recommendation, leadScore, qualification, objectives, completedObjectives, pendingObjectives, history })` → `nextAction`
8. `decideSalesMission({ goal, strategy, memory, analysis, recommendation, lead, conversation, business })` → `salesDecision`
9. `buildCrmProfile({ memory, analysis, recommendation, lead, conversation, goal, strategy, nextAction, business })` → `crm`
10. `buildAnalyticsSnapshot({ conversationId, memory, analysis, recommendation, lead, conversation, goal, nextAction, crm })` → `analytics` (also records into in-memory history caches)
11. `buildTimelineEvents({ conversationId, memory, analysis, recommendation, lead, goal, nextAction })` → `timeline`

### Output — `LeadPilotAIOS`
The 12-field object shown above (memory, business, conversation, lead, state, goal, strategy, nextAction, salesDecision, crm, analytics, timeline).

### "Backend-only data" separation
`runAIOS` returns everything; it does **not** decide what reaches the client. The chat route copies only selected fields back (`leadScore`, `qualification`, `scoreReasons`, `completedObjectives`, `pendingObjectives`, `actionEngine`, `conversationIntelligence`, `aiOS`) and then returns **only `structured.reply`** to the widget. All other fields are persisted or discarded.

### Storage
`persistConversation(conversationId, aiOS, project.id)` maps the AIOS into the 5 Prisma records. It is wrapped in a swallow-catch in the chat route so persistence failure never breaks the reply.

### Full execution pipeline diagram

```
            ┌────────────────────────────────────────────┐
            │            runAIOS(AIOSInput)               │
            └───────────────────┬────────────────────────┘
                                │
   memory ──────────────► (1) buildBusinessProfile ──────────┐
                                │                              │
   memory+analysis+rec ─► (2) evaluateLead ──────────────────┼──► lead
                                │                              │
   +lead signals ───────► (3) buildConversationIntelligence ─┼──► conversation
                                │                              │
   analysis.stage ──────► (4) state = { stage }               │
                                │                              │
   +state ──────────────► (5) decideGoal ────────────────────┼──► goal
                                │                              │
   +goal+business ──────► (6) decideStrategy ────────────────┼──► strategy
                                │                              │
   +recentActions cache ► (7) decideAction ──────────────────┼──► nextAction
                                │                              │
   +goal+strategy+lead ─► (8) decideSalesMission ────────────┼──► salesDecision
                                │                              │
   +all above ──────────► (9) buildCrmProfile ───────────────┼──► crm
                                │                              │
   +history caches ────► (10) buildAnalyticsSnapshot ────────┼──► analytics
                                │                              │
   +timeline signals ──► (11) buildTimelineEvents ───────────┼──► timeline
                                │                              │
                                ▼                              ▼
                        returns LeadPilotAIOS  ──► persistConversation() ──► 5 Prisma tables
```

---

# CRM

## CRM architecture

The CRM (`lib/crm/*`) is a **read-only aggregation layer**. It never runs AI and never mutates intelligence — it joins the durable persisted intelligence (`intelligence-store`) with base `Conversation`/`Lead`/`Message` tables and computes views.

### Lead enrichment — `leads.ts`
- `fetchRawLeads(workspaceId, opts)`: raw SQL over `Lead JOIN Project` with dynamic filters (search, status, score, date range).
- `matchesFilters(lead, f)`: **client-side** post-filter using persisted intelligence (qualification, industry, businessType, visitorStage, currentGoal, currentStrategy, currentMission, recommendedAction, engagementScore, conversationQuality, products, painPoints, hasTimeline).
- `toEnriched(raw)`: maps to `EnrichedLead`, attaches `getPersistedIntelligence(raw.conversationId)`.
- `getEnrichedLeads` / `getEnrichedLead`: paginated, workspace-guarded.

### Conversation enrichment — `conversations.ts`
- `getEnrichedConversations`: `conversation.findMany` scoped to workspace, bulk-loads `Lead` per conversation, attaches intelligence, supports client-side search across lead/intelligence/messages.
- `getEnrichedConversation`: single conversation + full messages + lead + intelligence.

### Activity feed — `activity.ts`
- `getActivityFeed`: iterates `PersistedIntelligence.timeline` across the scope's conversations, emits one `ActivityEvent` per timeline event, sorted by timestamp desc. 100% from the append-only `TimelineEvent` table.

### Dashboard — `dashboard.ts`
- `getLiveDashboard`: the CRM aggregator. Computes today's counts (conversations/leads/warm/hot) + 7-day trends from `Conversation`/`Lead` via raw SQL; derives top industries/business-types/products/pain-points/goals/recommended-actions, avg engagement/lead-score, a qualification funnel (Visitor→Engaged→Qualified→Hot→Contact-Ready), recent high-value leads, recent recommendations, and the activity feed — all from persisted intelligence.
- Returns `DashboardData` (scope, today, top*, qualificationFunnel, leadTrend[7], conversationTrend[7], recentHighValueLeads[5], recentRecommendations[5], activity[12]).

### Search — `search.ts`
- `searchCRM`: fetches up to 500 enriched leads/conversations, filters by substring match across a haystack built from persisted intelligence (name/email/phone, business.company/industry/businessType, conversation.summary, painPoints/goals/interests/productsDiscussed, timeline event+description; conversations also include raw message content).

### Timeline
- Rendered from `ConversationEvent[]` (category-colored, importance-flagged) in `components/crm/ConversationTimeline.tsx` and `ActivityFeed.tsx`.

### Filters
- `LeadFilters` (14 intelligence filters) + `LeadQuery` (pagination/search). Applied in `getEnrichedLeads`.

### How intelligence is merged
`getPersistedIntelligence(conversationId?)` (`lib/crm/intelligence.ts`) is the **junction**: it fans out to 5 parallel loaders (`loadLeadProfile`, `loadBusinessProfile`, `loadConversationIntelligence`, `loadAnalyticsSnapshot`, `loadTimeline`) and returns `{ lead, business, conversation, analytics, timeline }`. Every enriched lead/conversation attaches this as `.intelligence`.

---

# Analytics

## Analytics architecture

`lib/analytics/*` are **pure metric calculators** over two provenance classes:
1. **DB-derived** (`computeMessageStats` reads `Conversation`/`Message`): `avgMessages`, `avgResponseLength`, `avgConversationDurationMin`.
2. **Persisted-intelligence-derived** (from `PersistedConversation[]`): everything else.

`getAnalytics({projectId, range})` (`index.ts`) loads `getAllPersisted[ForProject]`, applies `applyRange` (date filter on conversation start), computes `computeMessageStats` scoped to the exact persisted conversation-id set (for consistency with `totalConversations`), then calls the calculators.

## Overview — `overview.ts`
`calculateOverview(records, messageStats?)`:
- `totalConversations = records.length`, `totalLeads = leads.length`, `qualifiedLeads` (warm/hot).
- `avgLeadScore` (mean of `lead.leadScore`), `avgEngagement` (mean of `conversation.engagementScore`), `avgQualityScore` (quality label → %).
- `avgConversationDurationMin`, `avgMessages`, `avgResponseLength` from `messageStats` (null if omitted).

## Lead analytics — `leads.ts`
Funnel (Visitors/Engaged≥40/Qualified/Hot/ContactReady), `scoreDistribution` (bucketed 0-100), `qualificationBreakdown` (Cold/Warm/Hot), `engagementBreakdown` (Low/Medium/High), `topScoreReasons`, `avgScore`.

## Conversation analytics — `conversations.ts`
`stageDistribution` (visitorStage), `qualityDistribution`, `duration` (from **timeline first/last event timestamps**, via `conversationDurationMinutes`), `avgGoalProgress`, `topGoals`/`topStrategies`, `objectiveCompletion`.

## Knowledge analytics — `knowledge.ts`
`topTopics` (interests + productsDiscussed + goals), `topPainPoints`, `topObjections`, `positiveSignals`, `knowledgeGaps`. **`unmetQuestions` is always `[]`** (per-question retrieval quality is not persisted — a known gap).

## Journey analytics — `journey.ts`
`stageDistribution`, `qualificationProgression` (Cold→Warm→Hot transitions from `qualificationHistory`), `mostCommonExit`, `funnel`.

## Engagement analytics — `engagement.ts`
`engagementOverTime`, `qualityOverTime` (per conversation-start day), `distribution` (Low/Medium/High).

## Insights engine — `summary.ts`
Rule-based `buildInsights`: no-data, low/high-engagement, many-cold, knowledge-gap, dropoff, healthy. No AI.

## Metrics — exact definitions (`messages.ts`)
- `avgMessages` = round(total messages ÷ conversations × 10)/10.
- `avgResponseLength` = round(total ASSISTANT char length ÷ response count).
- `avgConversationDurationMin` = round(mean of (last Message.createdAt − Conversation.createdAt in minutes) × 10)/10.

## Charts — `components/analytics/charts.tsx`
Hand-rolled SVG: `LineChart` (area+line, gradient `#7C3AED`), `DonutChart`, `BarList`, `Funnel`, `MiniStat`, `ChartEmpty`. Palette `PALETTE`.

## Dashboard — `AnalyticsDashboard.tsx`
Fetches `/api/analytics?range=&projectId=`. 9 StatCards (Conversations, Leads, Qualified %, Avg Lead Score, Avg Engagement, Avg Quality %, **Avg Duration**, **Avg Messages**, **Avg Response Length** — the last three from `computeMessageStats`), plus Insights, Lead, Conversations, Engagement, Journey, Knowledge sections. `FilterBar` for ranges. Empty state when `totalConversations === 0`.

## Project vs Global analytics
- No `projectId` → `getAllPersisted()` + `projectId IN (SELECT ... workspaceId)` filters; `scope = "global"`.
- With `projectId` → `getAllPersistedForProject(projectId)` + `projectId = ?`; `scope = "project"`.

## Which metrics come from DB vs AI
- **DB (Message/Conversation tables):** `avgMessages`, `avgResponseLength`, `avgConversationDurationMin`.
- **Persisted AI intelligence JSON:** lead score/qualification, engagement, quality, pain points, funnel, knowledge, journey, goal progress, objective completion, timeline-based conversation duration.

> **Critical distinction:** Overview `avgConversationDurationMin` uses the **Message-table** method; Analytics `ConversationMetrics.duration` uses the **timeline-based** `conversationDurationMinutes`. Two different duration definitions coexist.

---

# Persistence Layer

`apps/web/lib/intelligence-store.ts` replaces the legacy in-memory Maps with Prisma/Postgres persistence. `conversationId` is the shared key; base `Conversation`/`Lead` are never duplicated.

## Per-record upserts (idempotent)
- `saveConversationIntelligence` / `updateConversationIntelligence` (upsert on `conversationId`).
- `saveLeadProfile`, `saveBusinessProfile` (same upsert pattern).
- Reads cast `row.data as unknown as <Record>`.

## Append-only timeline
- `appendTimelineEvent(conversationId, events[], projectId?)`: computes the set of existing `event::description` keys, filters to only-new events, `createMany({ skipDuplicates: true })`. **Never deletes/overwrites timeline rows.**

## Analytics snapshot — append-unique history
- `updateAnalyticsSnapshot(...)`: loads existing arrays, `appendUnique` (only appends if the new value differs from the tail). Upserts.

## `persistConversation(conversationId, aiOS, projectId?)` — the orchestrator
Maps the fully-populated `LeadPilotAIOS` into the 5 writers:
- **Conversation Intelligence** ← `aiOS.conversation` (all 13 fields).
- **Lead Profile** ← `aiOS.lead` (score, qualification, scoreReasons, completed/pendingObjectives) + `aiOS.state.stage` (visitorStage) + `aiOS.goal.goal` (currentGoal) + `aiOS.strategy.strategy` (currentStrategy) + `aiOS.nextAction.action` (recommendedAction) + `aiOS.salesDecision.{currentMission, confidence}`.
- **Business Profile** ← `aiOS.memory` (industry/businessType/services/company/location/products) with fallbacks to `aiOS.business`; `communicationStyle`/`technicalLevel` left undefined.
- **Timeline** ← `appendTimelineEvent(aiOS.timeline)`.
- **Analytics** ← current leadScore/qualification/engagementScore/conversationQuality/goalProgress.

## `setConversationProject(conversationId, projectId)`
Back-fills `projectId` across all 5 tables (used when project context is known outside an AIOS run).

## Bulk reads
- `loadAll(where?)` runs 5 parallel `findMany` queries and merges into `Map<conversationId, PersistedConversation>` (timeline events accumulate via push).
- `getAllPersisted()` (global) / `getAllPersistedForProject(projectId)` — the input to every CRM/Analytics aggregator.

## How persistence works after every message
In `app/api/widget/chat/route.ts`: `if (chunkCount > 0)` → run `runAIOS` → `persistConversation` inside a swallow-catch. **This gate means only conversations on a project WITH knowledge chunks are persisted** — the reason the 211 pre-wiring historical conversations were never persisted (and were truncated during cleanup). The seed script (`scripts/seed-conversations.ts`) uses the *real* `runAIOS` + `persistConversation` + Message-table writes to populate demo data.

---

# Dashboard

## Architecture
The workspace home (`app/dashboard/page.tsx`) composes two independent data sources:
1. **`/api/dashboard`** → `DashboardClient` — base-table counts + 7-day trends + recent conversations/leads/activity (no intelligence layer).
2. **`/api/crm/dashboard`** → `DashboardWidgets` (CRM live intelligence) — the intelligence-backed cards/charts.

Plus `GlobalSearch` (`/api/crm/search`).

## Widgets / Cards
- `DashboardClient` (5 stat cards: conversations/messages/leads/projects/knowledgeSources; 2 trend bar charts; recent conversations/leads/activity).
- `DashboardWidgets` (6 CRM stat cards: Today's Conversations/Leads, Warm, Hot, Avg Engagement, Avg Lead Score; Qualification Funnel; Live Activity feed; Lead Trend 7d / Conversation Trend 7d LineCharts; 6 BarList cards: Top Industries/Business Types/Products/Pain Points/Goals/Recommended Actions; Recent High Value Leads; Recent AI Recommendations).

## Live statistics
All cards read from `getLiveDashboard` / `/api/dashboard` (no polling/websockets — refreshed on navigation/mount).

## Recent activity
- `DashboardClient` → `buildRecentActivity` (conversation/lead/knowledge events from base tables).
- `DashboardWidgets` → `getActivityFeed` (timeline-based intelligence).

## CRM + Analytics integration
`DashboardWidgets` is the CRM↔Analytics surface on the home page; the dedicated Analytics page (`app/analytics`, `projects/[id]/analytics`) uses `AnalyticsDashboard` reading `/api/analytics`.

---

# Authentication

## Login flow
1. `/login` → `LoginForm` → `supabase.auth.signInWithPassword`.
2. On success → `POST /api/auth/bootstrap` (provisions Workspace + OWNER member if absent) → redirect `/dashboard`.
3. `/signup` → `supabase.auth.signUp`; on session → bootstrap → `/dashboard`; else email-confirm pending message.
4. `/auth/callback` exchanges `?code=` for a session (OAuth/email-confirm landing).

## Workspace handling
- A `User` may belong to many `Workspace`s via `WorkspaceMember`. The bootstrap route auto-creates a personal workspace on first login. The projects route also auto-provisions as a fallback (idempotent via `findFirst`/`upsert`).
- `getCurrentWorkspaceId()` resolves the user's `workspaceId` from the first `WorkspaceMember` row.

## Projects
- A `Project` belongs to one `Workspace`. `clientId` (unique cuid) identifies it to the widget. Widget config lives in `widgetConfig: Json`.

## Permissions
- **Not enforced by role.** `Role` enum (OWNER/ADMIN/MEMBER/VIEWER) exists and OWNER is written on creation, but **every protected route only checks WorkspaceMembership existence**, never the `role` value. ADMIN/MEMBER/VIEWER are never assigned or read by app logic. (See Limitations.)

## Auth middleware
- `middleware.ts` protects `/dashboard/*` (redirect unauthenticated → `/login?next=`). Public routes: `/`, `/login`, `/signup`, `/auth/callback`. `/api/widget/*` and `/api/voice/*` bypass auth (origin-locked instead).

---

# Environment Variables

| Variable | Used in | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/*`, `middleware.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/*`, `middleware.ts` | Supabase anon key |
| `DIRECT_URL` | `lib/prisma.ts`, `prisma.config.ts`, `prisma/seed.ts` | Direct (non-pooled) Postgres for Prisma |
| `DATABASE_URL` | `lib/prisma.ts`, `prisma.config.ts` | Pooled Postgres fallback |
| `GROQ_API_KEY` | `app/api/widget/chat/route.ts` | Groq LLM (`llama-3.3-70b-versatile`) |
| `GEMINI_API_KEY` | `lib/embeddings.ts` | Gemini embeddings (`gemini-embedding-2`) |
| `LIVEKIT_URL` | `lib/widget-store.ts`, `widget/config`, `voice/token` | LiveKit Cloud WS URL |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | `voice/token` | LiveKit token + agent dispatch |
| `OPENAI_API_KEY` | `apps/agent` only | Voice agent LLM (OpenAI Realtime) |
| `NEXT_PUBLIC_SITE_URL` | `signup-form.tsx` | Supabase email-confirm redirect base |
| `NEXT_PUBLIC_APP_URL` | `overview`, `widget-settings` | Public app origin for embed snippet |
| `NEXT_PUBLIC_WIDGET_CDN_URL` | (public-cdn build) | Widget CDN base (not referenced in `apps/web`) |
| `MAX_HISTORY_MESSAGES` | `lib/widget-store.ts` | Chat history turn limit (default 20) |
| `PROJECT_ID` / `SEED_COUNT` | `scripts/seed-conversations.ts` | Seeding targets (script-only) |
| `LEADPILOT_API_URL` | `apps/agent/.env` | Agent → web API base |
| `HUGGINGFACE_API_KEY` / `JINA_API_KEY` | (commented out) | Legacy, disabled |

> No `.env.example` exists. `.env` files present: `apps/web/.env`, `apps/agent/.env`. `prisma.config.ts` supplies the migration URL since `schema.prisma` datasource has no `url`/`directUrl` (Prisma 7).

---

# Development Timeline

> **Reconstruction note:** The detailed per-phase records below are reconstructed from the implemented codebase architecture and the git history (commit subjects such as *"AI OS foundation"*, *"implement widget settings UI"*, *"SOCIAL knowledge-base source type"*, *"implement comprehensive CRM analytics"*, etc.). They reflect what was actually built, not an invented spec. The phase numbering follows the project's internal tracking referenced in `AGENTS.md` (Phases 14/15/15.5 + the AI OS milestone).

## Phase 1 — Project scaffold & monorepo
- **Goal:** Establish the Turborepo npm-workspaces monorepo (`apps/web`, `apps/widget`, `apps/agent`, `packages/*`).
- **Features:** Next.js 14 App Router skeleton, shared `types`/`ui`/`config` packages, Prisma + Postgres wiring.
- **Result:** Repo, build pipeline (`turbo dev/build`), base layout.

## Phase 2 — Auth & workspace foundation
- **Goal:** User accounts + tenant workspaces.
- **Features:** Supabase auth client factories (`lib/supabase/*`), `middleware.ts`, `User`/`Workspace`/`WorkspaceMember` models, `/login`, `/signup`, `/auth/callback`, `auth/bootstrap` workspace auto-provisioning.
- **Result:** First-login workspace creation, route protection for `/dashboard`.

## Phase 3 — Project model & settings
- **Goal:** Let a user create/manage a project (website) and its widget config.
- **Features:** `Project` model + `clientId`, `app/api/projects` CRUD, `projects/[id]/settings`, widget config store (`lib/widget-store.ts:toWidgetConfig`), project deletion.
- **Result:** Multiple projects per workspace, per-project `widgetConfig` JSON.

## Phase 4 — Embeddable widget distribution
- **Goal:** Ship a script tag customers paste on their site.
- **Features:** `apps/web/public/widget.js` loader (Shadow DOM), `apps/widget/src/main.tsx` Vite IIFE bundle → `public/widget-dist/widget.js`, origin validation (`validate-origin.ts`), `/api/widget/config`, `/api/widget/conversation/start`.
- **Result:** One `<script>` embed; styles isolated via Shadow DOM; middleware excludes `widget.js`/`widget-dist`.

## Phase 5 — Chat widget UI & conversation storage
- **Goal:** A working chat widget backed by real conversations.
- **Features:** `Widget` component (classic/dock/fusion templates), `Conversation`/`Message` models, `saveChatTurn` (USER+ASSISTANT rows), `getConversationHistory`, welcome messages.
- **Result:** Multi-turn chat persisted per `conversationId`/`visitorId`.

## Phase 6 — Knowledge base: ingestion
- **Goal:** Let users feed the bot their own content.
- **Features:** `KnowledgeSource`/`KnowledgeChunk` models, `embeddings.ts` (Gemini 3072), `chunker.ts`, `crawler.ts`, `document-extractor.ts`, `/knowledge/ingest` + `/crawl` + `/upload`. `setup-pgvector.ts` (ivfflat index).
- **Result:** TEXT/URL/DOCUMENT sources become embedded chunks.

## Phase 7 — RAG chat
- **Goal:** Answer visitor questions from the knowledge base.
- **Features:** `retrieval.ts` (pgvector cosine), `getRagReply` in chat route (Groq `llama-3.3-70b-versatile`, JSON mode), structured-response contract (`ai-response.ts`), `parseAIResponse` safe parser.
- **Result:** Context-aware replies; the `chunkCount > 0` gate means RAG only runs when knowledge exists.

## Phase 8 — Social knowledge source
- **Goal:** Ingest social profiles as knowledge.
- **Features:** `SourceType.SOCIAL` enum, `social-ingest.ts` (attribution-prefixed chunks), `/knowledge/social` route + UI.
- **Result:** LinkedIn/Instagram/Facebook/Twitter-X bios/posts become RAG chunks.

## Phase 9 — Conversation memory & structured response
- **Goal:** Maintain visitor state across turns and a typed LLM contract.
- **Features:** `conversation-memory.ts` (merge/summary), `objectives.ts` (catalog/resolution), structured response instruction + Zod schemas.
- **Result:** Stable per-conversation memory injected into the prompt; explainable memory updates.

## Phase 10 — Brand extraction & project creation polish
- **Goal:** Auto-brand the widget from the customer's site.
- **Features:** `brand-extract.ts` (colors/logo), `extractBrandForProject`, background crawl + brand on project creation (`waitUntil`).
- **Result:** Widget picks up site colors/logo automatically.

## Phase 11 — Widget customization UI
- **Goal:** Let users configure the widget visually.
- **Features:** `widget-settings-client.tsx`, template preview (classic/dock/fusion), `embed-snippet-selector.tsx`, `/api/projects/[id]/settings` PUT/PATCH.
- **Result:** Self-serve widget branding, mode (chat/voice/both), template, objectives.

## Phase 12 — Voice agent
- **Goal:** Voice channel via LiveKit.
- **Features:** `apps/agent/src/agent.ts` (LiveKit + OpenAI Realtime), `/api/voice/token` (room + dispatch), `/api/voice/agent-config`, `/api/voice/rag-context`, `/api/voice/webhook`, `VoiceConversation`/`VoiceMessage` models.
- **Result:** Voice calls with RAG context and transcript→Lead persistence.

## Phase 13 — CRM foundation (conversations & leads)
- **Goal:** Internal views of captured conversations/leads.
- **Features:** `/api/conversations` + `/[id]`, `/api/leads` + `/[id]` (PATCH status/score), `Lead` model + upsert from chat/voice, `lib/crm/leads.ts` + `conversations.ts` enrichment stubs.
- **Result:** Sales team can browse conversations and leads.

## Phase 14 — Analytics platform (AI OS intelligence surfaced)
- **Goal:** Visualize already-generated AI-OS intelligence in a premium SaaS UI (no new AI).
- **Features:** `lib/analytics/*` (overview/leads/conversations/knowledge/journey/engagement/summary), `components/analytics/*` (SVG charts, `AnalyticsDashboard`), `/api/analytics`, global + per-project scopes, `FilterBar` ranges.
- **Files affected:** `lib/analytics/**`, `components/analytics/**`, `app/api/analytics`, `app/analytics`, `app/projects/[id]/analytics`.
- **Result:** Full analytics suite reading persisted intelligence.

## Phase 15 — Intelligent CRM / Live Dashboard
- **Goal:** Merge AI intelligence into the CRM with a live dashboard.
- **Features:** `lib/crm/*` (dashboard/activity/search/intelligence/types), `components/crm/*` (DashboardWidgets, ActivityFeed, LeadProfile, ConversationAnalysis, GlobalSearch, badges), `/api/crm/dashboard` + `/activity` + `/search`, workspace `app/dashboard` composition.
- **Files affected:** `lib/crm/**`, `components/crm/**`, `app/api/crm/**`, `app/dashboard`.
- **Result:** CRM that reads the same persistence layer as analytics; live stats, funnel, activity, search.

## Phase 15.5 — Durable Prisma persistence (AI OS milestone)
- **Goal:** Persist all 5 intelligence models durably (replacing in-memory Maps) and fix null/zero metrics.
- **Features:** `lib/intelligence-store.ts` (`persistConversation`, upserts, append-only timeline, bulk reads), 5 Prisma models (`ConversationIntelligence`, `LeadProfile`, `BusinessProfile`, `AnalyticsSnapshot`, `TimelineEvent`), migration `20260715000000_intelligence_persistence`, `lib/analytics/messages.ts` (`computeMessageStats`), wiring into `getAnalytics`/`calculateOverview`, dashboard polish (real Avg Duration/Messages/Response Length), `scripts/seed-conversations.ts` (18 realistic conversations via real `runAIOS`+persist), `prisma.config.ts` (migration URL).
- **Files affected:** `lib/intelligence-store.ts`, `lib/analytics/messages.ts`, `lib/analytics/index.ts`, `lib/analytics/overview.ts`, `lib/analytics/util.ts`, `components/analytics/AnalyticsDashboard.tsx`, `prisma/schema.prisma`, `prisma/migrations`, `scripts/*`.
- **Result:** All intelligence survives restarts; analytics show real computed values (avgMessages 5.7, avgDuration 11.1m, avgResponseLength 69, 104 timeline events in seed).

## The AI OS work (major architecture milestone)
The AI OS — Goal Engine, Strategy Engine, Sales Brain, CRM Intelligence, Analytics Intelligence, Timeline Engine, and the AI OS Orchestrator (`runAIOS`) — was built as one cohesive milestone spanning the later phases above. It is documented in full in the **AI Architecture** and **AI OS** sections. Key facts:
- `runAIOS` is deterministic and pure (except three in-memory caches: `memoryStore`, `action-engine.recentActions`, `analytics-intelligence` history Maps).
- It consumes only `memory` + LLM `analysis`/`recommendation` + `configuredObjectives`, and produces a fully-populated `LeadPilotAIOS`.
- `persistConversation` maps the AIOS into the 5 durable records.
- It is proven to work with real-shaped input (empty memory + undefined analysis both OK — verified by the seed script).

---

# Current Features

| Capability | Status | Notes |
|---|---|---|
| Embedded chat widget | ✅ | Shadow DOM, 3 templates, one `<script>` |
| RAG chat | ✅ | pgvector cosine, Groq `llama-3.3-70b-versatile` |
| Knowledge base (TEXT/URL/DOCUMENT/SOCIAL) | ✅ | Gemini 3072 embeddings |
| Website crawl + brand extraction | ✅ | On project creation |
| Voice agent | ✅ | LiveKit + OpenAI Realtime, RAG context |
| Conversation memory | ✅ | In-memory (not yet DB-backed) |
| AI OS (11 engines + orchestrator) | ✅ | Deterministic, pure |
| Lead scoring (Cold/Warm/Hot) + reasons | ✅ | Heuristic, explainable |
| Durable intelligence persistence | ✅ | 5 Prisma models |
| CRM (leads/conversations/activity/search/dashboard) | ✅ | Read-only aggregation |
| Analytics (overview/leads/conversations/knowledge/journey/engagement/insights) | ✅ | Global + per-project, ranges |
| Workspace dashboard + live widgets | ✅ | `/api/dashboard` + `/api/crm/dashboard` |
| Auth + workspace auto-provisioning | ✅ | Supabase email/password |
| Widget customization UI | ✅ | Mode/template/objectives/brand |
| Lead capture (name/email/phone upsert) | ✅ | From chat + voice |
| Demo seed data | ✅ | `scripts/seed-conversations.ts` |

---

# Current Limitations

> All items below are real, traced to code. None are invented.

1. **No streaming.** Chat replies are buffered and returned as a single JSON object — no SSE/ReadableStream/typing token stream (`app/api/widget/chat/route.ts`).
2. **`conversation-memory` is in-memory only.** It does not survive server restarts / multiple workers (process-local `Map`). The persistence layer persists intelligence, but not the raw memory map.
3. **Persistence gate `chunkCount > 0`.** Only conversations on a project *with knowledge chunks* are persisted (`chat/route.ts:371`). Conversations before this wiring (or on KB-less projects) produce no intelligence rows.
4. **No similarity threshold in retrieval.** `retrieveRelevantChunks` returns top-5 regardless of relevance (`lib/retrieval.ts`).
5. **Vector dimension is implicit.** `vector(3072)` + `gemini-embedding-2` default 3072, but `embedContent` never sets `outputDimensionality` — a model default change breaks inserts.
6. **Per-chunk embedding errors swallowed.** A chunk can end up with `null` embedding while the source is still marked `READY` (`chunksCreated > 0` gates status).
7. **`/knowledge/sources` GET/DELETE lack ownership checks.** Any authenticated user can list/delete any source by `projectId`/`id` (`sources/route.ts`).
8. **No role-based authorization.** `Role` enum exists but no route enforces it; all members treated equally.
9. **`ingest` `type:"URL"` does not crawl.** It embeds literal `content` text; actual crawling is `/crawl`.
10. **`ingestUrlForProject` / `extractBrandForProject` are orphaned** relative to the API (the `/crawl` route duplicates the logic inline).
11. **`generateEmbeddings` (plural) is dead code.**
12. **SSO buttons are placeholders.** Google/GitHub SSO in `auth-shell.tsx` call `e.preventDefault()` only.
13. **`/billing`, `/integrations`, `/settings` are "Coming Soon" placeholders.**
14. **`AnalyticsReport.knowledge.unmetQuestions` is always empty** (per-question retrieval quality not persisted).
15. **Analytics `ConversationMetrics.duration` ≠ Overview `avgConversationDurationMin`** — two different definitions (timeline-based vs Message-table-based).
16. **`npm run lint` is non-functional** (ESLint interactive prompt; pre-existing).
17. **CRM client components must import types only from `@/lib/analytics/types`** (never the barrel) to avoid pulling `pg`→`fs`/`net` into the browser.
18. **Prod CRM dashboard 500** on `leadpilot-ai-beryl.vercel.app` diagnosed as a **stale build** (redeploy with "Clear build cache" fixes it; code verified clean locally).

---

# Future Roadmap

> Intended goals consistent with the architecture. Phase 16 is the immediate next step per `AGENTS.md`.

## Phase 16 — Production hardening & redeploy
- Redeploy to Vercel with a clean build to resolve the stale-build CRM 500.
- Back `conversation-memory` with the DB (durable memory across workers).
- Enforce workspace ownership on `/knowledge/sources`.
- Add a similarity threshold / min-score filter to retrieval.

## Phase 17 — Role-based access control
- Honor `Role` (OWNER/ADMIN/MEMBER/VIEWER) in all protected routes; invite/manage members UI.

## Phase 18 — Streaming & richer widget UX
- Token-streaming chat (SSE/ReadableStream) with incremental typing.
- Typing/queue indicators, conversation history replay on widget reload, multi-session resume.

## Phase 19 — Integrations
- Implement the `/integrations` placeholders: Slack alerts, HubSpot/CRM sync, Zapier webhooks, email/SMS follow-up.

## Phase 20 — Billing & multi-tenancy scale
- Implement `/billing` (Stripe or equivalent), plan tiers, usage metering (conversations/messages/leads), workspace quotas.

## Phase 21 — Autonomous sales co-pilot
- Closed-loop actions (auto-send pricing, book meetings via calendar, handoff to human), proactive re-engagement, cross-channel memory (chat+voice unified), and ML-based (rather than heuristic) lead scoring as an optional upgrade path.

---

# Developer Notes

## Important architectural decisions

1. **AI OS exists to separate "thinking" from "talking".** The single LLM call produces a *structured* response; all downstream sales intelligence is deterministic and explainable. This makes the system testable and debuggable without re-running the model.
2. **Intelligence is separated from base data.** `Conversation`/`Lead` hold hard facts (PII, enums); the 5 intelligence models hold AI output. This avoids schema churn on the core tables and lets analytics/CRM evolve independently.
3. **Analytics uses persisted intelligence, not live AI.** `getAnalytics`/`getLiveDashboard` are pure aggregations over durable JSON + base tables — cheap, cacheable, and identical for every viewer.
4. **`conversationId` is the universal join key** across all intelligence tables and the CRM/Analytics layers.
5. **`runAIOS` is pure** (modulo three in-memory caches). Given the same inputs it always yields the same `LeadPilotAIOS` — this is what makes the seed script reproduce realistic data without an LLM.

## Why each engine exists
See the **AI Architecture** section — each engine isolates one decision (goal, strategy, action, score, memory, timeline, analytics, CRM) so it can be tested, explained, and extended in isolation.

## How to extend the system

- **Add an AI signal:** extend the relevant engine's output interface + `persistConversation` mapping + the CRM/Analytics calculator. Keep engines pure.
- **Add a knowledge source type:** add to `SourceType` enum + a `lib/*-ingest.ts` + an API route + UI; reuse `generateEmbedding`/`chunkText`/`retrieveRelevantChunks`.
- **Add a metric:** add to the appropriate `lib/analytics/*` calculator + `AnalyticsReport` type + a `StatCard` in `AnalyticsDashboard`.
- **Add a CRM view:** build on `getEnrichedLeads`/`getEnrichedConversations`/`getPersistedIntelligence`.

## Things future developers should avoid changing

- **The `chunkCount > 0` gate** without understanding persistence coverage.
- **The `LeadPilotAIOS` field set** without updating `persistConversation` mapping and the persisted-record interfaces in `intelligence-store.ts`.
- **`MessageRole` storage as uppercase** — readers down-shift to lowercase for the LLM; changing the enum breaks history reconstruction.
- **The shared `getSharedPrismaClient()` singleton** — required for connection pooling on serverless.
- **Importing the `@/lib/analytics` barrel into client components** — use `@/lib/analytics/types` (type-only) to avoid `pg` in the browser.
- **The widget embed contract** (`data-client-id`/`data-api-url`/`data-widget-src`) — external customers depend on it.

## Best practices

- Keep engines deterministic; put all LLM/IO at the route边界.
- Wrap `persistConversation` in a swallow-catch so intelligence failures never break the visitor's reply.
- Use `getAllPersisted`/`ForProject` as the single source for CRM/Analytics input.
- Prefer raw SQL (`$queryRaw`/`$executeRawUnsafe` with `::vector`/`::jsonb`) for analytics/knowledge bulk ops.
- `parseAIResponse` must never throw.

---

# Current Project Status

| Subsystem | Status | Notes |
|---|---|---|
| Core Platform (monorepo, Next.js, Prisma) | ✅ Mature | Build + typecheck pass |
| Widget (embed, chat UI, templates) | ✅ Complete | Shadow DOM, 3 templates, one script |
| Knowledge Base (TEXT/URL/DOCUMENT/SOCIAL) | ✅ Complete | Gemini 3072, pgvector |
| RAG | ✅ Complete | Cosine top-5, no threshold (limitation) |
| AI OS (11 engines + orchestrator) | ✅ Complete | Deterministic, pure, proven |
| Voice | ✅ Complete | LiveKit + OpenAI Realtime |
| CRM | ✅ Complete | Enrichment, dashboard, activity, search |
| Analytics | ✅ Complete | All sections, global + project, ranges |
| Persistence | ✅ Complete | 5 durable models, migration applied |
| Dashboard | ✅ Complete | Workspace home + live CRM widgets |
| Auth | ⚠️ Partial | Email/password works; SSO placeholder; no RBAC |
| Memory durability | ⚠️ Partial | In-memory only (limitation) |
| Streaming | ❌ Not implemented | Buffered JSON only |
| Billing / Integrations / Settings | ❌ Placeholder | "Coming Soon" |
| Production readiness | ⚠️ Mostly | Stale-build 500 on Vercel; redeploy needed |

---

# Conclusion

LeadPilot AI is a full-stack, production-shaped SaaS that converts website traffic into structured, scored, and enriched sales intelligence. Its architecture cleanly separates four concerns:

1. **Capture** — the embeddable widget (chat + voice) and the RAG pipeline that answers from the customer's own knowledge base.
2. **Reason** — the AI OS, a deterministic orchestrator of eleven specialized engines that turn a conversation into a complete, explainable intelligence profile (memory, lead score, goal, strategy, next action, sales mission, CRM profile, analytics snapshot, timeline).
3. **Persist** — a durable Prisma layer (five intelligence models keyed by `conversationId`) that survives restarts and feeds every downstream view.
4. **Surface** — a read-only CRM, Analytics suite, and live Dashboard that aggregate the persisted intelligence with base tables to give sales teams a self-writing, prioritized view of every visitor.

The defining design choice is that **all sales "intelligence" is computed deterministically from a single structured LLM response**, then persisted and reused — so the system is testable, explainable, and cheap to operate at scale. The immediate next step (Phase 16) is production hardening: a clean Vercel redeploy, DB-backed memory, ownership/authorization fixes, and retrieval quality improvements. Everything documented here is grounded in the repository as it exists today.
