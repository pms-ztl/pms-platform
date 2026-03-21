# PMS Platform — Complete Information Architecture
> Generated: 2026-03-21 | Version: main branch | 5 roles · 89 pages · 43 API modules · 300+ endpoints

---

## TABLE OF CONTENTS
1. [System Overview](#1-system-overview)
2. [Authentication Flow](#2-authentication-flow)
3. [RBAC Matrix](#3-rbac-matrix)
4. [Frontend — All Routes & Pages](#4-frontend--all-routes--pages)
5. [Backend — All API Endpoints](#5-backend--all-api-endpoints)
6. [End-to-End Flow by Feature](#6-end-to-end-flow-by-feature)

---

## 1. SYSTEM OVERVIEW

```
Browser
  │
  ├─ Web App (React + Vite)          apps/web/  → pms.xzashr.com
  │    ├─ Public Routes              /welcome, /login, /forgot-password
  │    ├─ Protected Routes           /dashboard ... /mentoring (88 pages)
  │    └─ Super Admin Routes         /sa/dashboard ... /sa/upgrade-requests
  │
  └─ API (Express)                   apps/api/  → pms-platform.onrender.com/api
       ├─ /api/v1/*                  Tenant workspace APIs (43 modules)
       └─ /api/admin/*               Super Admin Command Center APIs

Database: Neon.tech PostgreSQL (Prisma ORM)
Cache:    Upstash Redis
Events:   Socket.IO (real-time)
AI:       Anthropic / OpenAI / Gemini / DeepSeek / Groq
```

---

## 2. AUTHENTICATION FLOW

### Login → Dashboard
```
[1] POST /api/v1/auth/login
    Body: { email, password, tenantSlug? }
    → validates credentials, checks tenantId isolation
    → returns { accessToken, refreshToken, user }

[2] Frontend stores tokens in localStorage (pms-auth)
    → useAuthStore sets user + isAuthenticated = true

[3] Every API request sends:
    Authorization: Bearer <accessToken>
    → authenticate middleware validates JWT
    → attaches req.user = { id, tenantId, roles, permissions }

[4] Token expiry → POST /api/v1/auth/refresh
    Body: { refreshToken }
    → returns new accessToken

[5] Logout → POST /api/v1/auth/logout
    → clears refreshToken from DB
    → frontend queryClient.clear() prevents cross-user data leak
```

### Guard Layers
```
PublicRoute      → authenticated users redirected to /dashboard
ProtectedRoute   → unauthenticated users redirected to /welcome
RoleGuard        → wrong role shows AccessDenied component
SuperAdminGuard  → non-superadmin shows AccessDenied
requireSuperAdmin→ API middleware, 403 if not Super Admin
requireRoles()   → API middleware, 403 if role not in list
authorize()      → API middleware, scope-aware (own/team/dept/all)
```

---

## 3. RBAC MATRIX

### Roles
| Role | Scope | Description |
|------|-------|-------------|
| `SUPER_ADMIN` | Platform-wide | Manages all tenants, billing, security |
| `TENANT_ADMIN` | All within tenant | Full control of their company |
| `HR_ADMIN` | All within tenant | HR operations, reviews, analytics |
| `MANAGER` | Team scope | Reviews team, goals, PIP |
| `EMPLOYEE` | Own scope | Self-service only |

### Demo Credentials
| Role | Email | Password | Portal |
|------|-------|----------|--------|
| Super Admin | `pms.superadmin@protonmail.com` | `Demo@2026` | `/sa/dashboard` |
| Tenant Admin | `pms.tenantadmin@protonmail.com` | `Demo@2026` | `/dashboard` |
| HR Admin | `pms.hradmin@protonmail.com` | `Demo@2026` | `/dashboard` |
| Manager | `pms.manager@protonmail.com` | `Demo@2026` | `/dashboard` |
| Employee | `pms.employee@protonmail.com` | `Demo@2026` | `/dashboard` |

### Page Access by Role
| Page | SA | TA | HR | MGR | EMP |
|------|----|----|----|----|-----|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Goals | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reviews | ✅ | ✅ | ✅ | ✅ | ✅ |
| Feedback | ✅ | ✅ | ✅ | ✅ | ✅ |
| Self-Appraisal | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recognition | ✅ | ✅ | ✅ | ✅ | ✅ |
| One-on-Ones | ✅ | ✅ | ✅ | ✅ | ✅ |
| Profile / Settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Development | ✅ | ✅ | ✅ | ✅ | ✅ |
| Skills | ✅ | ✅ | ✅ | ✅ | ✅ |
| Evidence | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leaderboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pulse | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendar | ✅ | ✅ | ✅ | ✅ | ✅ |
| Announcements | ✅ | ✅ | ✅ | ✅ | ✅ |
| Org Chart | ✅ | ✅ | ✅ | ✅ | ✅ |
| Directory | ✅ | ✅ | ✅ | ✅ | ✅ |
| Career Path | ✅ | ✅ | ✅ | ✅ | ✅ |
| Goal Alignment | ✅ | ✅ | ✅ | ✅ | ✅ |
| OKRs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mentoring | ✅ | ✅ | ✅ | ✅ | ✅ |
| Exports | ✅ | ✅ | ✅ | ✅ | ✅ |
| Help | ✅ | ✅ | ✅ | ✅ | ✅ |
| **— MANAGER+ ONLY —** | | | | | |
| PIP | ✅ | ✅ | ✅ | ✅ | ❌ |
| Calibration | ✅ | ✅ | ✅ | ✅ | ❌ |
| Analytics | ✅ | ✅ | ✅ | ✅ | ❌ |
| Real-time | ✅ | ✅ | ✅ | ✅ | ❌ |
| Team | ✅ | ✅ | ✅ | ✅ | ❌ |
| Team Insights | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ✅ | ✅ | ❌ |
| Report Schedules | ✅ | ✅ | ✅ | ✅ | ❌ |
| Compensation | ✅ | ✅ | ✅ | ✅ | ❌ |
| Promotions | ✅ | ✅ | ✅ | ✅ | ❌ |
| Review Cycles | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manager Hub | ✅ | ✅ | ✅ | ✅ | ❌ |
| Health Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| Engagement | ✅ | ✅ | ✅ | ✅ | ❌ |
| Wellbeing | ✅ | ✅ | ✅ | ✅ | ❌ |
| Meeting Analytics | ✅ | ✅ | ✅ | ✅ | ❌ |
| Anomalies | ✅ | ✅ | ✅ | ✅ | ❌ |
| Benchmarks | ✅ | ✅ | ✅ | ✅ | ❌ |
| Simulator | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI Dev Plans | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delegations | ✅ | ✅ | ✅ | ✅ | ❌ |
| Excel Upload | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reviews Moderate | ✅ | ✅ | ✅ | ✅ | ❌ |
| **— HR ADMIN+ ONLY —** | | | | | |
| HR Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Succession | ✅ | ✅ | ✅ | ❌ | ❌ |
| Compliance | ✅ | ✅ | ✅ | ❌ | ❌ |
| Skill Gaps | ✅ | ✅ | ✅ | ❌ | ❌ |
| AI Insights | ✅ | ✅ | ✅ | ❌ | ❌ |
| Talent Intelligence | ✅ | ✅ | ✅ | ❌ | ❌ |
| Team Optimizer | ✅ | ✅ | ✅ | ❌ | ❌ |
| Culture Diagnostics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin: Users | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin: Config | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin: Audit | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin: Licenses | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin: AI Access | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin: Roles | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin: Upgrade | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin: Policies | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin: RBAC Dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| **— SUPER ADMIN ONLY —** | | | | | |
| /sa/dashboard | ✅ | ❌ | ❌ | ❌ | ❌ |
| /sa/tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| /sa/users | ✅ | ❌ | ❌ | ❌ | ❌ |
| /sa/billing | ✅ | ❌ | ❌ | ❌ | ❌ |
| /sa/audit | ✅ | ❌ | ❌ | ❌ | ❌ |
| /sa/security | ✅ | ❌ | ❌ | ❌ | ❌ |
| /sa/system | ✅ | ❌ | ❌ | ❌ | ❌ |
| /sa/upgrade-requests | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. FRONTEND — ALL ROUTES & PAGES

### Route Guard Types
- **PublicRoute** — Redirects authenticated users away (login, welcome)
- **ProtectedRoute** — Requires login; redirects to `/welcome` if not
- **RoleGuard** — Requires login + specific roles; shows AccessDenied if not
- **SuperAdminGuard** — Requires SUPER_ADMIN role; shows AccessDenied if not

---

### PUBLIC ROUTES
| Path | Component | Guard |
|------|-----------|-------|
| `/welcome` | LandingPage | PublicRoute |
| `/login` | LoginPage | PublicRoute + AuthLayout |
| `/forgot-password` | ForgotPasswordPage | PublicRoute + AuthLayout |
| `/set-password` | SetPasswordPage | AuthLayout only |

---

### PROTECTED ROUTES (All under DashboardLayout)
| Path | Component | Guard | Roles Required |
|------|-----------|-------|----------------|
| `/` | → redirect `/dashboard` | ProtectedRoute | any |
| `/dashboard` | DashboardPage | ProtectedRoute | any |
| `/goals` | GoalsPage | ProtectedRoute | any |
| `/goals/:id` | GoalDetailPage | ProtectedRoute | any |
| `/reviews` | ReviewsPage | ProtectedRoute | any |
| `/reviews/:id` | ReviewDetailPage | ProtectedRoute | any |
| `/feedback` | FeedbackPage | ProtectedRoute | any |
| `/one-on-ones` | OneOnOnesPage | ProtectedRoute | any |
| `/one-on-ones/:id` | OneOnOneDetailPage | ProtectedRoute | any |
| `/development` | DevelopmentPage | ProtectedRoute | any |
| `/development/:id` | DevelopmentPlanDetailPage | ProtectedRoute | any |
| `/recognition` | RecognitionPage | ProtectedRoute | any |
| `/profile` | ProfilePage | ProtectedRoute | any |
| `/settings` | SettingsPage | ProtectedRoute | any |
| `/self-appraisal` | SelfAppraisalPage | ProtectedRoute | any |
| `/help` | HelpPage | ProtectedRoute | any |
| `/skills` | SkillsMatrixPage | ProtectedRoute | any |
| `/evidence` | EvidencePage | ProtectedRoute | any |
| `/employees/:id` | EmployeeProfilePage | ProtectedRoute | any |
| `/announcements` | AnnouncementsPage | ProtectedRoute | any |
| `/goal-alignment` | GoalAlignmentPage | ProtectedRoute | any |
| `/okrs` | OKRDashboardPage | ProtectedRoute | any |
| `/career` | CareerPathPage | ProtectedRoute | any |
| `/leaderboard` | LeaderboardPage | ProtectedRoute | any |
| `/chat` | ChatPage | ProtectedRoute | any |
| `/notifications` | NotificationsPage | ProtectedRoute | any |
| `/pulse` | PulsePage | ProtectedRoute | any |
| `/calendar` | CalendarPage | ProtectedRoute | any |
| `/exports` | DataExportPage | ProtectedRoute | any |
| `/org-chart` | OrgChartPage | ProtectedRoute | any |
| `/directory` | EmployeeDirectoryPage | ProtectedRoute | any |
| `/mentoring` | MentoringHubPage | ProtectedRoute | any |
| `/pip` | PIPPage | RoleGuard | SA, TA, HR, MGR |
| `/pip/:id` | PIPDetailPage | RoleGuard | SA, TA, HR, MGR |
| `/calibration` | CalibrationPage | RoleGuard | SA, TA, HR, MGR |
| `/analytics` | AnalyticsPage | RoleGuard | SA, TA, HR, MGR |
| `/realtime` | RealtimePerformancePage | RoleGuard | SA, TA, HR, MGR |
| `/team` | TeamPage | RoleGuard | SA, TA, HR, MGR |
| `/team-insights` | TeamInsightsPage | RoleGuard | SA, TA, HR, MGR |
| `/reports` | ReportsPage | RoleGuard | SA, TA, HR, MGR |
| `/report-schedules` | ScheduledReportsPage | RoleGuard | SA, TA, HR, MGR |
| `/compensation` | CompensationPage | RoleGuard | SA, TA, HR, MGR |
| `/promotions` | PromotionsPage | RoleGuard | SA, TA, HR, MGR |
| `/review-cycles` | ReviewCyclesPage | RoleGuard | SA, TA, HR, MGR |
| `/manager-dashboard` | ManagerDashboardPage | RoleGuard | SA, TA, HR, MGR |
| `/health-dashboard` | HealthDashboardPage | RoleGuard | SA, TA, HR, MGR |
| `/engagement` | EngagementDashboardPage | RoleGuard | SA, TA, HR, MGR |
| `/wellbeing` | WellbeingDashboardPage | RoleGuard | SA, TA, HR, MGR |
| `/meeting-analytics` | MeetingAnalyticsPage | RoleGuard | SA, TA, HR, MGR |
| `/anomalies` | AnomalyDetectionPage | RoleGuard | SA, TA, HR, MGR |
| `/benchmarks` | PerformanceBenchmarkPage | RoleGuard | SA, TA, HR, MGR |
| `/simulator` | PerformanceSimulatorPage | RoleGuard | SA, TA, HR, MGR |
| `/ai-development` | AIDevPlanPage | RoleGuard | SA, TA, HR, MGR |
| `/admin/delegations` | DelegationManagementPage | RoleGuard | SA, TA, HR, MGR |
| `/admin/excel-upload` | ExcelUploadPage | RoleGuard | SA, TA, HR, MGR |
| `/excel-upload` | → redirect `/admin/excel-upload` | — | — |
| `/reviews/moderate` | ModeratorDashboardPage | RoleGuard | SA, TA, HR, MGR |
| `/hr-analytics` | HRAnalyticsPage | RoleGuard | SA, TA, HR |
| `/succession` | SuccessionPage | RoleGuard | SA, TA, HR |
| `/compliance` | CompliancePage | RoleGuard | SA, TA, HR |
| `/skill-gaps` | SkillGapHeatmapPage | RoleGuard | SA, TA, HR |
| `/ai-insights` | AIInsightsDashboardPage | RoleGuard | SA, TA, HR |
| `/talent-intelligence` | TalentIntelligencePage | RoleGuard | SA, TA, HR |
| `/team-optimizer` | TeamOptimizerPage | RoleGuard | SA, TA, HR |
| `/culture-diagnostics` | CultureDiagnosticsPage | RoleGuard | SA, TA, HR |
| `/admin/users` | UserManagementPage | RoleGuard | SA, TA, HR |
| `/admin/config` | ConfigurationPage | RoleGuard | SA, TA, HR |
| `/admin/audit` | AuditLogPage | RoleGuard | SA, TA, HR |
| `/admin/licenses` | LicenseDashboardPage | RoleGuard | SA, TA, HR |
| `/admin/ai-access` | AIAccessManagementPage | RoleGuard | SA, TA, HR |
| `/admin/roles` | RoleManagementPage | RoleGuard | SA, TA, HR |
| `/admin/upgrade` | UpgradeRequestPage | RoleGuard | SA, TA, HR |
| `/admin/policies` | AccessPoliciesPage | RoleGuard | SA, TA, HR |
| `/admin/rbac-dashboard` | RBACDashboardPage | RoleGuard | SA, TA, HR |

---

### SUPER ADMIN ROUTES (All under SuperAdminLayout)
| Path | Component | Guard |
|------|-----------|-------|
| `/sa` | → redirect `/sa/dashboard` | SuperAdminGuard |
| `/sa/dashboard` | SADashboardPage | SuperAdminGuard |
| `/sa/tenants` | SATenantsPage | SuperAdminGuard |
| `/sa/tenants/:id` | SATenantDetailPage | SuperAdminGuard |
| `/sa/users` | SAUsersPage | SuperAdminGuard |
| `/sa/billing` | SABillingPage | SuperAdminGuard |
| `/sa/audit` | SAAuditPage | SuperAdminGuard |
| `/sa/security` | SASecurityPage | SuperAdminGuard |
| `/sa/system` | SASystemPage | SuperAdminGuard |
| `/sa/settings` | SettingsPage | SuperAdminGuard |
| `/sa/upgrade-requests` | SAUpgradeRequestsPage | SuperAdminGuard |

---

## 5. BACKEND — ALL API ENDPOINTS

**Base URL:** `https://pms-platform.onrender.com`
**Tenant API prefix:** `/api/v1`
**Super Admin prefix:** `/api/admin`

**Middleware Legend:**
- `auth` = authenticate (JWT validation)
- `own` = authorize scope:own
- `team` = authorize scope:team
- `all` = authorize scope:all
- `roles(X)` = requireRoles(X)
- `SA` = requireSuperAdmin

---

### AUTH `/api/v1/auth`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/login` | public | Login, get tokens |
| POST | `/mfa/verify` | public | Verify MFA code |
| POST | `/refresh` | public | Refresh access token |
| POST | `/password/forgot` | public | Initiate password reset |
| POST | `/password/reset` | public | Reset password with token |
| POST | `/password/set` | public | Set initial password |
| POST | `/logout` | auth | Logout, clear token |
| GET | `/me` | auth | Get current user |
| POST | `/password/change` | auth | Change password |
| POST | `/mfa/setup` | auth | Setup MFA |
| POST | `/mfa/setup/verify` | auth | Verify MFA setup |
| POST | `/mfa/disable` | auth | Disable MFA |

---

### GOALS `/api/v1/goals`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/` | auth + own\|team | Create goal |
| GET | `/` | auth + own | List goals |
| GET | `/my` | auth | My goals |
| GET | `/tree` | auth + all | Goal alignment tree |
| PUT | `/bulk-update` | auth + all | Bulk update goals |
| GET | `/export` | auth + all | Export goals |
| GET | `/team-tree` | auth + team | Team goal tree |
| GET | `/:id` | auth + own | Get goal |
| PUT | `/:id` | auth + own | Update goal |
| DELETE | `/:id` | auth + own | Delete goal |
| POST | `/:id/progress` | auth + own | Log progress |
| GET | `/:id/progress/history` | auth + own | Progress history |
| POST | `/:id/align` | auth + own | Align to parent goal |
| DELETE | `/:id/align/:toGoalId` | auth + own | Remove alignment |
| POST | `/:id/comments` | auth + own | Add comment |
| GET | `/:id/comments` | auth + own | Get comments |
| GET | `/:id/activity` | auth + own | Activity log |

---

### REVIEWS `/api/v1/reviews`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/cycles` | auth + roles(HR, TA) | Create review cycle |
| GET | `/cycles` | auth + own | List cycles |
| GET | `/cycles/:id` | auth + own | Get cycle |
| PUT | `/cycles/:id` | auth + roles(HR, TA) | Update cycle |
| POST | `/cycles/:id/launch` | auth + roles(HR, TA) | Launch cycle |
| POST | `/cycles/:id/advance` | auth + roles(HR, TA) | Advance cycle status |
| GET | `/cycles/:id/stats` | auth + roles(HR, TA) | Cycle statistics |
| GET | `/my` | auth | My reviews |
| GET | `/:id` | auth + own | Get review |
| POST | `/:id/start` | auth + own | Start writing review |
| PUT | `/:id/draft` | auth + own | Save draft |
| POST | `/:id/submit` | auth + own | Submit review |
| DELETE | `/:id` | auth + own | Delete review |
| POST | `/:id/acknowledge` | auth | Acknowledge received review |

---

### FEEDBACK `/api/v1/feedback`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/` | auth + all | Give feedback |
| GET | `/received` | auth + own | My received feedback |
| GET | `/given` | auth + own | Feedback I gave |
| GET | `/team` | auth + team | Team feedback (managers) |
| GET | `/timeline` | auth + own | My feedback timeline |
| GET | `/timeline/:userId` | auth + team | Another user's timeline |
| GET | `/recognition-wall` | auth | Tenant recognition feed |
| GET | `/top-recognized` | auth | Top recognized employees |
| POST | `/request` | auth + all | Request feedback |
| GET | `/:id` | auth + own | Get specific feedback |
| POST | `/:id/acknowledge` | auth + own | Acknowledge feedback |
| PUT | `/:id` | auth + own | Edit feedback (grace period) |
| DELETE | `/:id` | auth + own | Delete feedback (grace period) |

---

### USERS `/api/v1/users`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/roles` | auth | List available roles |
| GET | `/departments` | auth | List departments |
| GET | `/org-chart` | auth | Org chart data |
| GET | `/my-reports` | auth | My direct reports |
| GET | `/team-members` | auth | My team members |
| GET | `/me` | auth | My profile |
| POST | `/me/avatar` | auth | Upload my avatar |
| POST | `/me/ai-avatar` | auth | Set AI-generated avatar |
| DELETE | `/me/avatar` | auth | Remove my avatar |
| GET | `/license/usage` | auth | License usage stats |
| GET | `/subscription` | auth | Subscription info |
| GET | `/breakdown` | auth + roles(HR, TA) | Employee by level/dept |
| GET | `/ai-access/stats` | auth + roles(HR, TA) | AI access statistics |
| PUT | `/ai-access/bulk` | auth + roles(HR, TA) | Bulk toggle AI access |
| PUT | `/ai-access/delegation` | auth + roles(HR, TA) | Update AI delegation |
| PUT | `/designated-manager` | auth + roles(HR, TA) | Assign designated manager |
| PUT | `/super-admin-access` | auth + roles(TA) | Toggle super admin access |
| POST | `/bulk-assign-role` | auth + roles(HR, TA) | Bulk assign roles |
| POST | `/bulk-remove-role` | auth + roles(HR, TA) | Bulk remove roles |
| POST | `/` | auth + roles(HR, TA, MGR) | Create user |
| GET | `/` | auth + all | List all users |
| GET | `/:id` | auth + all | Get user profile |
| PUT | `/:id` | auth + roles(HR, TA) | Update user |
| POST | `/:id/deactivate` | auth + roles(HR, TA) | Deactivate user |
| POST | `/:id/reactivate` | auth + roles(HR, TA, MGR) | Reactivate user |
| POST | `/:id/archive` | auth + roles(HR, TA, MGR) | Archive user |
| POST | `/:id/resend-credentials` | auth + roles(HR, TA, MGR) | Resend login email |
| DELETE | `/:id` | auth + roles(HR, TA) | Delete user |
| GET | `/:id/reports` | auth + team | User's direct reports |
| POST | `/:id/roles` | auth + roles(HR, TA) | Assign role to user |
| DELETE | `/:id/roles/:roleId` | auth + roles(HR, TA) | Remove role from user |
| GET | `/:id/role-history` | auth + roles(HR, TA) | Role assignment history |
| POST | `/:id/avatar` | auth + roles(HR, TA) | Upload user avatar |
| PUT | `/:id/ai-access` | auth + roles(HR, TA, MGR) | Toggle user AI access |

---

### NOTIFICATIONS `/api/v1/notifications`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/` | auth | Get notifications |
| GET | `/unread-count` | auth | Unread count |
| GET | `/preferences` | auth | Notification preferences |
| PUT | `/preferences` | auth | Update preferences |
| POST | `/read-all` | auth | Mark all as read |
| POST | `/:id/read` | auth | Mark one as read |

---

### CALIBRATION `/api/v1/calibration`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/sessions` | auth + roles(HR, MGR, TA) | List sessions |
| POST | `/sessions` | auth + roles(HR, TA) | Create session |
| GET | `/sessions/:id` | auth + roles(HR, MGR, TA) | Get session |
| POST | `/sessions/:id/start` | auth + roles(HR, TA) | Start session |
| POST | `/sessions/:id/complete` | auth + roles(HR, TA) | Complete session |
| POST | `/sessions/:id/participants` | auth + roles(HR, TA) | Add participant |
| GET | `/sessions/:id/reviews` | auth + roles(HR, MGR, TA) | Reviews in session |
| POST | `/sessions/:id/ratings` | auth + roles(HR, MGR, TA) | Adjust rating |
| GET | `/sessions/:id/ratings` | auth + roles(HR, MGR, TA) | Get ratings |

---

### ANALYTICS `/api/v1/analytics`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/dashboard` | auth | Dashboard stats |
| GET | `/performance-distribution` | auth | Performance curve |
| GET | `/goal-trends` | auth | Goal completion trends |
| GET | `/feedback-trends` | auth | Feedback trends |
| GET | `/team-performance` | auth + roles(HR) | Team performance |
| GET | `/bias-metrics` | auth + roles(HR) | Bias detection metrics |
| GET | `/compensation` | auth + roles(HR) | Compensation analysis |
| GET | `/bias` | auth + roles(HR) | Bias analysis |
| GET | `/normalization` | auth + roles(HR) | Rating normalization |
| GET | `/ratings` | auth + roles(HR) | Rating distribution |
| GET | `/departments` | auth + roles(HR) | Department metrics |
| GET | `/cycle/:cycleId/stats` | auth | Cycle analytics |
| GET | `/export/:dataType` | auth + roles(HR) | Export analytics data |

---

### PERFORMANCE MATH `/api/v1/performance-math`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/score/me` | auth | My performance score |
| GET | `/cpis/me` | auth | My CPIS score |
| GET | `/team/me` | auth | My team analytics |
| GET | `/score/:userId` | auth | User performance score |
| GET | `/cpis/:userId` | auth | User CPIS breakdown |
| GET | `/goal-risk/:goalId` | auth | Goal risk assessment |
| GET | `/team/:managerId` | auth | Manager's team analytics |
| POST | `/calibrate` | auth | Calibrate ratings |
| GET | `/goal-mapping/:goalId` | auth | Goal-task mapping |

---

### PIP `/api/v1/pip`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/` | auth + team\|all | Create PIP |
| GET | `/` | auth | List PIPs |
| GET | `/:id` | auth | Get PIP |
| POST | `/:id/approve` | auth + all | Approve PIP |
| POST | `/:id/check-ins` | auth + team\|all | Add check-in |
| POST | `/:id/milestones` | auth + team\|all | Add milestone |
| PUT | `/milestones/:id` | auth + team\|all | Update milestone |
| POST | `/:id/close` | auth + team\|all | Close PIP |
| POST | `/:id/acknowledge` | auth | Employee acknowledge PIP |

---

### COMPENSATION `/api/v1/compensation`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/` | auth | Create compensation decision |
| GET | `/` | auth | List decisions |
| GET | `/budget-summary` | auth | Budget summary |
| GET | `/:decisionId` | auth | Get decision |
| PATCH | `/:decisionId` | auth | Update decision |
| POST | `/:decisionId/submit` | auth | Submit for approval |
| POST | `/:decisionId/approve` | auth | Approve |
| POST | `/:decisionId/reject` | auth | Reject |
| POST | `/:decisionId/implement` | auth | Implement decision |
| POST | `/link-evidence` | auth | Link evidence |
| DELETE | `/:decisionId/evidence/:evidenceId` | auth | Unlink evidence |

---

### PROMOTIONS `/api/v1/promotions`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/` | auth | Create promotion case |
| GET | `/` | auth | List promotions |
| GET | `/summary` | auth | Promotion summary |
| GET | `/:decisionId` | auth | Get promotion |
| PATCH | `/:decisionId` | auth | Update |
| POST | `/:decisionId/start-review` | auth | Start review |
| POST | `/:decisionId/approve` | auth | Approve |
| POST | `/:decisionId/reject` | auth | Reject |
| POST | `/:decisionId/defer` | auth | Defer |
| POST | `/:decisionId/implement` | auth | Implement |
| POST | `/link-evidence` | auth | Link evidence |
| DELETE | `/:decisionId/evidence/:evidenceId` | auth | Unlink evidence |

---

### SUCCESSION `/api/v1/succession`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/` | auth + all | Create succession plan |
| GET | `/` | auth + all | List plans |
| GET | `/nine-box` | auth + all | 9-box grid data |
| GET | `/:id` | auth + all | Get plan |
| PUT | `/:id` | auth + all | Update plan |
| DELETE | `/:id` | auth + all | Delete plan |
| GET | `/:id/readiness` | auth + all | Successor readiness score |

---

### COMPLIANCE `/api/v1/compliance`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/dashboard` | auth + all | Compliance dashboard |
| GET | `/policies` | auth | List policies |
| POST | `/policies` | auth + all | Create policy |
| PUT | `/policies/:id` | auth + all | Update policy |
| DELETE | `/policies/:id` | auth + all | Delete policy |
| GET | `/assessments` | auth | List assessments |
| POST | `/assessments` | auth + all | Create assessment |
| PUT | `/assessments/:id` | auth | Update assessment |
| GET | `/violations` | auth + all | List violations |
| POST | `/violations` | auth | Report violation |
| PUT | `/violations/:id` | auth + all | Update violation |
| GET | `/user/:userId` | auth | User compliance status |
| GET | `/reviews` | auth | List compliance reviews |
| POST | `/reviews` | auth | Create review |
| PUT | `/reviews/:id` | auth | Update review |
| POST | `/reviews/:id/complete` | auth | Complete review |
| GET | `/deadlines` | auth | Upcoming deadlines |

---

### DEVELOPMENT `/api/v1/development`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/plans` | auth | Create dev plan |
| GET | `/plans` | auth | My plans |
| GET | `/plans/team` | auth + team\|all | Team dev plans |
| GET | `/plans/:id` | auth | Get plan |
| PUT | `/plans/:id` | auth | Update plan |
| DELETE | `/plans/:id` | auth | Delete plan |
| POST | `/plans/:id/approve` | auth + team | Approve plan |
| GET | `/recommendations` | auth | My recommendations |
| GET | `/recommendations/:userId` | auth + team | User recommendations |
| POST | `/plans/:id/activities` | auth | Add activity |
| PUT | `/activities/:id` | auth | Update activity |
| POST | `/plans/:id/checkpoints` | auth + team | Add checkpoint |
| PUT | `/checkpoints/:id/complete` | auth + team | Complete checkpoint |

---

### EVIDENCE `/api/v1/evidence`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/` | auth | Upload evidence |
| GET | `/` | auth | List evidence |
| GET | `/:evidenceId` | auth | Get evidence |
| PATCH | `/:evidenceId` | auth | Update evidence |
| POST | `/:evidenceId/verify` | auth | Verify evidence |
| POST | `/link-to-review` | auth | Link to review |
| DELETE | `/:evidenceId/reviews/:reviewId` | auth | Unlink from review |
| POST | `/:evidenceId/archive` | auth | Archive evidence |
| POST | `/import` | auth | Bulk import |
| GET | `/employees/:employeeId/summary` | auth | Employee evidence summary |

---

### EXCEL UPLOAD `/api/v1/excel-upload`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/template` | auth + roles(HR, TA, SA, MGR) | Download template |
| POST | `/analyze` | auth + roles(HR, TA, SA) | Analyze Excel file |
| POST | `/:id/confirm` | auth + roles(HR, TA, SA) | Confirm upload |
| GET | `/:id/progress` | auth + roles(HR, TA, SA) | Upload progress |
| POST | `/upload` | auth + roles(HR, TA, SA) | Legacy single-step upload |
| GET | `/history` | auth + roles(HR, TA, SA) | Upload history |
| GET | `/:id/errors` | auth + roles(HR, TA, SA) | Upload errors |

---

### CHAT `/api/v1/chat` & `/api/v1/conversations`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/conversations` | auth | List conversations |
| POST | `/conversations/direct` | auth | Get/create DM |
| POST | `/conversations/group` | auth | Create group chat |
| POST | `/conversations/team-channel` | auth | Create team channel |
| GET | `/conversations/:id` | auth | Get conversation |
| POST | `/conversations/:id/participants` | auth | Add participants |
| POST | `/conversations/:id/leave` | auth | Leave conversation |
| PUT | `/conversations/:id/name` | auth | Rename conversation |
| POST | `/conversations/:id/mute` | auth | Mute/unmute |
| GET | `/conversations/:id/pinned` | auth | Get pinned messages |
| GET | `/messages/search` | auth | Search messages |
| GET | `/messages/unread-counts` | auth | Unread counts |
| GET | `/conversations/:id/messages` | auth | Get messages |
| POST | `/conversations/:id/messages` | auth | Send message |
| PUT | `/conversations/:id/messages/:msgId` | auth | Edit message |
| DELETE | `/conversations/:id/messages/:msgId` | auth | Delete message |
| POST | `/conversations/:id/messages/:msgId/reactions` | auth | Toggle reaction |
| POST | `/conversations/:id/messages/:msgId/pin` | auth | Pin/unpin message |
| POST | `/conversations/:id/messages/:msgId/forward` | auth | Forward message |
| POST | `/conversations/:id/read` | auth | Mark as read |
| DELETE | `/conversations/:id/clear` | auth | Clear chat |
| POST | `/email/send` | auth | Send email |
| POST | `/email/ai-draft` | auth + aiAccessGuard | AI draft email |
| GET | `/users/search` | auth | Search users for chat |
| GET | `/teams` | auth | My teams list |

---

### ANNOUNCEMENTS `/api/v1/announcements`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/active` | auth | Active announcements |
| GET | `/` | auth + all | All announcements |
| GET | `/stats` | auth + all | Announcement stats |
| POST | `/` | auth + all | Create announcement |
| GET | `/:id` | auth | Get announcement |
| PUT | `/:id` | auth + all | Update |
| DELETE | `/:id` | auth + all | Delete |
| POST | `/:id/pin` | auth + all | Pin announcement |

---

### PULSE `/api/v1/pulse`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/submit` | auth | Submit pulse check-in |
| GET | `/can-submit` | auth | Can submit today? |
| GET | `/my-history` | auth | My pulse history |
| GET | `/analytics/overview` | auth + roles(SA,TA,HR,MGR) | Overview analytics |
| GET | `/analytics/trends` | auth + roles(SA,TA,HR,MGR) | Trend data |
| GET | `/analytics/departments` | auth + roles(SA,TA,HR,MGR) | By department |
| GET | `/analytics/distribution` | auth + roles(SA,TA,HR,MGR) | Score distribution |

---

### LEADERBOARD `/api/v1/leaderboard`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/` | auth | Performance leaderboard |
| GET | `/performance` | auth | Performance scores |
| GET | `/goals` | auth | Goals completion board |
| GET | `/recognition` | auth | Recognition board |
| GET | `/learning` | auth | Learning board |
| GET | `/departments` | auth | Dept scores |
| GET | `/my-stats` | auth | My leaderboard position |

---

### ONE-ON-ONES `/api/v1/one-on-ones`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/` | auth | Create 1-on-1 |
| GET | `/` | auth | List 1-on-1s |
| GET | `/upcoming` | auth | Upcoming meetings |
| GET | `/:id` | auth | Get meeting |
| PUT | `/:id` | auth | Update meeting |
| POST | `/:id/start` | auth | Start meeting |
| POST | `/:id/complete` | auth | Complete meeting |
| POST | `/:id/cancel` | auth | Cancel meeting |

---

### CAREER `/api/v1/career`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/path/me` | auth | My career path |
| GET | `/goals/me` | auth | My career goals |
| GET | `/path/:userId` | auth | User career path |
| GET | `/growth-requirements/:roleId` | auth | Role requirements |
| GET | `/roles` | auth | Available roles |
| GET | `/goals/:userId` | auth | User career goals |

---

### REPORTS `/api/v1/reports`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/generate` | auth + own | Generate report |
| GET | `/` | auth + own | List reports |
| GET | `/schedules` | auth + dept | List schedules |
| GET | `/schedules/:id/stats` | auth + dept | Schedule stats |
| GET | `/:id/download` | auth + own | Download report |
| GET | `/:id` | auth + own | Get report |
| POST | `/schedules` | auth + dept | Create schedule |
| PATCH | `/schedules/:id` | auth + dept | Update schedule |
| DELETE | `/schedules/:id` | auth + dept | Delete schedule |
| POST | `/schedules/:id/pause` | auth + dept | Pause schedule |
| POST | `/schedules/:id/resume` | auth + dept | Resume schedule |
| GET | `/jobs/:jobId` | auth + own | Job status |
| GET | `/cache/stats` | auth + all | Cache stats |
| POST | `/cache/invalidate` | auth + all | Invalidate cache |

---

### REAL-TIME PERFORMANCE `/api/v1/realtime-performance`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/snapshot` | auth | Current performance snapshot |
| GET | `/hourly` | auth | Hourly metrics |
| POST | `/hourly` | auth | Record hourly metrics |
| POST | `/activity` | auth | Log activity |
| GET | `/activity` | auth | Activity stream |
| GET | `/activity/summary` | auth | Activity summary |
| GET | `/goals/dashboard` | auth | Goals dashboard |
| GET | `/deadlines/check` | auth | Check deadlines |
| GET | `/deadlines/alerts` | auth | Deadline alerts |
| POST | `/deadlines/alerts/:id/acknowledge` | auth | Acknowledge alert |
| POST | `/deadlines/alerts/:id/snooze` | auth | Snooze alert |
| GET | `/workload` | auth | My workload analysis |
| GET | `/workload/team` | auth | Team workload |
| GET | `/anomalies/detect` | auth | Detect anomalies |
| GET | `/sentiment` | auth | Sentiment analysis |
| GET | `/sentiment/team` | auth | Team morale |
| POST | `/milestones` | auth | Create milestone |
| PATCH | `/milestones/:id` | auth | Update milestone |
| GET | `/milestones` | auth | List milestones |
| GET | `/milestones/timeline` | auth | Milestone timeline |
| POST | `/milestones/detect` | auth | Auto-detect milestones |
| GET | `/heatmap/individual` | auth | Activity heatmap |
| GET | `/heatmap/team` | auth | Team heatmap |

---

### SKILLS `/api/v1/skills`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/categories` | auth | Skill categories |
| POST | `/categories` | auth + all | Create category |
| PUT | `/categories/:id` | auth + all | Update category |
| DELETE | `/categories/:id` | auth + all | Delete category |
| GET | `/assessments` | auth | List assessments |
| POST | `/assessments` | auth | Create assessment |
| POST | `/assessments/request` | auth | Request assessment |
| PUT | `/assessments/:id` | auth | Update assessment |
| POST | `/assessments/:id/progress` | auth | Log progress |
| GET | `/matrix/me` | auth | My skill matrix |
| GET | `/matrix/user/:userId` | auth | User skill matrix |
| GET | `/matrix/team` | auth + team | Team skill matrix |
| GET | `/gaps` | auth + all | Org skill gaps |
| GET | `/heatmap` | auth + all | Org skill heatmap |

---

### ROLES `/api/v1/roles`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/` | auth + roles(HR, TA) | List roles |
| GET | `/permissions-catalog` | auth + roles(HR, TA) | All permissions |
| GET | `/compare` | auth + roles(HR, TA) | Compare roles |
| GET | `/:id` | auth + roles(HR, TA) | Get role |
| POST | `/` | auth + roles(TA) | Create role |
| POST | `/:id/clone` | auth + roles(TA) | Clone role |
| PUT | `/:id` | auth + roles(TA) | Update role |
| DELETE | `/:id` | auth + roles(TA) | Delete role |

---

### DELEGATIONS `/api/v1/delegations`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/` | auth + roles(TA, HR, MGR) | List delegations |
| GET | `/:id` | auth + roles(TA, HR, MGR) | Get delegation |
| POST | `/` | auth + roles(TA, HR, MGR) | Create delegation |
| POST | `/:id/approve` | auth + roles(TA, HR) | Approve |
| POST | `/:id/reject` | auth + roles(TA, HR) | Reject |
| POST | `/:id/revoke` | auth + roles(TA, HR) | Revoke |
| GET | `/:id/audit` | auth + roles(TA, HR) | Delegation audit trail |

---

### POLICIES `/api/v1/policies`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/` | auth + roles(TA, HR) | List policies |
| POST | `/simulate` | auth + roles(TA, HR) | Simulate policy |
| POST | `/` | auth + roles(TA) | Create policy |
| GET | `/:id` | auth + roles(TA, HR) | Get policy |
| PUT | `/:id` | auth + roles(TA) | Update policy |
| POST | `/:id/activate` | auth + roles(TA) | Activate policy |
| POST | `/:id/deactivate` | auth + roles(TA) | Deactivate policy |
| DELETE | `/:id` | auth + roles(TA) | Delete policy |

---

### AUDIT `/api/v1/audit`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/` | auth + all | List audit logs |
| GET | `/stats` | auth + all | Audit statistics |
| GET | `/entity/:type/:id` | auth + all | Entity history |
| GET | `/user/:userId` | auth + all\|own | User activity |
| GET | `/:id` | auth + all | Get log entry |
| DELETE | `/purge` | auth + SA roles | Purge old logs |

---

### ADMIN CONFIG `/api/v1/admin-config`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/templates` | auth + admin | List review templates |
| POST | `/templates` | auth + admin | Create template |
| PUT | `/templates/:id` | auth + admin | Update template |
| DELETE | `/templates/:id` | auth + admin | Delete template |
| GET | `/frameworks` | auth + admin | List competency frameworks |
| POST | `/frameworks` | auth + admin | Create framework |
| PUT | `/frameworks/:id` | auth + admin | Update framework |
| DELETE | `/frameworks/:id` | auth + admin | Delete framework |
| GET | `/frameworks/:id/competencies` | auth + admin | List competencies |
| POST | `/frameworks/:id/competencies` | auth + admin | Add competency |
| PUT | `/competencies/:id` | auth + admin | Update competency |
| DELETE | `/competencies/:id` | auth + admin | Delete competency |
| GET | `/questionnaires` | auth + admin | List questionnaires |
| POST | `/questionnaires` | auth + admin | Create questionnaire |
| PUT | `/questionnaires/:id` | auth + admin | Update questionnaire |
| DELETE | `/questionnaires/:id` | auth + admin | Delete questionnaire |
| GET | `/rating-scales` | auth + admin | Rating scale config |

---

### ENGAGEMENT `/api/v1/engagement`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/overview` | auth + roles(SA,TA,HR,MGR) | Engagement overview |
| GET | `/dashboard` | auth + roles(SA,TA,HR,MGR) | Dashboard data |
| GET | `/trends` | auth + roles(SA,TA,HR,MGR) | Trends over time |
| GET | `/departments` | auth + roles(SA,TA,HR,MGR) | By department |
| GET | `/at-risk` | auth + roles(SA,TA,HR,MGR) | At-risk employees |
| GET | `/events` | auth + roles(SA,TA,HR,MGR) | Engagement events |

---

### HEALTH METRICS `/api/v1/health-metrics`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/` | auth + roles(SA,TA,HR,MGR) | Latest metrics |
| GET | `/history` | auth + roles(SA,TA,HR,MGR) | Historical data |
| GET | `/departments` | auth + roles(SA,TA,HR,MGR) | By department |

---

### UPGRADE REQUESTS `/api/v1/upgrade-requests`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/` | auth + roles(TA) | My tenant's requests |
| POST | `/` | auth + roles(TA) | Submit upgrade request |
| POST | `/:id/cancel` | auth + roles(TA) | Cancel request |

---

### SIMULATOR `/api/v1/simulator`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/run` | auth + roles(MGR, HR, TA) | Run performance simulation |

---

### CALENDAR `/api/v1/calendar/events`
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/` | auth | Create event |
| GET | `/` | auth | List events |
| GET | `/:id` | auth | Get event |
| PUT | `/:id` | auth | Update event |
| DELETE | `/:id` | auth | Delete event |

---

### AI `/api/v1/ai`
All require `auth` + `aiAccessGuard` (user must have AI access enabled)

| Method | Path | Action |
|--------|------|--------|
| POST | `/chat` | Chat with AI |
| GET | `/conversations` | AI conversation history |
| GET | `/conversations/:id` | Get conversation |
| DELETE | `/conversations/:id` | Archive conversation |
| PATCH | `/conversations/:id` | Rename conversation |
| POST | `/excel/analyze` | AI Excel analysis |
| GET | `/insights/summary` | AI insights summary |
| GET | `/insights` | All AI insights |
| PUT | `/insights/:id/read` | Mark insight read |
| PUT | `/insights/:id/dismiss` | Dismiss insight |
| POST | `/reports/generate` | AI report generation |
| GET | `/usage` | AI token usage |
| GET | `/tasks` | AI background tasks |
| GET | `/tasks/:id` | Get task status |
| POST | `/tasks/:id/cancel` | Cancel task |
| GET | `/actions/pending` | Pending AI actions needing approval |
| POST | `/actions/:id/approve` | Approve AI action |
| POST | `/actions/:id/reject` | Reject AI action |
| POST | `/chat/coordinate` | Multi-agent coordination |
| GET | `/agents/active` | Active AI agents |

---

### SUPER ADMIN `/api/admin`
All require `requireSuperAdmin` middleware (except auth routes)

| Method | Path | Action |
|--------|------|--------|
| POST | `/auth/login` | Super admin login |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/mfa/verify` | Verify MFA |
| POST | `/auth/logout` | Logout |
| GET | `/tenants` | List all tenants |
| GET | `/tenants/:id` | Get tenant |
| POST | `/tenants` | Create tenant |
| PUT | `/tenants/:id` | Update tenant |
| DELETE | `/tenants/:id` | Delete tenant |
| POST | `/tenants/:id/suspend` | Suspend tenant |
| POST | `/tenants/:id/activate` | Activate tenant |
| GET | `/tenants/:id/metrics` | Tenant metrics |
| PUT | `/tenants/:id/settings` | Update settings |
| POST | `/tenants/:id/export` | Export tenant data |
| GET | `/tenants/:id/designated-manager` | Get designated manager |
| POST | `/tenants/:id/designated-manager` | Assign designated manager |
| GET | `/users` | List all users (cross-tenant) |
| POST | `/users` | Create user |
| GET | `/users/:id` | Get user |
| POST | `/users/:id/suspend` | Suspend user |
| POST | `/users/:id/activate` | Activate user |
| POST | `/users/:id/reset-password` | Reset password |
| POST | `/users/:id/disable-mfa` | Disable user MFA |
| GET | `/system/dashboard` | System dashboard stats |
| GET | `/system/metrics` | System metrics |
| GET | `/system/config` | System configuration |
| PUT | `/system/config` | Update system config |
| GET | `/system/health` | System health |
| POST | `/system/cache/clear` | Clear all cache |
| GET | `/audit` | Cross-tenant audit logs |
| POST | `/audit/export` | Export audit logs |
| GET | `/billing` | All billing records |
| GET | `/billing/revenue` | MRR/ARR/revenue |
| PUT | `/billing/tenants/:id/plan` | Change tenant plan |
| POST | `/billing/tenants/:id/invoices` | Create invoice |
| GET | `/security/threats` | Security threats |
| POST | `/security/ip/block` | Block IP |
| POST | `/security/ip/unblock` | Unblock IP |
| GET | `/security/ip/blocked` | Blocked IPs |
| GET | `/security/sessions` | Active sessions |
| DELETE | `/security/sessions/:id` | Terminate session |
| DELETE | `/security/sessions/user/:id` | Terminate all user sessions |
| GET | `/upgrade-requests` | All upgrade requests |
| GET | `/upgrade-requests/pending-count` | Pending count |
| POST | `/upgrade-requests/:id/approve` | Approve upgrade |
| POST | `/upgrade-requests/:id/reject` | Reject upgrade |

---

### MISC MODULES
| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Teams | `/api/v1/teams` | GET `/my`, `/`, `/:id`, `/:id/members`, `/:id/goals`, `/:id/analytics` |
| Checkins | `/api/v1/checkins` | GET `/my`, `/templates`, `/upcoming`, `/history`, `/`; POST `/` |
| Mentoring | `/api/v1/mentoring` | GET `/matches`, `/my-mentorships`, `/sessions`; POST `/request` |
| AI Insights | `/api/v1/ai-insights` | Sentiment, anomaly, benchmark, productivity, engagement endpoints |

---

### SYSTEM ENDPOINTS
| Method | Path | Auth | Action |
|--------|------|------|--------|
| GET | `/health` | public | API health check |
| GET | `/ready` | public | DB + Redis readiness |

---

## 6. END-TO-END FLOW BY FEATURE

### Login Flow
```
User fills /login form
  → POST /api/v1/auth/login
  → API: validates email/password, checks tenant, bcrypt compare
  → Returns: { accessToken, refreshToken, user { roles, permissions } }
  → Frontend: useAuthStore.setUser() + setTokens()
  → Redirect: SUPER_ADMIN → /sa/dashboard | others → /dashboard
```

### Goal Creation Flow
```
Employee on /goals → clicks "New Goal"
  → POST /api/v1/goals
  → auth middleware validates JWT
  → authorize(own) checks scope
  → GoalsController.create() → Prisma.goal.create()
  → Socket.IO emits goal:created event
  → Manager sees new goal on /team page
  → CPIS recalculates GAI dimension
```

### Review Cycle Flow
```
HR Admin on /review-cycles → "Create Cycle"
  → POST /api/v1/reviews/cycles (requires HR Admin role)
  → Cycle created in DB
  → POST /api/v1/reviews/cycles/:id/launch
  → Notifications sent to all employees (Socket.IO + email)
  → Employees see pending review on /reviews
  → Employee: POST /api/v1/reviews/:id/submit
  → Manager: POST /api/v1/reviews/:id/submit (manager review)
  → HR: Calibration via /api/v1/calibration/sessions
  → CPIS RQS dimension updates
```

### Excel Upload Flow
```
HR Admin on /admin/excel-upload
  → POST /api/v1/excel-upload/analyze (HR/TA/SA only)
  → AI validates headers, detects issues
  → Returns preview with errors highlighted
  → HR confirms → POST /api/v1/excel-upload/:id/confirm
  → Users created/updated in DB
  → Seat limit checked (enforceSeatLimit())
  → Audit log: EXCEL_UPLOAD_COMPLETED
  → Socket.IO progress updates via GET /progress
```

### AI Chat Flow
```
User on /chat (AI tab) — must have aiAccessEnabled = true
  → POST /api/v1/ai/chat
  → aiAccessGuard checks user.aiAccessEnabled
  → AI routes to best provider (Claude/GPT-4o/Gemini)
  → Response streams back
  → Conversation saved to DB
  → Usage tracked per tenant
```

### CPIS Score Flow
```
Employee actions (goals, reviews, feedback, pulse, skills)
  → Each stored in DB
  → GET /api/v1/performance-math/cpis/me
  → math-engine.ts calculates 8 dimensions:
      GAI (25%) — goal achievement
      RQS (20%) — review quality
      FSI (12%) — feedback
      CIS (10%) — check-ins
      CRI (10%) — career readiness
      GTS (8%)  — goal timeliness
      EQS (8%)  — engagement
      III (7%)  — innovation
  → Weighted mean → CPIS score 0-100
  → Shown on Dashboard, Leaderboard, Analytics
```

---

*Last updated: 2026-03-21 | 5 roles · 89 pages · 43 modules · 300+ endpoints*
