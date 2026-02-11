# PMS Platform - Enterprise Performance Management System

A modern, scalable performance management platform built with Node.js, TypeScript, React, and PostgreSQL.

## Quick Start (Docker - Recommended)

**One command to run the full app:**

```bash
git clone https://github.com/agdanish/pms-platform.git
cd pms-platform
docker compose up --build
```

Then open **http://localhost:3002** in your browser.

> **Default login:** Check the seed output in the terminal for the admin credentials.

### Docker Commands

| Command | What it does |
|---------|-------------|
| `docker compose up --build` | Build and start everything |
| `docker compose up -d` | Start in background |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and **wipe database** |
| `docker compose logs -f backend` | Watch API logs |
| `docker compose logs -f frontend` | Watch frontend logs |

### What Docker starts

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3002 | React web app (nginx) |
| **API** | http://localhost:3001 | Express REST API |
| **PostgreSQL** | localhost:5432 | Database |
| **Redis** | localhost:6379 | Cache & queues |

---

## Local Development (Without Docker)

### Prerequisites

- Node.js 20+ and npm 9+
- PostgreSQL 16+
- Redis 7+

### Setup

```bash
# 1. Clone and install (auto-creates .env from .env.example)
git clone https://github.com/agdanish/pms-platform.git
cd pms-platform
npm install

# 2. Start PostgreSQL + Redis via Docker
docker compose -f docker-compose.dev.yml up -d

# 3. Set up database (generate + migrate + seed — one command)
npm run setup

# 4. Start dev servers (API on :3001, Web on :3002)
npm run dev
```

### Dev URLs

- **Web App:** http://localhost:3002
- **API:** http://localhost:3001
- **API Health:** http://localhost:3001/health

---

## Project Structure

```
pms-platform/
├── apps/
│   ├── api/              # Express.js REST API (production)
│   ├── web/              # React + Vite frontend (production)
│   ├── admin/            # Admin dashboard (standalone)
│   └── mobile/           # React Native mobile app (standalone)
├── packages/
│   ├── core/             # Shared business logic & math engine
│   ├── database/         # Prisma schema, migrations & seed
│   └── ui/               # Shared React component library
├── infrastructure/
│   ├── docker/           # Dockerfiles & nginx config
│   └── kubernetes/       # K8s deployment manifests
├── scripts/              # Seed & release scripts
├── docs/                 # Architecture & API documentation
├── docker-compose.yml    # Full stack (production-like)
└── docker-compose.dev.yml # DB + Redis only (for local dev)
```

## Features

### Core Modules
- **Goals Management** - OKRs, SMART goals, cascading alignment
- **Performance Reviews** - Multi-rater reviews, automated workflows
- **Continuous Feedback** - Real-time feedback, peer recognition, 360 surveys
- **Calibration** - AI-assisted rating calibration with bias detection
- **Analytics** - Real-time dashboards and custom reporting
- **Succession Planning** - 9-Box grid, talent pools
- **Compensation** - Modeling, budgets, equity analysis
- **Skills Assessment** - Gap analysis, development plans
- **1-on-1 Meetings** - Scheduling, agendas, action items
- **Career Pathing** - Role progression, recommendations
- **Leaderboard** - Team performance rankings

### Tech Stack

| Layer | Technology |
|-------|------------|
| API | Node.js 20, Express, TypeScript |
| Frontend | React 18, Vite, Tailwind CSS |
| Database | PostgreSQL 16 with Prisma ORM |
| Cache | Redis 7 |
| Auth | JWT + bcrypt |
| Testing | Vitest, Jest |
| Build | Turborepo monorepo |
| Deploy | Docker, Render, Kubernetes-ready |

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register
- `POST /api/v1/auth/refresh` - Refresh token

### Goals
- `GET /api/v1/goals` - List goals
- `POST /api/v1/goals` - Create goal
- `PATCH /api/v1/goals/:id` - Update goal

### Reviews
- `GET /api/v1/reviews` - List reviews
- `POST /api/v1/reviews/cycles` - Create review cycle
- `POST /api/v1/reviews/:id/submit` - Submit review

### Feedback
- `POST /api/v1/feedback` - Give feedback
- `POST /api/v1/recognition` - Give recognition

Full API available at `/health` when running.

## Testing

```bash
npm test                # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests
```

## Deployment

The app is deployed on [Render](https://render.com) via `render.yaml`. Push to `main` triggers automatic deployment.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m 'Add my feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

Proprietary - All rights reserved.
