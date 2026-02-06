# CLAUDE.md — Sleeper Draft Assistant

## Project Overview

AI-powered fantasy football draft recommendation app built on the Sleeper platform. Full-stack microservices architecture with a Next.js frontend, FastAPI backend, PostgreSQL database, and shared TypeScript packages. Uses VORP-based ranking with optional OpenAI tie-breaking.

## Repository Structure

```
FantasyFootballApp/
├── app/
│   ├── api/                  # FastAPI backend (Python 3.11)
│   │   ├── main.py           # FastAPI app, routes, caching, recommendation logic
│   │   ├── models.py         # Pydantic request/response models
│   │   ├── database.py       # asyncpg connection pool & initialization
│   │   ├── db_operations.py  # Database CRUD operations
│   │   ├── player_sync.py    # Sleeper player data sync (6hr interval)
│   │   ├── tests/            # Pytest test suite
│   │   ├── requirements.txt  # Production Python deps
│   │   └── requirements-dev.txt # Dev deps (pytest, httpx, pytest-asyncio)
│   │
│   ├── web/                  # Next.js 14 frontend (TypeScript)
│   │   ├── app/              # Next.js App Router (page.tsx, layout.tsx, globals.css)
│   │   ├── components/       # React components (LeagueSelector, DraftBoard, etc.)
│   │   ├── types/            # TypeScript type definitions
│   │   └── package.json      # npm scripts: dev, build, start, lint
│   │
│   └── packages/             # Shared TypeScript monorepo packages
│       ├── core/             # @fantasy-football/core — VORP ranking algorithm
│       └── clients/          # @fantasy-football/clients — Sleeper & OpenAI API clients
│
├── docker-compose.yml        # Local dev: PostgreSQL + API + Web
├── start.sh                  # Local startup script (both services)
└── ARCHITECTURE.md           # Detailed architecture documentation
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript 5, Tailwind CSS 3.3 |
| Backend | Python 3.11, FastAPI 0.104+, Pydantic 2.5+, uvicorn |
| Database | PostgreSQL 16, asyncpg (async), psycopg2-binary |
| AI | OpenAI API (gpt-4o-mini), optional |
| External API | Sleeper API (https://api.sleeper.app) |
| Deployment | Railway (production), Docker Compose (local) |

## Common Commands

### Frontend (app/web/)

```bash
cd app/web
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run lint         # ESLint (eslint-config-next)
```

### Backend (app/api/)

```bash
cd app/api
pip install -r requirements.txt          # Install production deps
pip install -r requirements-dev.txt      # Install dev/test deps
python main.py                           # Start server on port 8000
pytest tests/                            # Run test suite
python test_api.py                       # Manual integration tests
```

### Shared Packages (app/packages/core/, app/packages/clients/)

```bash
npm run build        # Compile TypeScript (tsc)
npm run dev          # Watch mode (tsc --watch)
npm test             # Jest tests
npm run clean        # Remove dist/
```

### Docker (full stack)

```bash
docker-compose up              # Start all 3 services (db, api, web)
docker-compose up --build      # Rebuild and start
docker-compose down            # Stop all services
```

## API Endpoints

All backend routes are defined in `app/api/main.py`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health check |
| GET | `/health` | Detailed health (status, timestamp, cache) |
| GET | `/discover` | Discover user leagues (`?username=&season=`) |
| GET | `/drafts` | Get drafts for league (`?league_id=`) |
| GET | `/picks` | Get draft picks (`?draft_id=`), polled every 3s |
| GET | `/players` | Get all NFL players |
| POST | `/recommend` | Get AI draft recommendations |
| GET | `/players/sync/status` | Player data sync status |

## Environment Variables

Reference: `app/api/env.example`

**Required:**
- `DATABASE_URL` — PostgreSQL connection string
- `ALLOWED_ORIGINS` — CORS origins (comma-separated)

**Optional:**
- `OPENAI_API_KEY` — Enables AI tie-breaking (falls back to deterministic without it)
- `OPENAI_MODEL` — Model to use (default: `gpt-4o-mini`)
- `CACHE_TTL_SECONDS` — API response cache TTL (default: `60`)
- `PLAYER_CACHE_TTL_SECONDS` — Player data cache TTL (default: `21600` / 6hrs)
- `SLEEPER_BASE_URL` — Override Sleeper API base (default: `https://api.sleeper.app`)

## Architecture Decisions

- **Polling over WebSockets**: Frontend polls `/picks` every 3 seconds for live draft updates. Simple and reliable.
- **In-memory caching**: Python dict cache with TTL for Sleeper API responses. No external cache dependency required.
- **Deterministic-first recommendations**: VORP scoring runs without AI. OpenAI only used as optional tie-breaker for top candidates.
- **Database optional for dev**: The API can operate without PostgreSQL for basic Sleeper proxying; DB is needed for persistence features.
- **Monorepo packages**: `@fantasy-football/core` and `@fantasy-football/clients` are standalone TypeScript packages with their own build/test configs.

## Coding Conventions

### Python (Backend)

- **Framework**: FastAPI with async route handlers
- **Models**: Pydantic v2 for all request/response validation
- **Database**: async functions via asyncpg; all DB ops in `db_operations.py`
- **Naming**: snake_case for files, functions, variables
- **Imports**: stdlib first, then third-party, then local modules
- **Error handling**: `HTTPException` for API errors, try/except with logging for external calls

### TypeScript (Frontend)

- **Framework**: Next.js 14 App Router with `'use client'` directives
- **Components**: PascalCase filenames (e.g., `DraftBoard.tsx`), functional components with hooks
- **Types**: Centralized in `types/index.ts`
- **Styling**: Tailwind CSS utility classes with custom theme (sleeper-inspired palette)
- **Path aliases**: `@/*` maps to project root (configured in tsconfig.json)
- **State**: React `useState`/`useEffect` hooks, no external state management library
- **HTTP**: `fetch()` for API calls from components
- **Strict mode**: TypeScript strict mode enabled

### TypeScript (Packages)

- **Build**: `tsc` to `dist/` directory
- **Testing**: Jest with ts-jest
- **Exports**: barrel files via `src/index.ts`

## Testing

### Backend Tests

Located in `app/api/tests/`. Run with `pytest tests/` from `app/api/`.

- `conftest.py` — Fixtures: disables OpenAI during tests (`OPENAI_API_KEY=""`), session-scoped event loop
- `test_health.py` — Health check endpoint assertions
- `test_recommend.py` — Recommendation endpoint tests
- `test_external_endpoints.py` — External API integration tests
- Config in `pyproject.toml`: `pythonpath = ["."]`, quiet output

### Frontend Tests

No frontend test framework is currently configured.

### Package Tests

Jest configured in `app/packages/core/` and `app/packages/clients/` (run `npm test`).

## Database Schema

Tables defined in `app/api/database.py` (created at startup):

- `users` — Sleeper user info
- `leagues` — League definitions
- `user_leagues` — User-league join table
- `drafts` — Draft instances
- `draft_picks` — Individual picks with player/position data
- `players` — NFL player database (synced from Sleeper every 6hrs)
- `recommendations` — Stored recommendation history

## Key Files to Understand

| File | What it does |
|------|-------------|
| `app/api/main.py` | All API routes, caching, recommendation orchestration |
| `app/api/models.py` | Pydantic models for every request/response |
| `app/api/database.py` | Connection pool init, schema creation, health checks |
| `app/api/db_operations.py` | All database CRUD functions |
| `app/api/player_sync.py` | Background player data sync from Sleeper |
| `app/web/app/page.tsx` | Main page: user discovery flow, league/draft selection |
| `app/web/components/DraftBoard.tsx` | Live draft board with polling and recommendations |
| `app/web/components/LeagueSelector.tsx` | League browsing and draft selection UI |
| `app/web/types/index.ts` | All TypeScript interfaces (League, Draft, Pick, Player, etc.) |
| `app/packages/core/src/ranking.ts` | VORP-based ranking algorithm with strategy weighting |
| `app/packages/clients/src/sleeper.ts` | Sleeper API client with caching |

## Ports

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3000 |
| Backend (FastAPI) | 8000 |
| PostgreSQL | 5432 |

## Deployment

Production deployment is on Railway. See `DEPLOYMENT.md` and `RAILWAY_SETUP_GUIDE.md` for details. Each service (`app/api/`, `app/web/`) has its own `Dockerfile` and `railway.toml`.
