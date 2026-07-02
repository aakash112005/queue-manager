# Queue Manager

A full-stack queue / token management app. A manager signs in, creates named
queues (e.g. "Front Desk", "Pharmacy Counter"), adds people to a queue as
tokens, reorders them, calls the next person up for service, cancels tokens,
and reviews a wait-time / queue-length analytics dashboard.

```
queue-app/
├── backend/     Node.js + Express REST API (JSON-file storage, JWT auth)
└── frontend/    React (Vite) single-page app
```

## Feature checklist (against the brief)

| # | Requirement | Where it lives |
|---|-------------|-----------------|
| 1 | Manager login, create queues | `POST /api/auth/*`, `POST /api/queues` |
| 2 | Each queue has a name | `queues.name` |
| 3 | Add tokens to a queue | `POST /api/queues/:id/tokens` |
| 4 | List of people waiting | `GET /api/queues/:id/tokens` → Queue page |
| 5 | Move tokens up/down | `PATCH /api/tokens/:id/move` |
| 6 | Assign top token for service (one click) | "Call next" button → `POST /api/tokens/:id/assign` |
| 7 | Cancel a token | `DELETE /api/tokens/:id` |
| 8 | Analytics dashboard (wait times, length trends) | `GET /api/analytics/overview`, Analytics page |

## Quick start

You need Node.js 18+ installed. Two terminals:

**1. Backend**

```bash
cd backend
cp .env.example .env      # edit JWT_SECRET if you like
npm install
npm start                 # http://localhost:4000
```

**2. Frontend**

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Open `http://localhost:5173`, register a manager account, and start creating
queues. The Vite dev server proxies `/api/*` to the backend on port 4000
(see `frontend/vite.config.js`), so no CORS setup is needed in development.

### Production build

```bash
cd frontend && npm run build
```

This outputs static files to `frontend/dist/`. Serve them with any static
host (or point Express at that folder) and run the backend separately, or
put both behind a reverse proxy.

## Architecture & design notes

**Backend — Node.js + Express**
- **Auth**: username/password, hashed with `bcryptjs`, sessions are stateless
  JWTs (`jsonwebtoken`) sent as `Authorization: Bearer <token>`.
- **Storage**: a small file-backed JSON "database" (`backend/db.js`) instead
  of a real database, to keep the assignment runnable with zero setup. All
  reads/writes go through a single in-process write queue so concurrent
  requests can't corrupt the file. Swapping this for Postgres/Mongo later
  only touches `db.js` — the routes just call `load()`/`transact()`.
- **Ordering**: each waiting token has an integer `position` per queue.
  Moving a token up/down swaps `position` with its neighbor — O(1), and
  avoids re-writing every row's index on every move.
- **Analytics**: every state change (`joined`, `called`, `completed`,
  `cancelled`) is appended to an `events` log with a timestamp. The
  analytics endpoint replays that log to reconstruct "how many people were
  waiting at time T" (for the queue-length chart) and computes wait/service
  time by diffing `createdAt` → `calledAt` → `completedAt` on each token.
- **Authorization**: every queue/token route checks `queue.managerId`
  against the authenticated manager, so managers can only see and modify
  their own queues.

**Frontend — React + Vite**
- Plain CSS with a small design-token system (`src/styles.css`) rather than
  a UI kit, styled around a "ticket counter" motif: perforated ticket rows,
  a mono typeface for ticket numbers, and an amber "now serving" board.
- `src/api.js` is a thin fetch wrapper that attaches the JWT and normalizes
  errors — every page just calls `api.xyz(...)`.
- Pages: `Login`, `Dashboard` (queue list + create), `QueueView` (roster,
  reorder, call next, cancel), `Analytics` (metrics + `recharts` charts).

## API summary

All routes except `/api/auth/register` and `/api/auth/login` require
`Authorization: Bearer <token>`.

```
POST   /api/auth/register            { username, password }
POST   /api/auth/login               { username, password }
GET    /api/auth/me

GET    /api/queues                   list my queues
POST   /api/queues                   { name }
GET    /api/queues/:id
DELETE /api/queues/:id

GET    /api/queues/:id/tokens        { waiting[], serving[], history[] }
POST   /api/queues/:id/tokens        { label, note? }

PATCH  /api/tokens/:id/move          { direction: "up" | "down" }
POST   /api/tokens/:id/assign        call this token up (must be top of queue)
POST   /api/tokens/:id/complete      mark a serving token as done
DELETE /api/tokens/:id               cancel a token

GET    /api/analytics/overview       metrics across all my queues
GET    /api/analytics/queue/:id      metrics for one queue
```

## Known trade-offs (by design, for a take-home scope)

- JSON-file storage instead of a real database — fine for a demo/single
  instance, called out in `db.js` for where to swap it.
- No password-reset flow / email verification.
- "Serving" supports multiple simultaneous tokens (useful if a queue feeds
  several counters); the brief's single "assign top token" flow is enforced
  by only allowing the token currently at position 1 to be assigned.

## Publishing to GitHub

```bash
cd queue-app
git init
git add .
git commit -m "Queue manager: full-stack app"
git branch -M main
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```
