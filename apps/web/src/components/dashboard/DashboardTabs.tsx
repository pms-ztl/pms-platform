import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth';
import { useSubscriptionPlan, type SubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { MANAGER_ROLES } from '@/components/dashboard';

export interface DashboardTab {
  id: string;
  label: string;
  /** Roles that can see this tab (empty = ALL) */
  roles: string[];
  /** Minimum subscription plan */
  minPlan: SubscriptionPlan;
}

const ALL_TABS: DashboardTab[] = [
  { id: 'my-performance', label: 'My Performance', roles: [], minPlan: 'FREE' },
  { id: 'team-overview', label: 'Team Overview', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN', 'HR_ADMIN', 'HR_BP', 'MANAGER'], minPlan: 'FREE' },
  { id: 'hr-analytics', label: 'HR Analytics', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN', 'HR_ADMIN', 'HR_BP'], minPlan: 'STARTER' },
  { id: 'organization', label: 'Organization', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN'], minPlan: 'STARTER' },
];

function normalizeRole(role: string): string {
  return role.trim().toUpperCase().replace(/\s+/g, '_');
}

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const { user } = useAuthStore();
  const { canAccess } = useSubscriptionPlan();

  const normalizedUserRoles = useMemo(
    () => (user?.roles ?? []).map(normalizeRole),
    [user?.roles]
  );

  const visibleTabs = useMemo(
    () =>
      ALL_TABS.filter((tab) => {
        // Plan gating
        if (!canAccess(tab.minPlan)) return false;
        // Role gating (empty = all roles)
        if (tab.roles.length === 0) return true;
        return tab.roles.some((r) => normalizedUserRoles.includes(normalizeRole(r)));
      }),
    [normalizedUserRoles, canAccess]
  );

  if (visibleTabs.length <= 1) return null;

  return (
    <div className="dash-fade-in-up">
      <nav className="flex gap-1 p-1 rounded-xl glass-deep overflow-x-auto" role="tablist">
        {visibleTabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap
                ${isActive
                  ? 'bg-white/90 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-white/5'
                }
              `}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export { ALL_TABS };
