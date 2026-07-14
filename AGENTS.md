# LeadPilot AI — Analytics / CRM Persistence (Phases 14–15.5) + Cleanup/Polish

## Objective
- Build LeadPilot AI Analytics (Phase 14) + Intelligent CRM/Live Dashboard (Phase 15) + durable Prisma persistence (Phase 15.5): expose/visualize already-generated AI-OS intelligence in a premium SaaS UI — no new AI, no prompt/RAG/flow/lead-scoring/AI-OS/memory/widget changes, no fake data.
- Pre-Phase-16 cleanup/polish: remove placeholder/debug intelligence rows, compute previously-null/zero metrics from the Message/Conversation tables, populate realistic demo data for visual validation.

## Important Details
- `prisma/schema.prisma` datasource has NO `url`/`directUrl` (Prisma 7 forbids it); `prisma.config.ts` supplies the migration URL via `DIRECT_URL`/`DATABASE_URL`.
- Client components import `@/lib/analytics/types` (never the `@/lib/analytics` barrel — it pulls `pg`→`fs`/`net` into the browser). CRM client components use `import type` only.
- `npm run lint` CANNOT run (ESLint unconfigured interactive prompt) — pre-existing. `npm run typecheck` (`tsc --noEmit`) passes; `npm run build` passes.
- `runAIOS` (lib/ai-os.ts) is deterministic and pure; given `memory`/`analysis`/`recommendation` it returns a fully-populated `LeadPilotAIOS`. `persistConversation` (lib/intelligence-store.ts) persists it — proven to work with real-shaped AIOS (empty memory + undefined analysis both OK).
- Route gate: `app/api/widget/chat/route.ts:371` `if (chunkCount > 0)` — only conversations on a project WITH knowledge chunks call `persistConversation` (L409, inside a swallow-try-catch L410-411 that hides errors). The 211 historical conversations predate this wiring → never persisted.
- `MessageRole` enum values are stored uppercase: `USER` / `ASSISTANT` (see lib/widget-store.ts:199/206). Comparing `m.role === "ASSISTANT"` is valid (enum members are string literals).

## Work State
### Completed
- Phase 14/15/15.5 (per prior summary): analytics platform, CRM service layer + UI, Prisma-backed persistence of all 5 intelligence models, migration applied + resolved.
- **Cleanup:** Confirmed ALL intelligence rows were orphan test data from diagnostic harnesses (`__trace_1784052468764__`, `__trace_aio__`, with placeholder values "g"/"s"/"p"/"John Doe"). TRUNCATED the 5 intelligence tables (ConversationIntelligence, LeadProfile, BusinessProfile, AnalyticsSnapshot, TimelineEvent) → all 0.
- **Metrics fix:** `lib/analytics/messages.ts` (new) `computeMessageStats()` reads Conversation/Message tables:
  - `avgMessages` = total messages ÷ conversations (scoped to the exact persisted conversation-id set for consistency with `totalConversations`).
  - `avgResponseLength` = avg char length of ASSISTANT messages.
  - `avgConversationDurationMin` = avg of (last Message.createdAt − Conversation.createdAt) in minutes. Replaces the old timeline-based `conversationDurationMinutes` usage in overview.ts.
  - Wired into `lib/analytics/index.ts` `getAnalytics()` and `lib/analytics/overview.ts` `calculateOverview()` (now accepts `messageStats`). `rangeStart` exported from util.ts.
- **Dashboard polish:** `components/analytics/AnalyticsDashboard.tsx` stat cards updated — "Avg Duration", "Avg Messages", and a new "Avg Response Length" card now show real computed values with accurate hints (removed stale "Not tracked"/"Not enough timeline data").
- **Seed:** `scripts/seed-conversations.ts` generates 18 realistic conversations (5 industry scenarios) via the REAL `runAIOS` + `persistConversation` + Message-table paths (no LLM). Verified: analytics now returns avgMessages 5.7, avgConversationDurationMin 11.1m, avgResponseLength 69 (consistent global/project), 104 timeline events.
- CRM pages verified to read the same persistence layer (`getAllPersisted`/`getPersistedIntelligence`), so they surface the same intelligence.

### Active / Blocked
- None. Awaiting user direction for Phase 16.
- NOTE: `scripts/clear-data.ts` is a PRE-EXISTING user script that `DELETE FROM "Lead"` and `"Conversation"` (and cascades Messages). Do NOT run it unless intending a full wipe — it would also delete the seeded demo conversations.

## Next Move
- User to review the now-populated analytics dashboard + CRM pages (real computed metrics, no placeholder "g/s/p" values).
- Optionally extend `scripts/seed-conversations.ts` scenarios or counts (`SEED_COUNT` env) for broader demos.
- Proceed to Phase 16 when the user confirms the polish pass is sufficient.

## Relevant Files
- `apps/web/lib/analytics/messages.ts` — NEW: `computeMessageStats()` (Message/Conversation-based metrics).
- `apps/web/lib/analytics/overview.ts` — `calculateOverview(records, messageStats?)` now uses computed duration/messages/response-length instead of null/timeline.
- `apps/web/lib/analytics/index.ts` — `getAnalytics()` calls `computeMessageStats` scoped to persisted conversation ids.
- `apps/web/lib/analytics/util.ts` — `rangeStart` now exported.
- `apps/web/components/analytics/AnalyticsDashboard.tsx` — stat cards for Avg Duration / Avg Messages / Avg Response Length.
- `apps/web/lib/intelligence-store.ts` — `persistConversation` (L272) + bulk reads; unchanged except confirmed correct.
- `apps/web/app/api/widget/chat/route.ts` — L371 gate, L408-412 swallow-catch persist.
- `apps/web/scripts/seed-conversations.ts` — demo data generator (run: `npx tsx scripts/seed-conversations.ts`).
- `apps/web/scripts/check-analytics.ts` — prints overview metrics for global/project.
- `apps/web/scripts/clear-data.ts` — pre-existing full-wipe script (do not run casually).
