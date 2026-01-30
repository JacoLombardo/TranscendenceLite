# Transcendence

**Deployed version of 42 Transcendence.** The app runs with the frontend on Vercel and the backend on Fly.io. Auth uses a Bearer token (returned on login/register and sent in the `Authorization` header) when third-party cookies are blocked; otherwise behaviour matches the original project.
To check the original project: https://github.com/JacoLombardo/42_ft_transcendence.

---

Transcendence is a full-stack multiplayer Pong web app. Players can play locally, online, or in tournaments, chat in real time, manage profiles and friends, and use GitHub OAuth or local login. The UI is available in English, German, French, and Spanish.

## Composition

- **Frontend:** Vite + TypeScript SPA (menu, game views, profile, chat, tournament lobby).
- **Backend:** Fastify + TypeScript API and WebSockets (game state, matchmaking, chat, auth).
- **Database:** PostgreSQL (e.g. Neon) for users, matches, tournaments, messages.
- **Deployed:** Frontend on Vercel, backend on Fly.io; auth works cross-origin via Bearer token when cookies are blocked.

## Features

- Real-time Pong with server-authoritative physics and ~60 FPS state updates.
- Local multiplayer (two players on one keyboard) and online multiplayer over WebSockets.
- Tournament system with bracket matchmaking and 3rd-place + final.
- User accounts: register, login, avatars (Cloudinary), friends, block list.
- GitHub OAuth for passwordless login.
- Live chat with direct messages and game/tournament invites.
- Internationalization: EN, DE, FR, ES.
- Responsive SPA with hash-based routing.

## Technology

- Backend: Fastify, TypeScript, WebSocket (ws), bcryptjs, pg, Cloudinary.
- Frontend: Vite, TypeScript, vanilla JS (no framework).
- Database: PostgreSQL.
- Deploy: Vercel (frontend), Fly.io (backend, Docker).

## Setup

```bash
# Backend
cd backend && npm install
cp .env.example .env   # if present; set DATABASE_URL and optional SESSION_SECRET, FRONTEND_ORIGIN

# Frontend
cd frontend && npm install
```

Run locally (backend and frontend on same machine, or point frontend at backend URL):

```bash
# Terminal 1 – backend
cd backend && npm run dev

# Terminal 2 – frontend (defaults to same origin; or set VITE_API_BASE)
cd frontend && npm run dev
```

With Docker (backend + DB; frontend still usually run with `npm run dev` for dev):

```bash
make up
```

Backend runs on port 4000 by default; frontend dev server on 5173.

## Environment

**Backend (`.env` or Fly secrets):**

- `DATABASE_URL` – PostgreSQL connection string.
- `SESSION_SECRET` – Secret for signing session tokens (set in production).
- `FRONTEND_ORIGIN` – Full frontend URL for OAuth redirects (e.g. `https://your-app.vercel.app`).
- Optional: Cloudinary env vars for avatar uploads; GitHub OAuth client id/secret for OAuth.

**Frontend (build-time / Vercel env):**

- `VITE_API_BASE` – Backend API URL (e.g. `https://your-backend.fly.dev`).
- `VITE_WS_BASE` – Optional; defaults to same as API for WebSocket URL.

## Build

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

## Deploy

- **Backend (Fly):** `cd backend && fly deploy`. Set secrets: `SESSION_SECRET`, `DATABASE_URL`, `FRONTEND_ORIGIN`, and any OAuth/Cloudinary keys.
- **Frontend (Vercel):** Connect the repo to Vercel or run `vercel --prod`. Set `VITE_API_BASE` (and `VITE_WS_BASE` if needed) to the Fly backend URL.

## Notes

- With frontend and backend on different regions, network latency can make the game feel slightly laggy.
- Session cookie is still set with `SameSite=None` and `Secure`; when the browser blocks it (cross-origin), the app uses the Bearer token from the login/register response and sends it on API and WebSocket requests.
