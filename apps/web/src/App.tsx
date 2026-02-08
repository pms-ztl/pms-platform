import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth';
import { canAccess } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { authApi } from '@/lib/api';

// Layouts
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
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
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
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
          <Route path="admin/users" element={<RoleGuard path="/admin/users"><UserManagementPage /></RoleGuard>} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
