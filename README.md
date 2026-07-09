# LeadPilot AI

Phase 1 establishes the project foundation and proves the embeddable widget connection end to end:

External site -> `widget.js` loader -> Shadow DOM widget -> Next.js API routes -> hardcoded reply -> widget UI.

AI, voice, billing, RAG, document upload, crawler, and integrations are intentionally left as TODOs for later phases.

## Structure

```txt
apps/
  web/       Next.js 14 dashboard and widget API routes
  widget/    Vite + React embeddable widget bundle
packages/
  config/    shared TypeScript and ESLint config
  types/     shared API/widget types
  ui/        small shared UI primitives
public-cdn/  deployable vanilla widget loader
test-site/   external HTML site for local widget testing
```

## Setup

```bash
npm install
cp .env.example .env.local
npm run db:generate
```

For PostgreSQL persistence, set `DATABASE_URL` and run:

```bash
npm run db:migrate
npm run db:seed
```

If `DATABASE_URL` is empty, the API uses a local in-memory demo project with `clientId` set to `demo-client-id`. That is only for proving the Phase 1 pipe without a database.

## Run Locally

Start the web API/dashboard and widget dev bundle:

```bash
npm run dev
```

The web app runs on `http://localhost:3000`.
The widget dev bundle runs on `http://localhost:5174/widget.js`.

Open the dashboard:

```txt
http://localhost:3000/projects
```

Open the external test site by serving or opening:

```txt
test-site/index.html
```

The test page loads `public-cdn/widget.js`, passes `demo-client-id`, starts a conversation, sends chat messages to `/api/widget/chat`, and displays the hardcoded reply.

## Phase 1 API

All widget API responses use:

```ts
{ success: true, data: { ... } }
{ success: false, error: "message" }
```

Routes:

```txt
GET  /api/widget/config?clientId=demo-client-id
POST /api/widget/conversation/start
POST /api/widget/chat
```

Hardcoded reply matching lives in `apps/web/app/api/widget/chat/route.ts` and is marked with the TODO for the future OpenAI + pgvector RAG implementation.

## Local Snippet

```html
<script
  async
  src="http://localhost:3000/widget.js"
  data-client-id="demo-client-id"
  data-api-url="http://localhost:3000"
  data-widget-src="http://localhost:5174/widget.js">
</script>
```
