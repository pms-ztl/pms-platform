import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import TenantsPage from './pages/tenants/TenantsPage';
import TenantDetailPage from './pages/tenants/TenantDetailPage';
import UsersPage from './pages/users/UsersPage';
import UserDetailPage from './pages/users/UserDetailPage';
import SystemConfigPage from './pages/system/SystemConfigPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import BillingPage from './pages/billing/BillingPage';
import SecurityPage from './pages/security/SecurityPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'SYSTEM_ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/tenants" element={<TenantsPage />} />
                <Route path="/tenants/:id" element={<TenantDetailPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/:id" element={<UserDetailPage />} />
                <Route path="/system" element={<SystemConfigPage />} />
                <Route path="/audit" element={<AuditLogsPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/security" element={<SecurityPage />} />
              </Routes>
            </AdminLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
