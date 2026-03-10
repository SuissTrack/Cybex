# Kairos — AI Job Application Agent

> Automate your Swiss & French job search with AI. Kairos discovers jobs across LinkedIn, Indeed, jobs.ch, jobup.ch, and Welcome to the Jungle, then applies for you using Claude AI and Playwright.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [Quick Start (Docker)](#quick-start-docker)
4. [Local Development](#local-development)
5. [Environment Variables](#environment-variables)
6. [Database](#database)
7. [API Reference](#api-reference)
8. [Deployment](#deployment)
9. [Legal & Ethics](#legal--ethics)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        KAIROS PLATFORM                       │
├────────────┬─────────────┬──────────────┬────────────────────┤
│  Frontend  │   Backend   │  Automation  │   Infrastructure   │
│  Next.js   │  Express    │  Playwright  │                    │
│  React 18  │  TypeScript │  + Claude AI │  PostgreSQL 16     │
│  Tailwind  │  Prisma ORM │              │  Redis 7           │
│  Zustand   │  BullMQ     │              │  Docker Compose    │
└────────────┴─────────────┴──────────────┴────────────────────┘
```

### Module Map

| Module | Port | Description |
|--------|------|-------------|
| `frontend/` | 3000 | Next.js 14 App Router, React Query, Zustand |
| `backend/` | 4000 | Express API, JWT auth, Prisma, BullMQ |
| `automation-engine/` | — | Playwright scrapers + applicator, Claude AI |
| `database/` | 5432 | PostgreSQL + Prisma schema, seeds |

---

## Features

- **Authentication** — Signup, login, logout, password reset via email
- **Profile** — CV upload (PDF/DOCX), skills, experience, job preferences
- **Job Aggregator** — Scrapes 5 platforms: LinkedIn, Indeed, jobs.ch, jobup.ch, WTTJ
- **AI Matching** — Match score computed per job based on profile preferences
- **Automated Applications** — Playwright fills forms, uploads CV, generates cover letters with Claude
- **Application Tracker** — Dashboard with stats, status filters, cover letter review
- **Security** — JWT + refresh token rotation, rate limiting, input validation, Helmet

---

## Quick Start (Docker)

### Prerequisites
- Docker Desktop ≥ 4.28
- Claude API key (get one at [console.anthropic.com](https://console.anthropic.com))

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env — minimum required:
# JWT_SECRET, JWT_REFRESH_SECRET, CLAUDE_API_KEY
```

### 2. Generate secrets

```bash
# macOS / Linux
openssl rand -base64 64  # → JWT_SECRET
openssl rand -base64 64  # → JWT_REFRESH_SECRET
```

### 3. Start everything

```bash
docker compose up --build
```

This starts: PostgreSQL → Redis → Backend → Automation Engine → Frontend

### 4. Initialise the database

```bash
docker compose exec backend npx prisma migrate deploy --schema=../database/schema.prisma
docker compose exec backend npm run seed
```

### 5. Open the app

```
http://localhost:3000
```

**Demo credentials:** `demo@kairos.app` / `Demo1234!`

---

## Local Development

### Prerequisites
- Node.js ≥ 20
- npm / pnpm
- PostgreSQL 16 + Redis (via Docker or local)

### Start infrastructure only

```bash
docker compose up postgres redis -d
```

### Backend

```bash
cd backend
npm install
cp ../.env.example .env.local
npx prisma generate --schema=../database/schema.prisma
npx prisma migrate dev --schema=../database/schema.prisma
npm run dev  # → http://localhost:4000
```

### Automation Engine

```bash
cd automation-engine
npm install
npx playwright install chromium
npm run dev
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev  # → http://localhost:3000
```

### Seed demo data

```bash
cd backend
DATABASE_URL=postgresql://kairos:kairos_secret@localhost:5432/kairos_db \
  npx ts-node ../database/seed.ts
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection URL |
| `JWT_SECRET` | ✅ | Access token signing secret (min 64 chars) |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret |
| `CLAUDE_API_KEY` | ✅ | Anthropic Claude API key |
| `FRONTEND_URL` | ✅ | Frontend origin for CORS |
| `NEXT_PUBLIC_API_URL` | ✅ | Backend URL for the frontend |
| `SMTP_HOST/PORT/USER/PASS` | ⚠️ | SMTP for password reset emails |
| `SCRAPER_CRON` | ➕ | Cron expression for scraping (default: `0 */6 * * *`) |
| `SCRAPER_HEADLESS` | ➕ | `true` for headless browser (default: `true`) |
| `UPLOAD_DIR` | ➕ | CV/screenshot upload directory |

---

## Database

### Schema overview

```sql
users           -- auth credentials
refresh_tokens  -- JWT refresh token store
profiles        -- personal info, CV, skills
job_preferences -- desired titles, locations, salary, contract types
jobs            -- scraped job listings (all sources)
applications    -- user's application records + status
automation_logs -- step-by-step logs from Playwright engine
```

### Migrations

```bash
# Create a new migration
npx prisma migrate dev --name your_migration_name --schema=database/schema.prisma

# Apply all pending migrations (production)
npx prisma migrate deploy --schema=database/schema.prisma
```

### Prisma Studio (visual DB browser)

```bash
cd backend && npx prisma studio --schema=../database/schema.prisma
```

---

## API Reference

All endpoints prefixed `/api`. Protected routes require `Authorization: Bearer <accessToken>`.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login → tokens |
| POST | `/auth/refresh` | — | Rotate refresh token |
| POST | `/auth/logout` | ✅ | Revoke refresh token |
| POST | `/auth/forgot-password` | — | Send reset email |
| POST | `/auth/reset-password` | — | Reset with token |
| GET | `/auth/me` | ✅ | Current user |

### Profile

| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile` | Full profile + preferences |
| PUT | `/profile` | Update personal info |
| PUT | `/profile/preferences` | Update job preferences |
| POST | `/profile/cv` | Upload CV (multipart) |

### Jobs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/jobs` | List jobs (paginated, filterable) |
| GET | `/jobs/:id` | Get single job |

Query params: `q`, `source`, `remote`, `location`, `page`, `limit`

### Applications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/applications` | List with stats |
| GET | `/applications/:id` | Single + automation logs |
| POST | `/applications` | Queue automated application |
| PATCH | `/applications/:id` | Update status/notes |
| DELETE | `/applications/:id` | Remove |

### Automation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/automation/scrape` | Trigger manual scrape |
| GET | `/automation/logs` | Automation log history |

---

## Deployment

### Vercel + Railway (recommended for MVP)

**Frontend → Vercel**
```bash
cd frontend && npx vercel deploy --prod
# Set NEXT_PUBLIC_API_URL in Vercel dashboard
```

**Backend + DB + Redis → Railway**
1. Create new Railway project
2. Add PostgreSQL and Redis plugins
3. Deploy `backend/` as Node.js service
4. Set env vars, run `npx prisma migrate deploy`

**Automation Engine → Fly.io**
```bash
cd automation-engine
fly launch --dockerfile ../docker/automation.Dockerfile
fly secrets set CLAUDE_API_KEY=... REDIS_URL=... DATABASE_URL=...
fly deploy
```

### Production Docker

```bash
docker compose up -d
docker compose up -d --scale automation=2  # scale workers
```

### Health check

```
GET /api/health → { "status": "ok", "db": "connected" }
```

---

## Project Structure

```
kairos/
├── frontend/                 # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── (auth)/      # login, signup, forgot-password
│       │   ├── (app)/       # dashboard, jobs, applications, profile
│       │   └── onboarding/
│       ├── components/
│       │   ├── layout/      # Sidebar, TopBar
│       │   └── ui/          # Button, Input, Label, Toaster
│       ├── store/           # Zustand auth store
│       ├── hooks/           # useToast
│       └── lib/             # api.ts, utils.ts
│
├── backend/                  # Express + TypeScript API
│   └── src/
│       ├── routes/          # auth, profile, jobs, applications, automation
│       ├── services/        # email, cvParser, matching, queue
│       ├── middleware/       # auth, rateLimit, errorHandler, validate
│       └── lib/             # prisma, redis, jwt, logger
│
├── automation-engine/        # Playwright + Claude AI
│   └── src/
│       ├── scrapers/        # linkedin, indeed, jobsch, jobupch, wttj
│       ├── applicator/      # index.ts (orchestrator), formFiller.ts
│       ├── workers/         # applicationWorker, scrapeWorker
│       └── lib/             # browser, claude, prisma, redis, logger
│
├── database/
│   ├── schema.prisma        # Full Prisma schema
│   └── seed.ts              # Demo data seeder
│
├── docker/
│   ├── backend.Dockerfile
│   ├── automation.Dockerfile
│   └── frontend.Dockerfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Legal & Ethics

> **Important:** Review each platform's Terms of Service before commercial use.

- **LinkedIn**: Official LinkedIn Jobs API required for commercial use. Scraper included for educational/personal use only.
- **Indeed**: [Official Publisher API](https://developer.indeed.com/) available for production.
- **jobs.ch / jobup.ch**: Check robots.txt and current ToS.
- **Welcome to the Jungle**: Partner API available.

**Responsible scraping practices implemented:**
- 1.5–4 second delays between requests
- Human-like browser fingerprinting (stealth context)
- Max 10–15 jobs per search term per run
- No resale of scraped data

---

## License

MIT
