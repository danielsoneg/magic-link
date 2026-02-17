# Magic Link

Share magic login links with friends. Deployed at `https://login.egd.news`.

## Quick Reference

```bash
npm run dev          # Start backend + frontend concurrently
npm run build        # Build both workspaces (backend then frontend)
npm run start        # Start production backend (serves frontend static files)
npm run cli          # Run CLI tools (e.g. passkey reset)
```

## Project Structure

```
backend/     # Fastify API server (TypeScript)
frontend/    # React SPA (Vite + TypeScript)
cli/         # Admin CLI tools
chart/       # Helm chart for K8s deployment
```

This is an npm workspaces monorepo (`backend`, `frontend`, `cli`).

## Tech Stack

- **Backend:** Fastify, SQLite (better-sqlite3), Drizzle ORM, WebAuthn (@simplewebauthn)
- **Frontend:** React 18, React Router, Vite — inline styles, no CSS framework
- **Auth:** Passkeys (WebAuthn). Email integration via Fastmail JMAP API (polling-based; EventSource does not work for third-party clients).
- **IDs:** nanoid for all primary keys

## Development

Backend dev server runs on port 3000. Frontend Vite dev server runs on port 5173 and proxies `/api` to the backend.

Environment variables go in `.env` at the repo root (see `.env.example`).

## Building & Type Checking

```bash
npx tsc --noEmit                          # Type-check everything
npm run build -w frontend                 # Frontend: tsc + vite build → frontend/dist/
npm run build -w backend                  # Backend: tsc → backend/dist/
```

There are no tests or linting tools configured. TypeScript strict mode is the primary safety net.

## Code Conventions

- **Backend routes:** Export async functions taking `FastifyInstance`. Use typed generics for Body/Params.
- **Frontend API:** Centralized `api.ts` with typed `request<T>()` helper. Interfaces defined per-page.
- **Database:** Drizzle schema uses camelCase in TS, maps to snake_case in SQL.
- **Files:** Components are PascalCase (`ServiceCard.tsx`), other TS files are camelCase (`authRoutes.ts`).
- **Styling:** Inline style objects — no CSS files or framework.
- **Error responses:** `reply.status(4xx).send({ error: '...' })`

## Deployment

- **Docker:** Multi-stage build on Node 20 Alpine. Runs as non-root uid 1001. Exposes port 3000.
- **CI:** GitHub Actions builds and pushes to `ghcr.io/danielsoneg/magic-link` on push to main, then auto-bumps `chart/magic-link/Chart.yaml` appVersion.
- **Flux:** Detects changes via `Chart.yaml` version field — bump the version number for Flux to pick up changes.
- **Helm chart:** Uses Gateway API HTTPRoute, ExternalSecrets (1Password), PVC for SQLite data. Recreate strategy (not rolling) due to SQLite.
