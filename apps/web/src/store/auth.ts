import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '@/lib/query-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  displayName?: string;
  avatarUrl?: string;
  jobTitle?: string;
  department?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string };
  isActive: boolean;
  mfaEnabled?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
        }),

      logout: () => {
        queryClient.clear(); // Clear ALL cached queries to prevent cross-user data leakage
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'pms-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// Selectors
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectUserRoles = (state: AuthState) => state.user?.roles ?? [];

// Permission helpers
export function hasPermission(
  permissions: string[],
  resource: string,
  action: string
): boolean {
  return permissions.some((p) => {
    const [permResource, permAction] = p.split(':');
    return (
      (permResource === '*' || permResource === resource) &&
      (permAction === 'manage' || permAction === action)
    );
  });
}

export function hasRole(roles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.some((r) => roles.includes(r));
}

// Route-level access control configuration
// Maps restricted paths to the roles that can access them
const ROUTE_ACCESS: Record<string, { roles?: string[] }> = {
  '/calibration':        { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/analytics':          { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/realtime':           { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/team':               { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/pip':                { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/reports':            { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/compensation':       { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/promotions':         { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/review-cycles':      { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/manager-dashboard':  { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/hr-analytics':       { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
  '/succession':         { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
  '/compliance':         { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
  '/reviews/moderate':   { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  '/admin/users':        { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
  '/admin/config':       { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
  '/admin/audit':        { roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
};

/**
 * Check if a user with given roles can access a specific route path.
 * Routes not listed in ROUTE_ACCESS are accessible to all authenticated users.
 */
export function canAccess(roles: string[], path: string): boolean {
  const config = ROUTE_ACCESS[path];
  if (!config || !config.roles) return true;
  return config.roles.some((r) => roles.includes(r));
}
