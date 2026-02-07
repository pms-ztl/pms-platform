# PMS Platform - Enterprise Performance Management System

A modern, scalable performance management platform designed for enterprise organizations. Built with a modular monolith architecture using Node.js, TypeScript, React, and React Native.

## Features

### Core Modules
- **Goals Management** - OKRs, SMART goals, cascading alignment, and progress tracking
- **Performance Reviews** - Multi-rater reviews, customizable templates, and automated workflows
- **Continuous Feedback** - Real-time feedback, peer recognition, and 360° surveys
- **Calibration** - AI-assisted rating calibration with bias detection
- **Analytics** - Real-time dashboards, predictive insights, and custom reporting
- **Integrations** - HRIS, SSO, collaboration tools, and calendar sync

### Key Differentiators
1. **Multi-language NLP Bias Detection** - Detects 12+ bias patterns across 8 languages
2. **AI Calibration Assistant** - Pre-session analysis with outlier detection
3. **Offline-First Mobile Experience** - Background sync with delta updates
4. **Real-Time Collaboration** - Live review editing with presence indicators
5. **Sentiment Timeline Analysis** - Feedback trend visualization over time
6. **Manager Effectiveness Dashboard** - Team health metrics and coaching insights
7. **Customizable Competency Framework** - Industry-specific templates
8. **Goal Alignment Visualization** - Interactive D3.js hierarchy graphs
9. **Skills Gap Analysis** - ML-driven development recommendations
10. **Anonymous Feedback Channels** - End-to-end encrypted with safety scoring
11. **Review Cycle Automation** - ML-optimized reminder scheduling
12. **Cross-Tenant Benchmarking** - Privacy-preserving industry comparisons
13. **Smart Meeting Prep** - AI-generated 1:1 meeting agendas
14. **Integration Hub** - 12+ enterprise connectors with unified sync
15. **Predictive Flight Risk** - Employee retention modeling
16. **Voice/Video Feedback** - Transcription and sentiment analysis

## Architecture

### Project Structure

```
pms-platform/
├── apps/
│   ├── api/              # Express.js REST API
│   ├── web/              # React web application
│   ├── mobile/           # React Native mobile app
│   └── admin/            # Admin dashboard
├── packages/
│   ├── core/             # Business logic & services
│   ├── database/         # Prisma schema & migrations
│   ├── ui/               # Shared React components
│   └── events/           # Event definitions & bus
├── docs/
│   ├── api/              # OpenAPI specifications
│   └── architecture/     # ADRs and design docs
├── infrastructure/
│   ├── docker/           # Docker configurations
│   └── kubernetes/       # K8s manifests
└── scripts/              # Build & deployment scripts
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| API | Node.js, Express, TypeScript |
| Web Frontend | React, Tailwind CSS, Redux Toolkit |
| Mobile | React Native, Expo |
| Database | PostgreSQL with Row-Level Security |
| Cache | Redis |
| Queue | Kafka (production), In-memory (dev) |
| Authentication | Passport.js, SAML 2.0, OIDC |
| Testing | Vitest, Jest, Supertest |
| Documentation | OpenAPI 3.1 |

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+
- Redis 7+
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/pms-platform.git
cd pms-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development servers
npm run dev
```

### Development URLs

- API: http://localhost:3001
- Web: http://localhost:3000
- Admin: http://localhost:3002
- API Docs: http://localhost:3001/api-docs

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pms

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secure-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# SSO (optional)
SAML_ISSUER=https://your-idp.com
SAML_CALLBACK_URL=https://api.yourapp.com/auth/saml/callback

# Integrations (optional)
WORKDAY_CLIENT_ID=...
WORKDAY_CLIENT_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific package tests
npm run test --filter=@pms/core
```

## Deployment

### Docker

```bash
# Build all images
docker-compose build

# Start services
docker-compose up -d
```

### Kubernetes

```bash
# Apply configurations
kubectl apply -f infrastructure/kubernetes/

# Check deployment status
kubectl get pods -n pms-platform
```

## API Documentation

The API follows RESTful conventions and is documented using OpenAPI 3.1. Key endpoints:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `POST /auth/mfa/verify` - Verify MFA code

### Goals
- `GET /goals` - List goals
- `POST /goals` - Create goal
- `GET /goals/:id` - Get goal details
- `PATCH /goals/:id` - Update goal
- `POST /goals/:id/progress` - Update progress
- `POST /goals/:id/align` - Align to parent goal

### Reviews
- `GET /reviews` - List reviews
- `GET /reviews/cycles` - List review cycles
- `POST /reviews/cycles` - Create review cycle
- `POST /reviews/:id/submit` - Submit review
- `GET /calibration/sessions` - List calibration sessions

### Feedback
- `GET /feedback` - List feedback
- `POST /feedback` - Give feedback
- `POST /feedback/:id/acknowledge` - Acknowledge feedback
- `POST /recognition` - Give recognition

Full API documentation available at `/api-docs` when running the API server.

## Architecture Decisions

Key architectural decisions are documented as ADRs:

- [ADR-001: Modular Monolith Architecture](docs/architecture/ADR-001-modular-monolith.md)
- [ADR-002: Multi-tenancy with Row-Level Security](docs/architecture/ADR-002-multi-tenancy.md)
- [ADR-003: Authentication and Authorization](docs/architecture/ADR-003-authentication-authorization.md)
- [ADR-004: Event Sourcing for Audit](docs/architecture/ADR-004-event-sourcing-audit.md)

## Security

- AES-256 encryption for data at rest
- TLS 1.3 for data in transit
- Row-Level Security for tenant isolation
- RBAC + ABAC authorization model
- MFA support (TOTP, SMS, Email)
- SOC 2 Type II compliant
- GDPR data handling

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- ESLint + Prettier for formatting
- Conventional commits
- 80%+ test coverage required
- All PRs require review

## License

Proprietary - All rights reserved.

## Support

- Documentation: https://docs.pms-platform.com
- Issues: https://github.com/your-org/pms-platform/issues
- Email: support@pms-platform.com
