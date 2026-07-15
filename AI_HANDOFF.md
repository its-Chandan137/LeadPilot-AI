# AI_HANDOFF.md — LeadPilot AI (compact brief for AI chat assistants)

> **Purpose:** A short, self-contained briefing you can paste into Claude/ChatGPT/Gemini so the assistant understands the whole LeadPilot AI project, what's built, and what's planned — without reading the full 1,200-line `PROJECT_DETAILS.md`.
> **Source of truth:** Everything below is based on the actual repository (`apps/web`, `apps/widget`, `apps/agent`, `packages/*`). No invented features.
> **Deep reference:** `PROJECT_DETAILS.md` (full architecture bible) and `AGENTS.md` (work-state memory).

---

## 1. What is LeadPilot AI?

A B2B SaaS that turns any website into an AI sales agent. A visitor uses an embedded chat/voice widget; the bot answers from the company's own knowledge base (RAG), while an internal "AI Operating System" profiles the visitor, scores the lead (Cold/Warm/Hot), decides sales strategy, and records a structured intelligence trail. That intelligence is persisted and shown to the business's sales team via a CRM, Analytics suite, and live Dashboard.

**One-liner for context:** "RAG chatbot + autonomous sales-intelligence CRM, where all sales 'thinking' is deterministic and computed from a single structured LLM response."

---

## 2. Architecture (read top-to-bottom)

```
Visitor
  │  embeds <script src="/widget.js" data-client-id>
  ▼
Widget (React in Shadow DOM)  ──►  POST /api/widget/chat
  │
  ▼
API (Next.js route handler)
  1. findProjectByClientId + origin check (domain lock)
  2. chunkCount > 0 gate  (only persist if project HAS knowledge)
  3. getConversationHistory (from Message table)
  4. getRagReply(): retrieveRelevantChunks() ──► Groq LLM ──► structured JSON
  5. mergeMemoryUpdates()  (conversation memory)
  6. runAIOS()  ← THE AI ENGINE PIPELINE (11 deterministic engines)
  7. persistConversation()  (swallow-catch, writes 5 DB tables)
  8. saveChatTurn()  (writes USER + ASSISTANT Message rows)
  9. extractLeadInfo() ──► upsert Lead row
  │
  ▼
Persistence (Prisma/Postgres): 5 intelligence tables keyed by conversationId
  │
  ▼
CRM + Analytics + Dashboard  (read-only aggregations over persisted intelligence)
```

**Voice variant:** widget voice mode → `POST /api/voice/token` → LiveKit room + agent dispatch → `apps/agent` (LiveKit + OpenAI Realtime) pulls RAG context per turn, posts transcript to `/api/voice/webhook` on disconnect.

---

## 3. Tech Stack (quick list)

- **Monorepo:** npm workspaces + Turborepo; Next.js 14.2 (App Router), React 18, TypeScript 5.5 (strict).
- **DB:** PostgreSQL (Supabase) + Prisma 7 (adapter mode) + **pgvector** (`vector(3072)`).
- **Auth:** Supabase Auth (`@supabase/ssr`).
- **LLM (chat):** Groq `llama-3.3-70b-versatile`.
- **Embeddings:** Google Gemini `gemini-embedding-2` (3072-dim).
- **Voice:** LiveKit + OpenAI Realtime (separate `apps/agent` worker).
- **Ingestion:** cheerio (crawl), pdf-parse + mammoth (docs), zod (validation).
- **Styling:** Tailwind 3.4, lucide-react, Inter.
- **Hosting:** Vercel (`https://leadpilot-ai-beryl.vercel.app`).

---

## 4. Critical File Map

**AI core (`apps/web/lib/`):**
- `ai-os.ts` — `runAIOS()` orchestrator (composition root of all engines)
- `ai-response.ts` — LLM JSON contract + Zod schemas + safe parser
- `lead-scoring.ts`, `goal-engine.ts`, `strategy-engine.ts`, `action-engine.ts`, `sales-brain.ts` — decision engines
- `conversation-intelligence.ts`, `conversation-memory.ts`, `crm-intelligence.ts`, `analytics-intelligence.ts`, `timeline-engine.ts` — intelligence builders
- `objectives.ts` — objective catalog/resolution
- `intelligence-store.ts` — **durable persistence** of the 5 intelligence models

**RAG / knowledge (`apps/web/lib/`):**
- `embeddings.ts` (Gemini), `chunker.ts`, `retrieval.ts` (pgvector cosine), `crawler.ts`, `document-extractor.ts`, `social-ingest.ts`, `knowledge-ingest.ts`, `brand-extract.ts`, `setup-pgvector.ts`

**Widget / voice:**
- `apps/widget/src/main.tsx` — Vite IIFE bundle → `apps/web/public/widget-dist/widget.js`
- `apps/web/public/widget.js` — loader (Shadow DOM inject)
- `apps/web/lib/widget-store.ts` — widget data layer
- `apps/web/app/api/widget/chat/route.ts` — core chat turn
- `apps/web/app/api/voice/*` — token/agent-config/rag-context/webhook
- `apps/agent/src/agent.ts` — LiveKit voice agent

**CRM / Analytics / Dashboard (`apps/web/lib/`):**
- `crm/` — dashboard, leads, conversations, activity, search, intelligence, types
- `analytics/` — index, overview, leads, conversations, knowledge, journey, engagement, summary, messages, types, util
- `components/crm/*`, `components/analytics/*` — UI

**Schema / config:**
- `apps/web/prisma/schema.prisma` — all models
- `prisma.config.ts` — supplies migration URL (Prisma 7 has no `url` in datasource)
- `lib/prisma.ts` — shared Prisma client + adapter selection (Neon/Pg)

---

## 5. The AI OS (most important concept)

`runAIOS(input)` in `lib/ai-os.ts` is **deterministic and pure** (except 3 in-memory caches). It consumes `memory` + LLM `analysis`/`recommendation` + `configuredObjectives`, and runs 11 engines in order:

```
buildBusinessProfile → evaluateLead → buildConversationIntelligence →
state → decideGoal → decideStrategy → decideAction → decideSalesMission →
buildCrmProfile → buildAnalyticsSnapshot → buildTimelineEvents
```

Output: a single `LeadPilotAIOS` object (memory, business, conversation, lead, state, goal, strategy, nextAction, salesDecision, crm, analytics, timeline).

**Key rule:** Only ONE LLM call happens (in the chat route's `getRagReply`). Everything after is pure computation — testable, explainable, no extra model calls. The widget receives **only `reply`**; all other intelligence is persisted or discarded.

---

## 6. Database (Prisma models)

- **Auth/tenant:** `User`, `Workspace`, `WorkspaceMember` (join, `Role` enum exists but NOT enforced), `Project` (has `clientId` = public widget id, `widgetConfig` JSON).
- **Conversation:** `Conversation` (projectId, visitorId), `Message` (`MessageRole` enum USER/ASSISTANT stored **uppercase**), `VoiceConversation`, `VoiceMessage` (role is plain lowercase string).
- **Lead:** `Lead` (name/email/phone, `score` LeadScore COLD/WARM/HOT/SPAM, `status`, `source`; `@@unique([projectId, visitorId])`). Holds only hard PII + enums.
- **Knowledge:** `KnowledgeSource` (TEXT/DOCUMENT/URL/SOCIAL, status PROCESSING/READY/FAILED), `KnowledgeChunk` (`content`, `embedding vector(3072)?`, `metadata`).
- **Durable intelligence (5 tables, keyed by `conversationId`):** `ConversationIntelligence`, `LeadProfile`, `BusinessProfile`, `AnalyticsSnapshot`, `TimelineEvent` (append-only). These hold ALL AI output; base tables are never duplicated.

---

## 7. What's BUILT / COMPLETE

| Area | Status |
|---|---|
| Embeddable chat widget (Shadow DOM, 3 templates, 1 script tag) | ✅ |
| RAG chat (pgvector cosine, Groq) | ✅ |
| Knowledge base: TEXT / URL crawl / DOCUMENT upload / SOCIAL | ✅ |
| Website crawl + brand (colors/logo) auto-extraction | ✅ |
| Voice agent (LiveKit + OpenAI Realtime, RAG context) | ✅ |
| Conversation memory (in-memory) | ✅ |
| AI OS: 11 engines + `runAIOS` orchestrator | ✅ |
| Lead scoring (Cold/Warm/Hot) + explainable reasons | ✅ |
| Durable intelligence persistence (5 Prisma models + migration) | ✅ |
| CRM: leads / conversations / activity / search / live dashboard | ✅ |
| Analytics: overview / leads / conversations / knowledge / journey / engagement / insights (global + per-project, date ranges) | ✅ |
| Workspace dashboard + live CRM widgets | ✅ |
| Auth + workspace auto-provisioning (Supabase email/password) | ✅ |
| Widget customization UI (mode/template/objectives/brand) | ✅ |
| Lead capture (name/email/phone upsert from chat + voice) | ✅ |
| Demo seed data (`scripts/seed-conversations.ts`, 18 realistic conversations) | ✅ |

---

## 8. Known Limitations (the gotchas)

1. **No streaming** — replies are buffered JSON, not token-streamed.
2. **`conversation-memory` is in-memory only** — lost on restart / multiple workers.
3. **Persistence gate `chunkCount > 0`** — only conversations on a project *with knowledge chunks* get persisted intelligence.
4. **Retrieval has no similarity threshold** — returns top-5 regardless of relevance.
5. **Vector dim is implicit** — `vector(3072)` + Gemini default 3072; `embedContent` never sets `outputDimensionality` (model change would break inserts).
6. **Per-chunk embedding errors are swallowed** — a chunk can have `null` embedding while source is still `READY`.
7. **`/knowledge/sources` GET/DELETE lack ownership checks** — any authed user can list/delete any source.
8. **No role-based auth** — `Role` enum exists but routes only check membership existence.
9. **`ingest` `type:"URL"` does NOT crawl** — embeds literal text; actual crawl is `/crawl`.
10. **SSO buttons are placeholders** (Google/GitHub `e.preventDefault()`).
11. **`/billing`, `/integrations`, `/settings` are "Coming Soon" placeholders.**
12. **`AnalyticsReport.knowledge.unmetQuestions` is always empty** (not persisted).
13. **Two different "conversation duration" metrics** — Overview uses Message-table timestamps; Analytics uses timeline timestamps.
14. **`npm run lint` is broken** (ESLint interactive prompt).
15. **CRM client components must import types only from `@/lib/analytics/types`** (never the barrel) — the barrel pulls `pg`→`fs`/`net` into the browser.
16. **Prod CRM dashboard 500** on Vercel diagnosed as a **stale build** — redeploy with "Clear build cache" fixes it; code is clean locally.

---

## 9. Future Plans (roadmap)

- **Phase 16 — Production hardening:** clean Vercel redeploy (fix stale-build 500); back `conversation-memory` with DB; enforce `/knowledge/sources` ownership; add retrieval similarity threshold.
- **Phase 17 — RBAC:** honor `Role` (OWNER/ADMIN/MEMBER/VIEWER); member invite/manage UI.
- **Phase 18 — Streaming & UX:** token-streaming chat (SSE), history replay on widget reload, multi-session resume.
- **Phase 19 — Integrations:** Slack, HubSpot/CRM sync, Zapier, email/SMS follow-up (implement `/integrations`).
- **Phase 20 — Billing & scale:** implement `/billing`, plan tiers, usage metering, workspace quotas.
- **Phase 21 — Autonomous sales co-pilot:** auto-send pricing, book meetings, human handoff, unified chat+voice memory, optional ML-based lead scoring.

---

## 10. How to extend (rules for future work)

- **Keep AI engines deterministic/pure.** All LLM/IO stays at the route boundary; engines only transform data.
- **To add an AI signal:** extend the engine's output interface → update `persistConversation` mapping in `intelligence-store.ts` → update the CRM/Analytics calculator.
- **To add a knowledge source type:** add `SourceType` + a `lib/*-ingest.ts` + API route + UI; reuse `generateEmbedding`/`chunkText`/`retrieveRelevantChunks`.
- **To add a metric:** add to the `lib/analytics/*` calculator + `AnalyticsReport` type + a `StatCard` in `AnalyticsDashboard`.
- **Never break:** the `chunkCount > 0` gate logic, the `LeadPilotAIOS` field set (without updating persistence mapping), uppercase `MessageRole` storage, the `getSharedPrismaClient()` singleton, the widget embed contract (`data-client-id`/`data-api-url`/`data-widget-src`).
- **`parseAIResponse` must never throw.**

---

## 11. Quick "where do I look" index

| I need to… | Read |
|---|---|
| Understand the AI pipeline | `lib/ai-os.ts` + section 5 above |
| Fix chat behaviour | `app/api/widget/chat/route.ts` |
| Change embeddings/RAG | `lib/embeddings.ts`, `lib/retrieval.ts`, `lib/chunker.ts` |
| Add a knowledge source | `lib/*-ingest.ts` + `app/api/knowledge/*` |
| Change lead scoring | `lib/lead-scoring.ts`, `lib/objectives.ts` |
| Change what's persisted | `lib/intelligence-store.ts` (`persistConversation`) |
| Add a CRM view | `lib/crm/*` + `components/crm/*` |
| Add an analytics metric | `lib/analytics/*` + `components/analytics/*` |
| Auth/workspace issues | `lib/supabase/*`, `lib/auth.ts`, `middleware.ts` |
| Full detail | `PROJECT_DETAILS.md` |
| Current work state | `AGENTS.md` |

---


Appendix A — Current Development State
Project Status

LeadPilot AI is currently in an advanced stage of development.

Completed
✅ Authentication & Workspaces
✅ Projects
✅ Website Widget
✅ Voice Agent (LiveKit)
✅ Knowledge Base (Text, URL, Documents, Social)
✅ RAG Retrieval Pipeline
✅ Conversation Memory
✅ AI Response Architecture
✅ AI Operating System (AI OS)
✅ Goal Engine
✅ Strategy Engine
✅ Sales Brain
✅ Lead Scoring
✅ Conversation Intelligence
✅ CRM Intelligence
✅ Analytics Intelligence
✅ Timeline Engine
✅ Durable Intelligence Persistence (Prisma)
✅ CRM Dashboard
✅ Analytics Dashboard
✅ Global Dashboard
✅ Lead Management
✅ Conversation Analysis
✅ Activity Feed
Current Phase

Latest completed phase: Phase 15.5

The intelligence pipeline is complete.

The application is now moving from feature development into production hardening and scaling.

The major architecture should now be considered stable.

Appendix B — Core Architecture Philosophy

LeadPilot AI follows one fundamental principle:

One LLM call per conversation turn. Everything else is deterministic.

The AI model is responsible only for producing one structured response.

Everything after that response is computed using deterministic business logic.

The AI should never be asked multiple times during the same turn for:

Lead Scoring
CRM updates
Sales decisions
Goal selection
Strategy selection
Analytics
Timeline
Business profiling

Those are all handled by AI OS.

Data Flow Philosophy
User

↓

LLM (ONE CALL)

↓

Structured JSON

↓

Memory

↓

Conversation Intelligence

↓

Lead Scoring

↓

Goal Engine

↓

Strategy Engine

↓

Next Best Action

↓

Sales Brain

↓

CRM Intelligence

↓

Analytics Intelligence

↓

Timeline

↓

Persistence

↓

Dashboard / CRM / Analytics

No component should bypass this flow.

Appendix C — Project Design Rules

These rules should be respected whenever new features are added.

Route Handlers

Routes should orchestrate only.

Routes should never contain business logic.

A route may:

Validate input
Call services
Call AI OS
Persist data
Return a response

A route should not decide:

Sales strategy
Lead score
CRM logic
Analytics
Objectives
Visitor stage
AI Engines

Every engine should remain:

deterministic
testable
modular
independent

An engine should receive data and return data.

It should not perform database writes.

Persistence

Persistence should remain a separate layer.

AI engines should never directly write to Prisma.

All persistence should happen through:

persistConversation()

or dedicated persistence services.

UI

The frontend should display data.

It should not calculate business intelligence.

Analytics should be computed in backend services.

CRM should read persisted intelligence.

Appendix D — What Must Never Be Rewritten

The following systems are considered core architecture.

Avoid replacing or redesigning them unless absolutely necessary.

runAIOS()
AI Response schema
Goal Engine
Strategy Engine
Sales Brain
Lead Scoring
Conversation Intelligence
CRM Intelligence
Analytics Intelligence
Timeline Engine
Intelligence Persistence
AI OS pipeline

These systems form the foundation of LeadPilot AI.

Extend them instead of replacing them.

Appendix E — Safe Areas to Extend

The following areas are designed to grow over time.

Safe additions include:

New CRM pages
Analytics widgets
Dashboard cards
Widget UI
Voice features
Knowledge source types
Integrations
Billing
Team collaboration
Notifications
Automation workflows
Reports
AI recommendations
Marketplace integrations

These can evolve without changing the AI architecture.

Appendix F — Coding Principles

When contributing to LeadPilot AI, follow these principles.

Prefer Pure Functions

Whenever possible:

Input → Output

Avoid hidden state.

Keep Modules Small

Business logic belongs inside lib/.

UI belongs inside components/.

Routes coordinate everything.

Single Responsibility

Each module should solve one problem.

Examples:

Goal Engine → goals only
Strategy Engine → strategies only
Sales Brain → sales mission only
Analytics → metrics only
Reuse Existing Intelligence

Before creating new logic:

Check whether the required information already exists inside AI OS.

Avoid duplicate calculations.

Extend, Don't Duplicate

When adding new intelligence:

Extend AI OS output.
Persist it.
Expose it through CRM/Analytics.

Do not create parallel systems.

Appendix G — Data Integrity Rules

LeadPilot AI values correctness over appearance.

Never fabricate data.

If data does not exist:

Return null
Return an empty array
Return 0 only when mathematically correct

Do not estimate values.

Examples:

Average response length
Conversation duration
Analytics
CRM statistics
Engagement
Lead scores

must always be derived from persisted data.

Appendix H — Long-Term Vision

LeadPilot AI aims to become an autonomous AI sales platform.

Future capabilities include:

Autonomous sales agents
Multi-agent collaboration
CRM integrations
Calendar scheduling
Email follow-ups
WhatsApp integration
Slack integration
Workflow automation
Team collaboration
AI-powered recommendations
Enterprise analytics
Billing and subscriptions
Marketplace ecosystem

The AI Operating System should remain the single source of intelligence as the platform grows.

Final Principle

LeadPilot AI is not just a chatbot. It is an AI Operating System for Sales.

Every new feature should either:

improve the intelligence,
improve how intelligence is stored,
improve how intelligence is visualized,
or improve how businesses act on that intelligence.

The architecture should remain modular, deterministic, explainable, and scalable as the product evolves.


*End of AI_HANDOFF.md. Paste this into any AI chat for instant project context; link or attach `PROJECT_DETAILS.md` for deep dives.*
