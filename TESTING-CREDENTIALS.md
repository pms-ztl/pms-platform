# PMS Platform - Testing Credentials

**Live URL:** https://pms-platform-dsjx.onrender.com
**Custom Domain:** https://pms.xzashr.com (once DNS propagates)

---

## Super Admin (Platform-Level)

| Field | Value |
|-------|-------|
| **URL** | https://pms-platform-dsjx.onrender.com/admin |
| **Email** | `admin@pms-platform.com` |
| **Password** | `admin123` |
| **Role** | SUPER_ADMIN |
| **Access** | Full platform control, all tenants, billing, system settings |

---

## Demo Tenant (Quick Test)

| Field | Value |
|-------|-------|
| **Email** | `admin@demo.com` |
| **Password** | `demo123` |
| **Role** | Tenant Admin |
| **Access** | Demo Company tenant only |

---

## Main Tenant - XZ Technologies (4 Roles)

All users share the password: **`Demo@123`**

| # | Name | Email | Role | Job Title | Department |
|---|------|-------|------|-----------|------------|
| 1 | Danish | agdanishr@gmail.com | TENANT_ADMIN | Chief Technology Officer | Product Engineering |
| 2 | Prasina | danish@xzashr.com | HR_ADMIN | Head of People & HR | People & HR |
| 3 | Preethi | preethisivachandran0@gmail.com | MANAGER | Senior Engineering Manager | Product Engineering |
| 4 | Sanjay | sanjayn0369@gmail.com | EMPLOYEE | Frontend Engineer (L3) | Product Engineering |

---

## Role Permissions Summary

| Role | Dashboard | Goals | Reviews | Feedback | Team Mgmt | AI Workspace | Admin Panel |
|------|-----------|-------|---------|----------|-----------|--------------|-------------|
| **TENANT_ADMIN** | Full org view | All goals | All reviews | All feedback | Full control | Full access | Tenant settings |
| **HR_ADMIN** | HR analytics | All goals | All reviews | All feedback | HR controls | Full access | HR settings |
| **MANAGER** | Team view | Team goals | Team reviews | Team feedback | Direct reports | Full access | No |
| **EMPLOYEE** | Personal view | Own goals | Own reviews | Own feedback | No | Full access | No |

---

## Test Scenarios by Role

### As TENANT_ADMIN (Danish - agdanishr@gmail.com)
- View org-wide dashboard with all employee CPIS scores
- Manage goals, reviews, and feedback for entire organization
- Access admin settings (license management, user uploads)
- Use AI Workspace with all agent types

### As HR_ADMIN (Prasina - danish@xzashr.com)
- View HR analytics and people metrics
- Manage performance review cycles
- Access employee feedback and sentiment analysis
- Run AI-powered workforce intelligence queries

### As MANAGER (Preethi - preethisivachandran0@gmail.com)
- View team dashboard with direct reports' performance
- Create and assign goals to team members
- Submit and review performance reviews
- Give/receive feedback within team

### As EMPLOYEE (Sanjay - sanjayn0369@gmail.com)
- View personal dashboard with own CPIS score
- Track own goals and progress
- Submit self-reviews and receive feedback
- Use AI chat for performance insights

---

## Key Features to Test

1. **Dashboard** - CPIS scores, performance cards, analytics charts
2. **Goals** - Create, track progress, align goals
3. **Reviews** - Performance review cycles, 360 feedback
4. **Feedback** - Give/receive, sentiment analysis
5. **Chat** - Real-time messaging between users
6. **AI Workspace** - Neural Swarm agents, AI chat
7. **Calendar** - Events, 1-on-1 meetings
8. **Notifications** - Real-time alerts

---

*Note: Free tier on Render spins down after inactivity. First load may take ~50 seconds.*
