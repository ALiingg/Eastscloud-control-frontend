# Personal Management Center — replit.md

## Overview

This is a **Personal Management Center** — a single-user, self-hosted dashboard application. It provides four core features:

1. **Services** — Manage links to self-hosted infrastructure and services (categorized with icons)
2. **Documents** — Create and edit markdown documents with live preview
3. **OTP Authenticator** — Store TOTP secrets and generate 2FA codes in real time
4. **Overview** — Dashboard showing counts and recent activity across all sections

The app is designed for a single admin user only. Registration is locked after the first account is created.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Full-Stack Monorepo Layout

```
/
├── client/          # React frontend (Vite)
├── server/          # Express backend
├── shared/          # Shared types, schema, and route definitions
├── script/          # Build tooling
└── migrations/      # Drizzle DB migrations
```

The `shared/` directory is the key architectural decision — it holds the Drizzle schema, Zod validation schemas, and typed API route definitions used by both the frontend and backend. This eliminates duplication and keeps types in sync.

### Frontend (React + Vite)

- **Framework**: React 18 with TypeScript
- **Routing**: `wouter` (lightweight client-side router)
- **State/Data fetching**: TanStack Query (React Query v5) — all server state is managed via query hooks in `client/src/hooks/`
- **Forms**: `react-hook-form` with `@hookform/resolvers` + Zod validation
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Styling**: Tailwind CSS with CSS variables for theming; supports light and dark mode
- **Fonts**: Geist (sans) and Geist Mono (monospace) via Google Fonts
- **Markdown**: `react-markdown` + `remark-gfm` for document rendering
- **TOTP**: `otpauth` library runs entirely in the browser — no server calls needed for code generation

The frontend lives in `client/src/` and is served by Vite in development. In production it's pre-built and served statically by Express.

### Backend (Express + Node.js)

- **Runtime**: Node.js with TypeScript (run via `tsx`)
- **Framework**: Express.js
- **Session management**: `express-session` with `connect-pg-simple` (sessions stored in PostgreSQL)
- **Authentication**: Custom session-based auth (no Passport). Passwords hashed with `bcrypt` (12 salt rounds). Rate limiting on login/register with lockout after 5 failed attempts.
- **Single-user design**: Registration endpoint checks user count — if any user exists, registration is rejected (403)
- **API routes**: Defined in `server/routes.ts`, typed against `shared/routes.ts`
- **Storage layer**: `DatabaseStorage` class in `server/storage.ts` implements `IStorage` interface, making it easy to swap backends if needed

### Shared Layer (`shared/`)

- **`schema.ts`**: Drizzle ORM table definitions + `drizzle-zod` generated insert schemas + custom Zod schemas
- **`routes.ts`**: Typed API contract (method, path, input schema, response schema) shared between client and server. Frontend hooks import these directly to build URLs and validate responses.

### Database

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM (with `drizzle-kit` for migrations)
- **Connection**: `node-postgres` (pg) Pool via `DATABASE_URL` environment variable
- **Tables**:
  - `users` — single admin account
  - `sessions` — pg-stored sessions (auto-created by connect-pg-simple)
  - `services` — service links with title, URL, icon, category, description
  - `documents` — markdown documents with timestamps
  - `otp_secrets` — TOTP secrets (issuer, account, secret)

### Build System

- **Dev**: `tsx server/index.ts` starts Express + Vite middleware together (single port)
- **Production**: `script/build.ts` runs Vite build (frontend) + esbuild (server bundle into `dist/index.cjs`)
- A carefully maintained allowlist in `script/build.ts` controls which dependencies get bundled into the server (vs. treated as externals) to optimize cold start times

### Authentication Flow

1. On first visit, `GET /api/auth/status` returns `{ hasAdmin: false }` → frontend shows registration form
2. After first user is created, subsequent visits show the login form
3. Sessions are stored in PostgreSQL with a 7-day expiry
4. `requireAuth` middleware guards all resource API routes
5. Session is regenerated on login/register to prevent fixation attacks

---

## External Dependencies

### Required Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for signing Express sessions |

### Key Third-Party Libraries

| Library | Purpose |
|---|---|
| `drizzle-orm` + `drizzle-kit` | Database ORM and migrations |
| `pg` (node-postgres) | PostgreSQL driver |
| `connect-pg-simple` | PostgreSQL session store |
| `express-session` | Session middleware |
| `bcrypt` | Password hashing |
| `otpauth` | TOTP code generation (client-side, browser only) |
| `react-markdown` + `remark-gfm` | Markdown rendering with GitHub Flavored Markdown |
| `@tanstack/react-query` | Server state management and caching |
| `wouter` | Lightweight React router |
| `react-hook-form` + `@hookform/resolvers` | Form state + Zod validation integration |
| `zod` | Schema validation (shared client/server) |
| `shadcn/ui` (Radix UI) | Accessible headless UI component primitives |
| `tailwind-merge` + `clsx` | Conditional className merging |
| `date-fns` | Date formatting utilities |
| `nanoid` | Unique ID generation |
| `lucide-react` | Icon library |

### Replit-Specific Plugins (Dev Only)

- `@replit/vite-plugin-runtime-error-modal` — shows runtime errors in an overlay
- `@replit/vite-plugin-cartographer` — Replit source mapping
- `@replit/vite-plugin-dev-banner` — Replit dev banner

These are only loaded when `REPL_ID` is defined and `NODE_ENV !== "production"`.