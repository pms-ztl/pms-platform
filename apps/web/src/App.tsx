import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';

import { useAuthStore } from '@/store/auth';
import { canAccess } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { authApi } from '@/lib/api';

// Layouts
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { GoalsPage } from '@/pages/goals/GoalsPage';
import { GoalDetailPage } from '@/pages/goals/GoalDetailPage';
import { ReviewsPage } from '@/pages/reviews/ReviewsPage';
import { ReviewDetailPage } from '@/pages/reviews/ReviewDetailPage';
import { FeedbackPage } from '@/pages/feedback/FeedbackPage';
import { CalibrationPage } from '@/pages/calibration/CalibrationPage';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
import { RealtimePerformancePage } from '@/pages/realtime/RealtimePerformancePage';
import { TeamPage } from '@/pages/team/TeamPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { UserManagementPage } from '@/pages/admin/UserManagementPage';
import { SelfAppraisalPage } from '@/pages/self-appraisal/SelfAppraisalPage';
import { OneOnOnesPage } from '@/pages/one-on-ones/OneOnOnesPage';
import { OneOnOneDetailPage } from '@/pages/one-on-ones/OneOnOneDetailPage';
import { DevelopmentPage } from '@/pages/development/DevelopmentPage';
import { DevelopmentPlanDetailPage } from '@/pages/development/DevelopmentPlanDetailPage';
import { PIPPage } from '@/pages/pip/PIPPage';
import { PIPDetailPage } from '@/pages/pip/PIPDetailPage';
import { RecognitionPage } from '@/pages/recognition/RecognitionPage';
import { ConfigurationPage } from '@/pages/admin/ConfigurationPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { SuccessionPage } from '@/pages/succession/SuccessionPage';
import { HelpPage } from '@/pages/help/HelpPage';
import { ModeratorDashboardPage } from '@/pages/reviews/ModeratorDashboardPage';
import { HRAnalyticsPage } from '@/pages/analytics/HRAnalyticsPage';
import { AuditLogPage } from '@/pages/admin/AuditLogPage';
import { SkillsMatrixPage } from '@/pages/skills/SkillsMatrixPage';
import { CompensationPage } from '@/pages/compensation/CompensationPage';
import { PromotionsPage } from '@/pages/promotions/PromotionsPage';
import { EvidencePage } from '@/pages/evidence/EvidencePage';
import { EmployeeProfilePage } from '@/pages/employees/EmployeeProfilePage';
import { CompliancePage } from '@/pages/compliance/CompliancePage';
import { AnnouncementsPage } from '@/pages/announcements/AnnouncementsPage';
import { ReviewCyclesPage } from '@/pages/reviews/ReviewCyclesPage';
import { GoalAlignmentPage } from '@/pages/goals/GoalAlignmentPage';
import { CareerPathPage } from '@/pages/career/CareerPathPage';
import { ManagerDashboardPage } from '@/pages/manager/ManagerDashboardPage';
import { LeaderboardPage } from '@/pages/leaderboard/LeaderboardPage';
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage';
import { ExcelUploadPage } from '@/pages/ExcelUploadPage';
import { LicenseDashboardPage } from '@/pages/admin/LicenseDashboardPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';

// Super Admin Pages (lazy loaded for code splitting)
const SADashboardPage = lazy(() => import('@/pages/super-admin/SADashboardPage').then(m => ({ default: m.SADashboardPage })));
const SATenantsPage = lazy(() => import('@/pages/super-admin/SATenantsPage').then(m => ({ default: m.SATenantsPage })));
const SATenantDetailPage = lazy(() => import('@/pages/super-admin/SATenantDetailPage').then(m => ({ default: m.SATenantDetailPage })));
const SAUsersPage = lazy(() => import('@/pages/super-admin/SAUsersPage').then(m => ({ default: m.SAUsersPage })));
const SABillingPage = lazy(() => import('@/pages/super-admin/SABillingPage').then(m => ({ default: m.SABillingPage })));
const SAAuditPage = lazy(() => import('@/pages/super-admin/SAAuditPage').then(m => ({ default: m.SAAuditPage })));
const SASecurityPage = lazy(() => import('@/pages/super-admin/SASecurityPage').then(m => ({ default: m.SASecurityPage })));
const SASystemPage = lazy(() => import('@/pages/super-admin/SASystemPage').then(m => ({ default: m.SASystemPage })));

// Suspense fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Role-based route guard — restricts access based on RBAC config
function RoleGuard({ children, path }: { children: React.ReactNode; path: string }) {
  const { user } = useAuthStore();

  if (!user || !canAccess(user.roles, path)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4 mb-4">
          <svg className="h-12 w-12 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">Access Denied</h2>
        <p className="text-secondary-500 dark:text-secondary-400 mt-2 max-w-md">
          You don&apos;t have the required permissions to view this page. Contact your administrator if you believe this is an error.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

// Public route wrapper (redirects if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Route Super Admin to their dedicated dashboard
    if (user?.roles.includes('SUPER_ADMIN')) {
      return <Navigate to="/sa/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Super Admin route guard - only allows SUPER_ADMIN role
function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.roles.includes('SUPER_ADMIN')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-50 dark:bg-gray-900">
        <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4 mb-4">
          <svg className="h-12 w-12 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
          Super Admin access is required to view this page.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

// Smart redirect: routes users to the correct dashboard based on role
function SmartRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.roles.includes('SUPER_ADMIN')) return <Navigate to="/sa/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  const { accessToken, setUser, setLoading, logout } = useAuthStore();
  const { theme } = useThemeStore();

  // Initialize theme on mount
  useEffect(() => {
    const root = document.documentElement;
    const getSystemTheme = () =>
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const user = await authApi.me();
        setUser(user);
      } catch {
        logout();
      }
    }

    checkAuth();
  }, [accessToken, setUser, setLoading, logout]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <AuthLayout>
                <ForgotPasswordPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/set-password"
          element={
            <AuthLayout>
              <SetPasswordPage />
            </AuthLayout>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="goals/:id" element={<GoalDetailPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="reviews/:id" element={<ReviewDetailPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="one-on-ones" element={<OneOnOnesPage />} />
          <Route path="one-on-ones/:id" element={<OneOnOneDetailPage />} />
          <Route path="development" element={<DevelopmentPage />} />
          <Route path="development/:id" element={<DevelopmentPlanDetailPage />} />
          <Route path="pip" element={<RoleGuard path="/pip"><PIPPage /></RoleGuard>} />
          <Route path="pip/:id" element={<RoleGuard path="/pip"><PIPDetailPage /></RoleGuard>} />
          <Route path="recognition" element={<RecognitionPage />} />
          <Route path="calibration" element={<RoleGuard path="/calibration"><CalibrationPage /></RoleGuard>} />
          <Route path="analytics" element={<RoleGuard path="/analytics"><AnalyticsPage /></RoleGuard>} />
          <Route path="realtime" element={<RoleGuard path="/realtime"><RealtimePerformancePage /></RoleGuard>} />
          <Route path="team" element={<RoleGuard path="/team"><TeamPage /></RoleGuard>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="self-appraisal" element={<SelfAppraisalPage />} />
          <Route path="reports" element={<RoleGuard path="/reports"><ReportsPage /></RoleGuard>} />
          <Route path="hr-analytics" element={<RoleGuard path="/hr-analytics"><HRAnalyticsPage /></RoleGuard>} />
          <Route path="succession" element={<RoleGuard path="/succession"><SuccessionPage /></RoleGuard>} />
          <Route path="help" element={<HelpPage />} />
          <Route path="reviews/moderate" element={<RoleGuard path="/reviews/moderate"><ModeratorDashboardPage /></RoleGuard>} />
          <Route path="admin/users" element={<RoleGuard path="/admin/users"><UserManagementPage /></RoleGuard>} />
          <Route path="admin/config" element={<RoleGuard path="/admin/config"><ConfigurationPage /></RoleGuard>} />
          <Route path="admin/audit" element={<RoleGuard path="/admin/audit"><AuditLogPage /></RoleGuard>} />
          <Route path="skills" element={<SkillsMatrixPage />} />
          <Route path="compensation" element={<RoleGuard path="/compensation"><CompensationPage /></RoleGuard>} />
          <Route path="promotions" element={<RoleGuard path="/promotions"><PromotionsPage /></RoleGuard>} />
          <Route path="evidence" element={<EvidencePage />} />
          <Route path="employees/:id" element={<EmployeeProfilePage />} />
          <Route path="compliance" element={<RoleGuard path="/compliance"><CompliancePage /></RoleGuard>} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="review-cycles" element={<RoleGuard path="/review-cycles"><ReviewCyclesPage /></RoleGuard>} />
          <Route path="goal-alignment" element={<GoalAlignmentPage />} />
          <Route path="career" element={<CareerPathPage />} />
          <Route path="manager-dashboard" element={<RoleGuard path="/manager-dashboard"><ManagerDashboardPage /></RoleGuard>} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="admin/licenses" element={<RoleGuard path="/admin/licenses"><LicenseDashboardPage /></RoleGuard>} />
          <Route path="admin/excel-upload" element={<RoleGuard path="/admin/excel-upload"><ExcelUploadPage /></RoleGuard>} />
        </Route>

        {/* Super Admin routes - completely separate layout */}
        <Route
          path="/sa"
          element={
            <SuperAdminGuard>
              <SuperAdminLayout />
            </SuperAdminGuard>
          }
        >
          <Route index element={<Navigate to="/sa/dashboard" replace />} />
          <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><SADashboardPage /></Suspense>} />
          <Route path="tenants" element={<Suspense fallback={<PageLoader />}><SATenantsPage /></Suspense>} />
          <Route path="tenants/:id" element={<Suspense fallback={<PageLoader />}><SATenantDetailPage /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoader />}><SAUsersPage /></Suspense>} />
          <Route path="billing" element={<Suspense fallback={<PageLoader />}><SABillingPage /></Suspense>} />
          <Route path="audit" element={<Suspense fallback={<PageLoader />}><SAAuditPage /></Suspense>} />
          <Route path="security" element={<Suspense fallback={<PageLoader />}><SASecurityPage /></Suspense>} />
          <Route path="system" element={<Suspense fallback={<PageLoader />}><SASystemPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><SASystemPage /></Suspense>} />
        </Route>

        {/* Catch all - route based on role */}
        <Route path="*" element={<SmartRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
