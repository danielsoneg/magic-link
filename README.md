# Magic Link

Share magic login links with friends. Monitors a Fastmail catch-all inbox for magic/login emails, extracts the login URLs, and serves them through a web UI with passkey authentication.

## How it works

1. Set up a catch-all domain on Fastmail (e.g., `share.example.com`)
2. When you need to share access, set the account's email to `servicename@share.example.com`
3. Magic Link polls the inbox, extracts login links, and organizes them by service
4. Friends log in with passkeys and grab the links they need

## Stack

- **Backend**: Fastify, SQLite (Drizzle ORM), Fastmail JMAP
- **Frontend**: React, Vite, React Router
- **Auth**: WebAuthn passkeys
- **Deploy**: Docker

## Quick start

```bash
# Clone and install
npm install

# Copy env and fill in your values
cp .env.example .env

# Run in development (backend + frontend concurrently)
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to the backend on port 3000.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FASTMAIL_USERNAME` | Yes | | Your Fastmail username |
| `FASTMAIL_APP_PASSWORD` | Yes | | Fastmail app-specific password |
| `FASTMAIL_DOMAIN` | Yes | | Catch-all domain to monitor |
| `ADMIN_EMAIL` | Yes | | Email for the first admin user |
| `PORT` | No | `3000` | Backend port |
| `SESSION_SECRET` | No | random | Cookie signing secret |
| `POLL_INTERVAL_MS` | No | `30000` | Email poll frequency (ms) |
| `LINK_RETENTION_HOURS` | No | `24` | How long to keep links |
| `RP_ID` | No | `localhost` | WebAuthn relying party ID |
| `RP_NAME` | No | `Magic Link` | WebAuthn relying party name |
| `ORIGIN` | No | `http://localhost:3000` | App origin for WebAuthn |
| `DB_PATH` | No | `./data/magic-link.db` | SQLite database path |

## Production (Docker)

```bash
docker compose up -d
```

Set `RP_ID`, `ORIGIN`, and `SESSION_SECRET` in your `.env` for production. The Dockerfile builds both frontend and backend into a single container.

## Admin setup

1. Start the app and register with the email matching `ADMIN_EMAIL`
2. You'll automatically become an admin
3. Use the Admin panel to create invite links for friends
4. Friends register via invite links using passkeys

## CLI

Reset a user's passkeys (useful if locked out):

```bash
npm run cli -- reset-passkey user@example.com
```

## Project structure

```
backend/
  src/
    config.ts          # Environment config
    db/                # SQLite schema, migrations
    middleware/         # Auth middleware
    routes/            # API endpoints (auth, services, links, users, invites)
    services/          # Email poller, link extractor, cleanup jobs
frontend/
  src/
    api.ts             # API client
    auth.ts            # WebAuthn helpers
    components/        # ServiceCard, LinkCard, Layout
    pages/             # Login, Register, Invite, Services, ServiceLinks, Admin
cli/
  reset-passkey.ts     # Passkey reset utility
```
