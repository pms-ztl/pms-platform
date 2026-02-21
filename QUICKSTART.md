# 🚀 PMS Platform — Quick Start

## Prerequisites (install once, ever)
| Tool | Download |
|------|----------|
| Node.js 18+ | https://nodejs.org |
| Docker Desktop | https://docker.com/products/docker-desktop |
| Git | https://git-scm.com |

---

## First Time Setup (2 commands)

```bash
# 1. Clone & install
git clone https://github.com/agdanish/pms-platform.git && cd pms-platform && npm install && npm run setup

# 2. Start everything
npm start
```

**Done.** Open → **http://localhost:3002**

---

## Every Day After That (1 command)

```bash
npm start
```

That's it. `npm start` automatically starts Docker (PostgreSQL + Redis) and all dev servers.

---

## Default Login

| Role | Email | Password |
|------|-------|----------|
| HR Admin | agdanishr@gmail.com | TestPass@123 |
| Admin | admin@pms-platform.com | TestPass@123 |

---

## What Each Command Does

| Command | What it does |
|---------|-------------|
| `npm install` | Installs all dependencies across the monorepo |
| `npm run setup` | Starts Docker DB + Redis, creates `.env` files, runs migrations, seeds data |
| `npm start` | Starts Docker DB + Redis + API (hot-reload) + Web (HMR) |
| `npm run dev` | Same as start but skips Docker (if containers already running) |

---

## Ports

| Service | URL |
|---------|-----|
| Web App | http://localhost:3002 |
| API | http://localhost:3001 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |

---

## Troubleshooting

**Docker not running?**
Open Docker Desktop first, wait for it to start, then run `npm start`.

**Port already in use?**
```bash
# Kill whatever is on port 3001 or 5173
npx kill-port 3001 5173
npm start
```

**Database needs reset?**
```bash
docker compose -f docker-compose.dev.yml down -v
npm run setup
```

**Pull latest changes from team?**
```bash
git pull origin main
npm install       # only if package.json changed
npm run db:migrate  # only if schema changed
npm start
```
