# Deployed Version (42 Transcendence)

**Disclaimer:** This is the deployed version of 42 Transcendence. The following features have been changed or removed for deployment's sake. The app is hosted with the frontend on Vercel and the backend on Fly.io.

---

## What Changed for Deployment

### Authentication & Cookies

- **Third-party cookie workaround:** Browsers often block third-party cookies when the frontend (Vercel) and backend (Fly) are on different domains. To keep login working:
  - The backend **returns the session token in the JSON body** on login and register (in addition to setting the `sid` cookie).
  - The frontend **stores this token** (e.g. in `sessionStorage`) and sends it via the **`Authorization: Bearer <token>`** header on API requests.
  - WebSocket connections can send the token as a **`?token=...`** query parameter when the cookie is not sent.
- Session cookies still use **`SameSite=None`** and **`Secure`** in production so that, when cookies are allowed, they work across origins. The Bearer token is used when cookies are blocked.

### Infrastructure

- **Frontend:** Deployed on **Vercel** (separate origin from the backend).
- **Backend:** Deployed on **Fly.io** (e.g. `transcendence-lite-backend.fly.dev`).
- **Database:** Unchanged (e.g. Neon Postgres); ensure the backend has the correct `DATABASE_URL` and other env vars on Fly.
- **CORS:** Backend allows credentials and reflects the request origin so that the Vercel frontend can call the API and send cookies when allowed.

### Optional / Environment

- **`SESSION_SECRET`:** Should be set on Fly (and kept secret). If unset, the app falls back to a default (suitable only for development).
- **`FRONTEND_ORIGIN`:** Used for OAuth redirects; should point to the Vercel app URL (e.g. `https://transcendence-lite.vercel.app`).
- **`NODE_ENV`:** Not required for cookie behavior; the backend infers HTTPS from `X-Forwarded-Proto` when behind Fly's proxy.

### What Was Not Removed

- Core features (registration, login, OAuth, profile, friends, block list, chat, local/online/tournament games) are unchanged.
- Internationalization (EN, DE, FR) is unchanged.
- Game logic, WebSockets, and database schema are the same as in the original 42 Transcendence project.

---

## Deploying

- **Backend (Fly):** From the `backend` directory: `fly deploy`. Ensure secrets (e.g. `SESSION_SECRET`, `DATABASE_URL`) are set in the Fly app.
- **Frontend (Vercel):** Connect the repo to Vercel or run `vercel --prod` from the project root. Set `VITE_API_BASE` (and `VITE_WS_BASE` if needed) to the Fly backend URL so the frontend talks to the correct API and WebSockets.

---

## Latency Note

With the frontend and backend on different providers/regions, network latency can make the game feel slightly laggy. Improving that would require larger changes (e.g. same region, client-side prediction, or edge/regional backends).
