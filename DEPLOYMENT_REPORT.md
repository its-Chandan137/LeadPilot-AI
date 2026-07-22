# LeadPilot AI — Production Deployment & Infrastructure Report

**Prepared for:** Architecture Review Board / Investors / DevOps
**Scope:** Full codebase inspection (every app, lib, route, config, schema, env)
**Branch state:** Phase 15.5 complete, pre-Phase 16 hardening
**Date:** 2026-07-20

---

## 0. Inspector's Statement (Evidence Base)

Every claim below is derived from a direct file read. No feature is assumed.
Infrastructure scanning results (tool-assisted, repo-wide):

| Searched for | Found? | Where |
|---|---|---|
| Redis / BullMQ / ioredis | **None** | (only LiveKit SDK code contains the word "Redis" in a comment about reconnect config) |
| Stripe / payments | **None** | `/billing` is a "Coming Soon" placeholder (apps/web/app/billing/page.tsx) |
| AWS SDK / S3 / SES / Amplify | **None** | No `@aws-sdk/*`, no `@aws-amplify` |
| Cron / node-cron / node-schedule / EventBridge | **None** | No scheduled jobs anywhere |
| Worker threads / child_process / cluster | **None** | Single Node process model |
| Queues (SQS, etc.) | **None** | No queue system |
| Dockerfile / docker-compose | **None** | No containerization |
| .github / CI-CD / nginx / k8s | **None** | No CI/CD pipeline, no nginx, no IaC |
| Email provider | **None** | No SMTP/SES/Resend integration |

**Third-party external dependencies actually used (cited):**
- Supabase (Auth + Postgres + pgvector) — `apps/web/lib/supabase/*`, `apps/web/prisma/schema.prisma`
- Groq LLM `llama-3.3-70b-versatile` — `apps/web/app/api/widget/chat/route.ts:294`, `lib/ai-response.ts`
- Google Gemini embeddings `gemini-embedding-2` (3072-dim) — `apps/web/lib/embeddings.ts:9`
- OpenAI Realtime (`gpt-realtime`) — `apps/agent/src/agent.ts:181`
- LiveKit Cloud (`wss://leadpiolet-79oici7u.livekit.cloud`) — `apps/web/.env.local`, `apps/agent/.env`
- Vercel (`@vercel/functions` `waitUntil`) — `apps/web/app/api/widget/config/route.ts:9`, `apps/web/app/api/projects/route.ts`
- `@livekit/agents` worker — separate Node process in `apps/agent`

**Environment variables actually referenced (full inventory):**
`NODE_ENV`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WIDGET_CDN_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `OPENAI_API_KEY` (+ `LEADPILOT_API_URL`, `MAX_HISTORY_MESSAGES`, `SEED_COUNT`, `PROJECT_ID` for scripts).

> **Security note (flagged, not exploited):** `apps/web/.env.local` and `apps/agent/.env` are committed to the repo and contain live credentials (Supabase keys, Groq key, OpenAI key, LiveKit secret). These must be rotated and git-ignored before any production deploy.

---

# PART 1 — APPLICATION SUMMARY

## Architecture
Monorepo: npm workspaces + Turborepo (root `package.json`, `turbo.json`). Three apps:
- `apps/web` — Next.js 14.2 (App Router), React 18, TypeScript 5.5 strict. The dashboard + all API route handlers.
- `apps/widget` — Vite + React, compiled to a single IIFE bundle (`widget.js`) via `apps/widget/vite.config.ts`.
- `apps/agent` — Standalone LiveKit voice-agent worker (`tsx src/agent.ts start`), NOT part of the Next build.

Shared packages: `@leadpilot/types`, `@leadpilot/ui`, `@leadpilot/config`.

Data flow (from `AI_HANDOFF.md` + `widget/chat/route.ts`):
```
Visitor widget → POST /api/widget/chat → Prisma findProjectByClientId + origin check
  → chunkCount>0 gate → getConversationHistory → retrieveRelevantChunks (pgvector cosine)
  → Groq LLM (ONE call) → structured JSON → runAIOS (11 deterministic engines)
  → persistConversation (5 tables) → saveChatTurn → extractLeadInfo → upsert Lead
```
Philosophy: **one LLM call per turn; everything else is deterministic/pure** (`AI_HANDOFF.md` Appendix B).

## Frontend
- Dashboard: Next.js App Router pages under `apps/web/app/**` (login, signup, dashboard, projects, leads, analytics, settings, billing, integrations).
- Styling: Tailwind 3.4, lucide-react (`apps/web/package.json`).
- Widget: React in Shadow DOM (`apps/widget/src/main.tsx`), served as `public/widget-dist/widget.js` + `public-cdn/widget.js` loader. Supports chat + voice (LiveKit browser client `livekit-client`).
- No streaming/SSE — replies are buffered JSON (`AI_HANDOFF.md` limitation #1).

## Backend
- Next.js Route Handlers (App Router) only — no separate API server.
- AI engines in `apps/web/lib/*` (ai-os, ai-response, lead-scoring, goal-engine, strategy-engine, action-engine, sales-brain, conversation-intelligence, crm-intelligence, analytics-intelligence, timeline-engine, objectives).
- Persistence layer `apps/web/lib/intelligence-store.ts` (`persistConversation`).
- Configured as `export const dynamic = "force-dynamic"` on chat/widget routes (server-rendered per request).

## Database
- PostgreSQL via **Supabase**, accessed through **Prisma 7** (adapter mode: `PrismaPg` or `PrismaNeon`, `apps/web/lib/prisma.ts`).
- **pgvector** extension: column `embedding vector(3072)` on `KnowledgeChunk` (`schema.prisma:158`).
- 16 models: User, Workspace, WorkspaceMember, Project, WidgetTraffic, Conversation, Message, Lead, KnowledgeSource, KnowledgeChunk, VoiceConversation, VoiceMessage, ConversationIntelligence, LeadProfile, BusinessProfile, AnalyticsSnapshot, TimelineEvent.
- **No Row Level Security (RLS)** — all access is via the app's Prisma service role key (`DIRECT_URL`). Supabase Auth is used only for login, not DB row security.
- Datasource has NO url in `schema.prisma`; `prisma.config.ts` supplies `DIRECT_URL`/`DATABASE_URL`.

## AI Features
- RAG chat: retrieve top-5 chunks by cosine distance (`retrieval.ts:21` `ORDER BY embedding <=> $2::vector`), Groq `llama-3.3-70b-versatile`, JSON-structured response (`ai-response.ts`).
- Embeddings: Google Gemini `gemini-embedding-2`, 3072-dim (`embeddings.ts:9`). Implicit dimension (limitation #5).
- Voice: LiveKit + OpenAI Realtime `gpt-realtime` (`agent.ts:181`). Agent pulls RAG context per turn via `/api/voice/rag-context`.
- AI OS: 11 deterministic engines (`ai-os.ts`), no extra LLM calls.
- Lead scoring Cold/Warm/Hot; conversation memory (in-memory Map — **lost on restart**, limitation #2).

## Authentication
- Supabase Auth (`@supabase/ssr`), email/password (`middleware.ts`, `lib/supabase/*`).
- `middleware.ts` gates all non-widget/non-voice routes; widget & voice are public (CORS open).
- Workspace auto-provisioning on first login (`auth.ts`, `api/auth/bootstrap/route.ts`).
- **No RBAC enforced** — `Role` enum exists but routes only check membership existence (limitation #8). SSO buttons are placeholders (`AI_HANDOFF.md` #10).

## Storage
- **No S3 / no Supabase Storage usage.** Document uploads (PDF/DOCX/TXT, ≤10MB) are parsed in-memory via `pdf-parse`/`mammoth` (`document-extractor.ts`) and the **text is embedded into Postgres** — the binary file is NOT stored anywhere. Crawled pages and social text are likewise stored as text in `KnowledgeChunk`.
- This means no object storage is required for current functionality.

## APIs (all in `apps/web/app/api/**`)
- `widget/config` (GET), `widget/conversation/start` (POST), `widget/chat` (POST) — public, CORS.
- `voice/token`, `voice/agent-config`, `voice/rag-context`, `voice/webhook` — token is public (domain-locked), others server-side.
- `knowledge/ingest`, `knowledge/crawl`, `knowledge/upload`, `knowledge/social`, `knowledge/sources` (GET/DELETE) — auth required. **GET/DELETE `/knowledge/sources` lack ownership checks** (limitation #7 — any authed user can list/delete any source).
- `projects`, `projects/[id]`, `projects/[id]/settings`, `leads`, `leads/[id]`, `conversations`, `conversations/[id]`(+`/convert`), `crm/dashboard`, `crm/activity`, `crm/search`, `analytics`, `dashboard`, `auth/bootstrap`, `auth/callback`.

## Widget
- Shadow-DOM embeddable chat/voice widget, 3 templates, 1 script tag (`public-cdn/widget.js`).
- Domain-locked via `validate-origin.ts` (compares Origin/Referer to `project.siteUrl`).
- Traffic analytics captured in `WidgetTraffic` table (`traffic-analytics.ts`, `traffic-block.ts`).

## Admin Panel / User Dashboard
- No separate admin; dashboard IS the user/workspace console.
- Pages: Dashboard (global + per-project live CRM widgets), Analytics suite (overview/leads/conversations/knowledge/journey/engagement), CRM (leads/conversations/activity/search), Widget settings (brand, objectives, traffic blocking), Billing & Integrations = placeholders.

## Background Jobs
- **None** in the traditional sense. The LiveKit agent (`apps/agent`) is a long-running dispatched worker process. Ingestion (crawl/embed) is **synchronous within the HTTP request** (`knowledge/crawl/route.ts` awaits `crawlUrl` + per-chunk embedding loop) — a scaling risk (timeouts under load).

## Security Features (present)
- Domain/origin lock on widget + voice (`validate-origin.ts`).
- Zod validation on all API inputs.
- `force-dynamic` to avoid cached responses.
- `poweredByHeader: false`, `compress: true` (`next.config.mjs`).
- CORS headers via `corsHeaders()` (`api-response.ts`).
- Conversation memory excludes transient reasoning keys (`conversation-memory.ts`).

---

# PART 2 — REQUIRED PRODUCTION INFRASTRUCTURE

Legend: **M** = Mandatory, **R** = Recommended, **O** = Optional.

| Component | Why needed | Mandatory | AWS service | Alternative | Est. Monthly |
|---|---|---|---|---|---|
| **Compute — web app** | Runs Next.js (dashboard + API routes). Currently Vercel-shaped; on EC2 = Node process behind a reverse proxy. | M | EC2 (t3/m6i) | Vercel, ECS Fargate | $15–$120 |
| **Compute — voice agent** | `apps/agent` is a separate `tsx` worker that must run continuously to receive LiveKit dispatches. | M (if voice enabled) | EC2 / ECS Fargate | LiveKit Cloud (managed) | $20–$60 |
| **Reverse proxy / LB** | Next.js needs TLS termination + routing; multiple instances need load balancing. | M | ALB | nginx on EC2 | $16+ |
| **TLS cert** | HTTPS for widget + dashboard. | M | ACM (free) | Let's Encrypt | $0 |
| **DNS** | Custom domain (leadpilot.ai). | M | Route53 | Cloudflare | $0.50–$1 |
| **DB — Postgres** | Primary datastore (Prisma + pgvector). Currently Supabase; on AWS = RDS or self-managed. | M | RDS Postgres / Aurora | Supabase, Neon, EC2+Docker PG | $15–$200 |
| **pgvector** | Vector similarity for RAG retrieval (`retrieval.ts`). | M | RDS PG 15+ (extension) | Supabase, Neon | $0 (ext) |
| ** secrets** | GROQ/GEMINI/OPENAI/LIVEKIT/Supabase keys; never on disk in plaintext. | M | Secrets Manager / SSM | Doppler, env files | $1–$6 |
| **Logging/Monitoring** | `logger.ts` only does `console.*`; need aggregation. | M | CloudWatch | Datadog, Grafana Loki | $5–$50 |
| **Storage (S3)** | NOT currently used (files parsed in-memory). Only needed if you start persisting uploads. | O | S3 | Supabase Storage | $0–$5 |
| **CDN (CloudFront)** | Widget JS + static assets; currently served from app. Beneficial for global widget latency. | R | CloudFront | Supabase CDN, Cloudflare | $0–$20 |
| **WAF / Shield** | DDoS + rate-limit protection for public widget endpoints. | R | AWS WAF + Shield Std | Cloudflare | $0–$40 |
| **Auto Scaling** | Handle traffic spikes (especially widget traffic from many customer sites). | R | ASG | Manual | $0 + instance cost |
| **Backup** | PITR for Postgres (currently Supabase handles this). | M | RDS PITR / Supabase | pg_dump cron | $0–$30 |
| **Redis / Queue** | **NOT required today** — no caching layer, no async jobs. Adds only cost/complexity. | — | ElastiCache | — | $0 (do NOT add) |
| **SES / Email** | **NOT used** — no email sending anywhere. | — | SES | — | $0 |
| **Lambda / SQS / EventBridge** | **NOT used** — no async/scheduled work. | — | — | — | $0 |
| **ECR / CodePipeline** | Only if you containerize. Currently no Dockerfile. | O | ECR + CodePipeline | GitHub Actions | $0–$10 |

### Does Supabase already replace AWS services?
**YES — for the current build, Supabase replaces:** RDS (Postgres), pgvector, Auth (Cognito), and Supabase Storage (S3, though unused). If you keep Supabase, you remove the need for RDS, Aurora, Cognito, and a self-managed vector DB. The user explicitly wants EC2 + Supabase, so the cleanest design is:
**EC2 (web + agent) + ALB + ACM + Route53 + CloudWatch + Secrets Manager + Supabase (DB/Auth/Vector).** Do NOT also stand up RDS — that duplicates the database.

---

# PART 3 — SUPABASE USAGE AUDIT

**Authentication:** Supabase Auth email/password (`@supabase/ssr`). Used for login/signup/session (`middleware.ts`, `supabase/server.ts`, `supabase/client.ts`). No SSO (placeholders). No social login.

**Database:** YES — all 16 Prisma models live in Supabase Postgres (`DATABASE_URL` points to `aws-1-ap-northeast-1.pooler.supabase.com`, `apps/web/.env.local`). Connection pooling via Supabase pooler (port 6543, `pgbouncer=true`) for the app; direct connection (5432) for migrations/Prisma (`DIRECT_URL`).

**Storage:** NOT used (no buckets referenced; uploads parsed in-memory).

**Realtime:** NOT used (widget uses REST + LiveKit WebRTC, not Supabase Realtime).

**Edge Functions:** NOT used.

**Vector:** YES — `pgvector` `vector(3072)` on `KnowledgeChunk.embedding` (`schema.prisma:158`); cosine search in `retrieval.ts`.

**RLS:** NOT enabled for app data — app uses the **service-role/direct** connection, bypassing RLS. Auth is enforced in middleware/routes, not at the DB row level. This is a security consideration (see Part 7).

**Buckets:** None.

**Scheduled Functions:** None.

### Recommended Supabase plan
- **Auth:** email/password only, low MAU at <1000 users.
- **DB size:** see Part 6 — at 1000 users, a few GB; pgvector index grows with chunks.
- **Compute:** needs to handle embedding queries + chat writes.

**Recommendation:** **Supabase Pro plan** ($25/mo) for production. It provides:
- 8 GB database (sufficient through ~1000 users; upgrade to Team/$599 if >10k users or heavy vector).
- Daily backups + PITR (Team plan).
- Higher connection limits (Pro: 100 pooled; needed because EC2 Node opens multiple connections).
- No egress surprises at small scale.
- **Team plan ($599/mo)** only justified at 10k+ users or if you need PITR + larger compute + more storage.

**Estimated Supabase cost:** Pro $25/mo (100–1000 users). $25–$200/mo (1000–10000). $599+/mo (10000+).

---

# PART 4 — PRODUCTION TRAFFIC & EC2 SIZING

Assumptions: each "user" = a business subscribing to LeadPilot; their end-visitors generate widget traffic. EC2 hosts the Next.js Node process. Voice agent on a separate small instance.

| Scale | EC2 type | vCPU | RAM | EBS | Utilization |
|---|---|---|---|---|---|
| **100 users** | t3.small | 2 | 2 GB | 20 GB gp3 | ~15–25% (single instance ok) |
| **500 users** | t3.medium | 2 | 4 GB | 30 GB gp3 | ~30–45% |
| **1000 users** | t3.large | 2 | 8 GB | 40 GB gp3 | ~40–60% (add 2nd for HA) |
| **5000 users** | m6i.large ×2 (ASG) | 2 ea | 8 GB ea | 50 GB | ~50–70% across 2 |
| **10000 users** | m6i.xlarge ×2–3 (ASG) | 4 ea | 16 GB ea | 80 GB | ~60–80% |

Notes:
- Next.js API routes are CPU-bound on LLM round-trips (which are network I/O to Groq, not CPU). The Node event loop handles concurrency well; RAM is the main constraint (Prisma pool = 3 connections, `prisma.ts:29`).
- **Voice agent:** separate `t3.small`/`t3.medium` (it's a long-lived worker; LiveKit SDK is moderately heavy). Or use **LiveKit Cloud** (managed, removes this instance).
- In-memory `conversation-memory` Map (`conversation-memory.ts:49`) grows with active conversations — on a single instance this is fine; **problematic with multiple instances** (no shared state → Phase 16 backlog item). Until backed by DB, limit to 1 web instance or accept memory loss on the non-owner instance.

---

# PART 5 — BANDWIDTH ESTIMATES

Per month, approximate:

| Type | 100 u | 1k u | 10k u |
|---|---|---|---|
| **Outbound (dashboard HTML/JS/CSS)** | 50 GB | 300 GB | 2 TB |
| **Widget traffic** (JS bundle ~50KB + chat JSON per turn ~2KB) | 20 GB | 200 GB | 1.5 TB |
| **API traffic** (chat requests/responses, RAG) | 10 GB | 100 GB | 800 GB |
| **AI traffic** (Groq/Gemini/OpenAI API calls — egress to provider) | 5 GB | 50 GB | 400 GB |
| **Uploads** (doc ingest, ≤10MB each, in-memory) | 2 GB | 20 GB | 150 GB |
| **Downloads** (crawled site fetches made by server) | 5 GB | 50 GB | 300 GB |
| **Storage growth** | ~1 GB/mo | ~5 GB/mo | ~40 GB/mo |
| **Monthly transfer total** | ~92 GB | ~720 GB | ~5.6 TB |

AWS data transfer out is **$0.09/GB** after 100 GB free tier. CloudFront reduces origin egress. Supabase has its own egress included in plan.

---

# PART 6 — STORAGE ESTIMATES

| Item | Formula | 100 u | 1k u | 10k u |
|---|---|---|---|---|
| **Database (relational)** | Projects, leads, conversations, messages, intelligence JSON | ~0.5 GB | ~3 GB | ~25 GB |
| **Document storage (binary)** | **NONE** — files parsed, not stored | 0 | 0 | 0 |
| **Images** | Brand logos stored as URLs/text, not blobs | ~0.01 GB | ~0.1 GB | ~1 GB |
| **Vector embeddings** | 3072-dim float × chunks. ~1 chunk/100 words. Assume 500 chunks/project avg. 3072×4 bytes = 12 KB/chunk → ~6 MB/project | ~0.6 GB | ~6 GB | ~60 GB |
| **Logs** | console only today; with CloudWatch ~100MB/day | ~3 GB | ~9 GB | ~30 GB (use log retention) |
| **Backups** | PITR keeps 7–35 days | ~1 GB | ~6 GB | ~50 GB |
| **Total PG** | | **~2 GB** | **~24 GB** | **~165 GB** |

Supabase Pro (8 GB) covers up to ~500 users comfortably. At 1k users you approach the 8 GB limit → upgrade to Team (larger DB) or move vector to a dedicated extension/table with HNSW index (currently exact `<=>` scan, which is slow at scale — see Part 11).

---

# PART 7 — SECURITY AUDIT

| Control | Current state | Recommendation |
|---|---|---|
| **HTTPS** | Not enforced in code (relies on host). | ALB + ACM cert, redirect HTTP→HTTPS. HSTS header. |
| **Firewall** | None. | Security Group: ALB 443 only; EC2 only reachable from ALB (SG ref). No 0.0.0.0/0:22 — use SSM Session Manager. |
| **Security Groups** | N/A (Vercel today). | Web SG: ingress 443 from ALB SG only. Agent SG: 443 + LiveKit media ports from internet (or LiveKit Cloud). |
| **IAM** | N/A. | EC2 instance role with least privilege (Secrets Manager read, CloudWatch write). NO static keys on box. |
| **Least privilege** | App uses Supabase **service-role** (full DB). | Keep service-role server-side only; never expose anon key with write. Enforce ownership checks (fix limitation #7). |
| **Backups** | Supabase daily. | Enable PITR (Team) or automated `pg_dump` to S3. Test restore. |
| **Monitoring** | `console.*` only (`logger.ts`). | CloudWatch Logs + metrics; alarm on 5xx, latency, DB connections. |
| **Logging** | console. | Structured JSON logs → CloudWatch; redact PII (emails/phones in lead logs). |
| **Rate limiting** | None on widget/voice endpoints. | WAF rate-based rules on `/api/widget/chat` and `/api/voice/token` (per-IP); protect LLM cost. |
| **DDoS** | None. | AWS Shield Standard (free) + WAF; CloudFront in front. |
| **Secret management** | **Plaintext `.env.local`/`.env` committed to git** ⚠️ | Rotate ALL keys NOW. Move to Secrets Manager/SSM. Add to `.gitignore`. |
| **Env variables** | Committed live secrets. | Never commit; inject at deploy; use Parameter Store for non-secret config. |
| **RBAC** | Role enum unused (limitation #8). | Implement Phase 17 RBAC before multi-tenant scale. |
| **Origin lock** | Present (`validate-origin.ts`) but falls back to allow when no origin/referer (Postman/curl) — fine for widgets, but `/knowledge/sources` DELETE lacks ownership check. | Fix #7; add owner-scoped queries. |

---

# PART 8 — MONITORING

| Need | Recommendation | Why |
|---|---|---|
| Metrics | **CloudWatch** (EC2/ALB/Node). Custom metrics for chat latency, LLM errors, embedding failures. | Native, low cost. |
| Dashboards | CloudWatch dashboards or **Grafana** (CloudWatch datasource). | Grafana better for business metrics (leads/conversations). |
| Process manager | **PM2** on EC2 (or systemd) to keep Node alive + cluster mode. | `next start` needs a supervisor; PM2 gives zero-downtime + logs. |
| Health checks | ALB target group `/` or a `/api/health` (add one). | Detect instance failure, drive ASG. |
| Log aggregation | CloudWatch Logs (or Loki). | `logger.ts` currently console-only; ship structured logs. |
| Alerting | CloudWatch Alarms → SNS → Slack/email. | 5xx spike, DB connection exhaustion, LLM 429. |
| Prometheus | Optional if you want fine Node metrics; not mandatory. | Adds ops overhead. |

---

# PART 9 — DEPLOYMENT

| Decision | Recommendation | Rationale |
|---|---|---|
| **OS** | Ubuntu 22.04 LTS | Stable, Node-friendly, free on EC2. |
| **Node** | Node 20 LTS | Matches Next 14 + `tsx`; `.nvmrc`/CI pin it. |
| **Process mgr** | **PM2** (cluster) or systemd | Keep `next start` alive; zero-downtime reload. |
| **Web server** | **ALB + (optional nginx)** | ALB terminates TLS; nginx optional for gzip/rewrites. Next's built-in server is enough behind ALB. |
| **Docker?** | Optional. **Not required** (no Dockerfile exists). | If you want reproducible deploys, add a multi-stage Dockerfile + ECS Fargate. Otherwise PM2 on EC2 is simpler. |
| **CI/CD** | **GitHub Actions** → build → `rsync`/`scp` to EC2 or ECR push. | None exists today; must be created. |
| **Zero downtime** | 2 instances behind ALB + PM2 reload (`pm2 reload`) + ALB draining. | Avoid single-instance downtime. |
| **Rollback** | Keep previous build dir; `pm2 reload` to prior; or Blue/Green on ALB. | Fast revert on bad deploy. |
| **Migrations** | `prisma migrate deploy` in deploy step (uses `DIRECT_URL`). | Required; Prisma 7 needs `prisma.config.ts`. |

Deploy flow (EC2, no container):
1. GitHub Actions: `npm ci`, `npm run build` (runs `prisma generate && next build`).
2. Artifact → EC2 via SCP or pull from ECR.
3. SSH/SSM: `prisma migrate deploy`, `pm2 reload web`.
4. ALB health check passes → old instance drained.

Voice agent: deploy `apps/agent` separately (same or dedicated EC2), run `tsx src/agent.ts start` under PM2/systemd, ensure `LEADPILOT_API_URL` points to the ALB.

---

# PART 10 — COST ESTIMATION (USD)

### Scenario: 1000 users (representative mid-scale), EC2 + Supabase Pro

| Component | Purpose | Required | Monthly | Annual |
|---|---|---|---|---|
| EC2 t3.large (web) | Next.js app | Yes | $60 | $720 |
| EC2 t3.small (voice agent) | LiveKit worker | Yes (voice) | $15 | $180 |
| ALB | TLS + LB | Yes | $16 + $0.008/GB | $25 |
| ACM | SSL cert | Yes | $0 | $0 |
| Route53 | DNS | Yes | $0.50 | $6 |
| EBS 40 GB gp3 | Disk | Yes | $3 | $36 |
| Secrets Manager | API keys | Yes | $1 + $0.05/secret | $7 |
| CloudWatch | Logs/metrics | Yes | $10 | $120 |
| SNS | Alerts | R | $1 | $12 |
| WAF + Shield | DDoS/rate-limit | R | $10 | $120 |
| Supabase Pro | DB/Auth/Vector | Yes | $25 | $300 |
| Data transfer | Egress (~720GB) | Yes | ~$56 | $672 |
| S3 | Backups/logs | R | $3 | $36 |
| **TOTAL** | | | **~$210/mo** | **~$2,500/yr** |

### Scale bands (annual, rough)

| Users | AWS (EC2+ALB+CW+Secrets) | Supabase | Domain/SSL | Total/yr |
|---|---|---|---|---|
| 100 | ~$900 | $25×12=$300 | ~$6 | **~$1,200** |
| 500 | ~$1,400 | $300 | ~$6 | **~$1,700** |
| 1000 | ~$2,150 | $300 | ~$6 | **~$2,500** |
| 5000 | ~$4,500 | $300–$600 | ~$6 | **~$5,500** |
| 10000 | ~$7,000 | $600–$1,200 | ~$6 | **~$8,500** |

Excludes LLM API costs (Groq/Gemini/OpenAI) — billed by provider, scale with usage (separate line item, typically $50–$500/mo at these sizes).

---

# PART 11 — OPTIMIZATION (SAVE MONEY)

1. **Keep Supabase — do NOT add RDS.** Stand up RDS + Aurora would double DB cost and add ops. Supabase already provides PG + pgvector + Auth. *(Saves $15–$200/mo.)*
2. **Do NOT add Redis/ElastiCache.** No caching/queue need exists; adding it is pure cost + complexity. *(Saves $30–$100/mo.)*
3. **Do NOT add S3 unless you persist uploads.** Files are parsed in-memory today; storage is $0. *(Saves $5–$20/mo.)*
4. **Use CloudFront for the widget JS + dashboard static assets.** Reduces EC2 data-transfer egress (cheaper than ALB egress) and improves global widget latency. *(Saves $20–$50/mo at 10k scale + UX win.)*
5. **Right-size EC2 and use Savings Plans** once steady-state is known (1-yr Compute Savings Plan ≈ 40% off). *(Saves ~$300/yr per instance.)*
6. **Offload voice to LiveKit Cloud** (managed) to drop the dedicated agent EC2 instance — only pay per-minute; cheaper than a 24/7 instance at low voice volume. *(Saves $15–$60/mo if voice is light.)*
7. **Fix the vector search** (`vector(3072)` exact `<=>` scan in `retrieval.ts`). At scale, add an **HNSW index** (`CREATE INDEX ... USING hnsw`) so the DB doesn't full-scan chunks per query — avoids needing a bigger DB instance. *(Avoids premature Supabase Team upgrade.)*
8. **Make ingestion async** (currently synchronous in `knowledge/crawl/route.ts`). Under load it will time out. Offload to a background worker (SQS/Lambda) only when needed — but until then, cap crawl size to protect the single instance.
9. **Secret rotation + remove committed `.env`** — not a cost item but prevents a breach that costs far more.

---

# PART 12 — SCALING ROADMAP

```
MVP (today, <100 users)
  └─ 1× EC2 t3.small + ALB + ACM + Route53
     + Supabase Pro + CloudWatch (console logs ok)
     + Secrets in SSM
  Constraint: single web instance (in-memory conversation-memory is fine)

↓ 100 users
  └─ EC2 t3.medium; add 2nd instance behind ALB for HA
     BACK conversation-memory with DB (Phase 16) so multi-instance is safe
     Enable CloudWatch alarms + SNS

↓ 1000 users
  └─ EC2 t3.large ×2 (ASG); Supabase Pro near 8GB limit → watch DB size
     Add HNSW vector index; move crawl/embed to async worker
     Implement RBAC (Phase 17); fix /knowledge/sources ownership (limitation #7)
     CloudFront in front of widget + assets

↓ 10000 users
  └─ EC2 m6i.xlarge ×2–3 ASG; Supabase Team ($599) for PITR + compute + storage
     WAF rate-limiting on public widget/voice endpoints (LLM cost guard)
     Shard by workspace if single DB hot; consider read replica for analytics
     Prometheus/Grafana for deep Node metrics

↓ 100000 users
  └─ Containerize → ECS Fargate / EKS for web + agent (auto-scaled by ALB)
     RDS/Aurora or Supabase Enterprise for DB; separate vector store (pgvector on dedicated instance or purpose-built)
     Event-driven ingestion: SQS + Lambda workers for crawl/embed (decouples from web)
     Multi-region (CloudFront + Route53 latency routing); Redis ONLY if caching proves necessary
     Full RBAC, audit logging, SOC2 controls
```

---

## APPENDIX — FILE CITATIONS (audit trail)

- Monorepo/config: `package.json`, `turbo.json`, `apps/web/package.json`, `apps/agent/package.json`, `apps/widget/vite.config.ts`, `apps/web/next.config.mjs`
- DB/Vector: `apps/web/prisma/schema.prisma` (pgvector L158), `apps/web/lib/prisma.ts`, `apps/web/lib/retrieval.ts`, `apps/web/prisma.config.ts`
- AI: `apps/web/lib/embeddings.ts` (Gemini 3072), `apps/web/app/api/widget/chat/route.ts` (Groq L294, pipeline L371-475), `apps/web/lib/ai-response.ts`, `apps/web/lib/ai-os.ts`, `apps/web/lib/conversation-memory.ts` (in-memory Map L49)
- Auth/Supabase: `apps/web/middleware.ts`, `apps/web/lib/supabase/{client,server,middleware}.ts`, `apps/web/lib/auth.ts`, `apps/web/app/api/auth/bootstrap/route.ts`
- Voice: `apps/agent/src/agent.ts` (OpenAI Realtime L181, LiveKit), `apps/web/app/api/voice/{token,agent-config,rag-context,webhook}/route.ts`
- Knowledge ingest: `apps/web/app/api/knowledge/{upload,ingest,crawl,social,sources}/route.ts`, `apps/web/lib/{document-extractor,crawler,chunker,social-ingest}.ts`
- Storage: confirmed NONE (files parsed in-memory, never stored — `document-extractor.ts`, `upload/route.ts`)
- Widget: `apps/widget/src/main.tsx` (livekit-client), `public-cdn/widget.js`, `apps/web/lib/validate-origin.ts`, `apps/web/lib/traffic-block.ts`, `apps/web/lib/traffic-analytics.ts`
- Placeholders: `apps/web/app/billing/page.tsx`, `apps/web/app/integrations/page.tsx`
- Secrets leakage: `apps/web/.env.local`, `apps/agent/.env` (committed, live credentials)
- Vercel coupling: `apps/web/app/api/widget/config/route.ts` (`@vercel/functions` waitUntil), `apps/web/app/api/projects/route.ts`
- Known limitations: `AGENTS.md`, `AI_HANDOFF.md` (sections 8, 9)

**End of report.**
