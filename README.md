<div align="center">

# PMS Platform

### Enterprise Performance Management System

**A production-grade, multi-tenant SaaS platform for managing employee performance, goals, reviews, and organizational growth — powered by AI.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

**131 Routes** · **129 Database Models** · **11 AI Agents** · **3 Apps** · **6 Packages**

</div>

---

## ⚡ Quick Start (3 Commands)

> **Prerequisites:** [Node.js 18+](https://nodejs.org/), [Docker Desktop](https://www.docker.com/products/docker-desktop/), [Git](https://git-scm.com/)

```bash
# 1. Clone & install
git clone https://github.com/agdanish/pms-platform.git
cd pms-platform
npm install

# 2. Start databases & setup
docker compose up -d db redis
npm run setup

# 3. Run the platform
npm run dev
```

Then open **http://localhost:3002** and log in:

| Account | Email | Password |
|---------|-------|----------|
| Super Admin | `admin@pms-platform.com` | `admin123` |
| Demo Admin | `admin@demo.com` | `demo123` |

> **Super Admin** has platform-wide access across all tenants. **Demo Admin** is a tenant admin for the Demo Company.

---

## 🔑 Configure API Keys

Edit `.env.example` in the project root, then re-run `npm run setup` to propagate changes:

```env
# SMTP Email (required for invitations, alerts, password resets)
# Get a Gmail App Password: https://myaccount.google.com/apppasswords
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

# AI Features (set at least one — both offer free tiers)
# Groq (fast inference): https://console.groq.com/keys
GROQ_API_KEY=your-groq-api-key

# Google Gemini: https://aistudio.google.com/apikey
GEMINI_API_KEY=your-gemini-api-key
```

<details>
<summary><strong>📋 All Environment Variables</strong></summary>

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@127.0.0.1:5433/pms_dev` | PostgreSQL connection |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection |
| `JWT_SECRET` | `pms-development-jwt-secret-key-32chars` | JWT signing secret (32+ chars) |
| `JWT_EXPIRES_IN` | `8h` | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token expiry |
| `SESSION_SECRET` | `pms-development-session-secret-32ch` | Session signing secret |
| `ENCRYPTION_KEY` | `pms-dev-encryption-key-32chars!!` | AES-256-GCM key (32 chars) |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password / app password |
| `GROQ_API_KEY` | — | Groq API key (free) |
| `GEMINI_API_KEY` | — | Google Gemini API key (free) |
| `AI_PRIMARY_PROVIDER` | `groq` | Primary AI provider: `groq` or `gemini` |
| `AI_MAX_TOKENS` | `4096` | Max tokens per AI response |
| `MFA_ISSUER` | `PMS Platform` | TOTP authenticator label |
| `LOG_LEVEL` | `debug` | Log level: debug, info, warn, error |
| `APP_URL` | `http://localhost:3002` | Frontend URL (used in email links) |

</details>

---

## 🏗️ Architecture

```
pms-platform/
├── apps/
│   ├── api/          ← Express.js REST API (Port 3001)
│   ├── web/          ← React + Vite SPA (Port 3002)
│   ├── admin/        ← Super Admin Dashboard (Port 5174)
│   └── mobile/       ← React Native (Expo)
├── packages/
│   ├── core/         ← Business logic, math engine, utilities
│   ├── database/     ← Prisma schema (129 models) + seed
│   ├── events/       ← Event bus
│   ├── ui/           ← Shared UI components
│   └── ui-charts/    ← Chart components
├── docker-compose.yml
├── .env.example       ← All configurable variables
└── turbo.json         ← Turborepo build orchestration
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 7, TailwindCSS 4, Zustand, React Query, Recharts |
| **Backend** | Express.js, TypeScript, Prisma ORM, Socket.io |
| **Database** | PostgreSQL 16 (primary), Redis 7 (cache, sessions, pub-sub) |
| **AI** | Groq (Llama 3), Google Gemini — multi-provider with auto-fallback |
| **Auth** | JWT (access + refresh), bcrypt, TOTP MFA, RBAC + ABAC |
| **Email** | Nodemailer + Gmail SMTP (15+ HTML templates) |
| **Build** | Turborepo monorepo, Docker Compose |
| **Deploy** | Render.com (auto-deploy from `main`) |

---

## ✨ Features

### 🏢 Multi-Tenant SaaS

<table>
<tr><td width="50%">

**Tenant Isolation**
- Row-level `tenantId` on all 129 models
- JWT-based tenant context extraction
- Cross-tenant access blocking with audit logging
- Subscription guard (blocks writes for expired tenants)

</td><td width="50%">

**Licensing & Billing**
- Seat-based licensing with plan caps (FREE / STARTER / PROFESSIONAL / ENTERPRISE)
- License capacity alerts (90%, 95%, 100%)
- Subscription expiry alerts (30, 15, 7, 3, 1 days)
- Auto-renewal processing
- Invoice management

</td></tr>
</table>

### 🎯 Performance Management

<table>
<tr><td width="50%">

**Goals & OKRs**
- Cascading goal trees with alignment
- Key results with progress tracking
- Goal velocity analytics
- AI-powered goal suggestions

**Reviews & Calibration**
- 360° review cycles
- Self-appraisals
- Calibration sessions
- Performance curve distributions

</td><td width="50%">

**Feedback & Recognition**
- Continuous feedback loops
- Peer recognition wall
- Manager 1-on-1 scheduling
- Kudos and badges

**Career Development**
- Career pathing with skill gap analysis
- Individual development plans (IDP)
- Skill matrix visualization
- Succession planning

</td></tr>
</table>

### 🤖 AI-Powered Intelligence

> **11 Specialized AI Agents** powered by Groq / Gemini with automatic provider fallback

| Agent | Purpose |
|-------|---------|
| **Workforce Intelligence** | Organization-wide analytics and insights |
| **Strategic Alignment** | Goal alignment and OKR analysis |
| **NLP Query** | Natural language data queries |
| **Report Generator** | Automated report creation |
| **Security Agent** | Threat detection and analysis |
| **Talent Marketplace** | Internal mobility and matching |
| **License Agent** | License optimization recommendations |
| **Onboarding Agent** | Employee onboarding guidance |
| **Excel Validation** | AI-powered upload data quality scoring |
| **Governance Agent** | Policy compliance monitoring |
| **Conflict Resolution** | Team conflict analysis |

### 📊 Employee Lifecycle

<table>
<tr><td width="50%">

**Excel Bulk Upload**
- Two-phase flow: Analyze → Preview → Confirm
- AI-powered data quality scoring
- Fuzzy matching (departments, roles, managers)
- Duplicate detection (DB + batch)
- License limit enforcement
- Auto-generated credentials with password-set emails

</td><td width="50%">

**Employee Management**
- Archive instead of delete (data preserved)
- License slots freed on archive
- Bulk deactivation detection (security alert)
- User suspend/activate with audit logging
- Organizational levels L1–L16

</td></tr>
</table>

### 🛡️ Security & Compliance

<table>
<tr><td width="50%">

**Access Control**
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Scope hierarchy: own → team → dept → BU → all
- Policy-based access (time-bound, target roles)
- Delegation support

</td><td width="50%">

**Threat Detection**
- Brute force login detection (5+ / hr)
- Cross-tenant access alerts (3+ / hr)
- Bulk deactivation alerts (5+ / hr)
- Suspicious data export detection (5+ / hr)
- IP blocking (Redis-based, 24 hr)
- AES-256-GCM data encryption
- XSS/injection sanitization middleware

</td></tr>
</table>

### 📱 Dashboards

| Dashboard | Description |
|-----------|-------------|
| **Employee** | Personal goals, reviews, feedback, skill gaps, career path |
| **Manager** | Team stats, direct reports, upload widget, license usage |
| **Company Admin** | User management, RBAC, audit logs, license monitoring, configuration |
| **Super Admin** | Cross-tenant management, billing, security threats, system health |

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Bootstrap env files + generate Prisma + push schema + seed DB |
| `npm run dev` | Start API + Web app in development mode |
| `npm run build` | Production build (all apps) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:seed` | Seed database with initial data |
| `npm run type-check` | TypeScript type checking |
| `npm run lint` | Lint all packages |
| `npm run format` | Format with Prettier |
| `npm run clean` | Remove all build artifacts and node_modules |

---

## 📁 API Endpoints

The API serves **30+ route groups** under `/api/v1/`:

<details>
<summary><strong>Click to expand all endpoint groups</strong></summary>

| Group | Base Path | Description |
|-------|-----------|-------------|
| Auth | `/auth` | Login, register, refresh, MFA, password reset |
| Users | `/users` | CRUD, profile, breakdown, archive |
| Goals | `/goals` | Create, update, align, cascade, analytics |
| Reviews | `/reviews` | Review cycles, submissions, moderation |
| Feedback | `/feedback` | 360° feedback, continuous feedback |
| One-on-Ones | `/one-on-ones` | Meeting scheduling, notes, action items |
| Calibration | `/calibration` | Calibration sessions, curve management |
| Development | `/development` | Development plans, learning paths |
| Career | `/career` | Career paths, skill gaps |
| Recognition | `/recognition` | Kudos, badges, leaderboard |
| Analytics | `/analytics` | Performance analytics, trends |
| Excel Upload | `/excel-upload` | Analyze, confirm, template, history |
| AI | `/ai` | Chat, agents, insights |
| Super Admin | `/super-admin` | Tenants, billing, security, system health |
| Notifications | `/notifications` | In-app notification management |
| Delegations | `/delegations` | Role delegation management |
| Roles | `/roles` | RBAC role management |
| Teams | `/teams` | Team management |
| Chat | `/chat` | Real-time messaging (Socket.io) |
| Health | `/health` | System health check |
| Policies | `/policies` | Access policy management |
| Pulse | `/pulse` | Pulse surveys |
| Engagement | `/engagement` | Employee engagement metrics |
| Reports | `/reports` | Report generation |
| Check-ins | `/checkins` | Weekly check-ins |
| Mentoring | `/mentoring` | Mentorship programs |
| Upgrade Requests | `/upgrade-requests` | Plan upgrade workflows |
| Actionable Insights | `/actionable-insights` | AI-driven recommendations |
| AI Insights | `/ai-insights` | Performance predictions |
| Performance Math | `/performance-math` | Statistical calculations |

</details>

---

## 🔧 Development

### Running Individual Apps

```bash
# API only
npx turbo run dev --filter=api

# Web app only
npx turbo run dev --filter=web

# Super Admin app
npx turbo run dev --filter=admin

# All together
npm run dev
```

### Database Management

```bash
# View data in Prisma Studio (GUI)
cd packages/database && npx prisma studio

# Reset database completely
cd packages/database && npx prisma migrate reset --force

# Re-seed after reset
npm run db:push && npm run db:seed
```

### Key Files

```
packages/database/prisma/schema.prisma   ← Database schema (129 models)
packages/database/prisma/seed.ts         ← Database seed (tenants + users)
packages/core/src/math-engine.ts         ← Statistical formulas
apps/api/src/middleware/authenticate.ts   ← JWT auth middleware
apps/api/src/middleware/authorize.ts      ← RBAC/ABAC authorization (750 lines)
apps/api/src/middleware/sanitize.ts       ← XSS/injection prevention
apps/api/src/modules/auth/               ← Authentication service
apps/api/src/modules/excel-upload/       ← Excel upload pipeline
apps/api/src/modules/super-admin/        ← Multi-tenant management
apps/api/src/modules/alerts/             ← Security alert system
apps/api/src/modules/ai/                 ← AI agents & orchestrator
apps/api/src/services/email/             ← Email templates (15+)
apps/web/src/store/auth.ts               ← RBAC route configuration
apps/web/src/pages/                      ← 60+ page components
```

---

## 🚀 Deployment

Deploys to [Render.com](https://render.com) with auto-deploys from `main`. The `render.yaml` defines:

- **API** — Node.js web service
- **Web** — Static site (Vite build)
- **PostgreSQL** — Managed database
- **Redis** — Managed cache

```bash
# Build for production
npm run build
```

---

## 🤝 Contributing

1. Create a branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Type check: `npm run type-check`
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/my-feature`
6. Open a Pull Request

---

## 💬 Troubleshooting

<details>
<summary><strong>Docker containers won't start</strong></summary>

Make sure Docker Desktop is running, then:
```bash
docker compose down
docker compose up -d db redis
```
</details>

<details>
<summary><strong>Database connection refused</strong></summary>

Use `127.0.0.1` not `localhost` in DATABASE_URL (IPv6 issue on Windows):
```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/pms_dev
```
</details>

<details>
<summary><strong>Prisma generate EPERM error (Windows)</strong></summary>

Stop any running dev servers first, then:
```bash
npm run db:generate
```
</details>

<details>
<summary><strong>Port already in use</strong></summary>

```bash
# Windows
netstat -ano | findstr :3002
taskkill /F /PID <PID>

# Mac/Linux
lsof -ti:3002 | xargs kill -9
```
</details>

<details>
<summary><strong>AI features not working</strong></summary>

Set at least one AI API key in your `.env` files:
```env
GROQ_API_KEY=your-key    # Free: https://console.groq.com/keys
GEMINI_API_KEY=your-key   # Free: https://aistudio.google.com/apikey
```
</details>

<details>
<summary><strong>Emails not sending</strong></summary>

1. Enable 2-Step Verification on your Gmail
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Set `SMTP_USER` and `SMTP_PASS` in all `.env` files
</details>

---

<div align="center">

**Built with TypeScript, React, and AI**

</div>
