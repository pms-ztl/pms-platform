import { useState, lazy, Suspense } from 'react';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import { AIWorkspacePage } from '@/pages/AIWorkspacePage';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';
import DashboardTabs from '@/components/dashboard/DashboardTabs';
import LiveIndicator from '@/components/dashboard/LiveIndicator';

// Lazy load tab content — each tab is a self-contained module
const MyPerformanceTab = lazy(() => import('@/components/dashboard/tabs/MyPerformanceTab'));
const TeamOverviewTab = lazy(() => import('@/components/dashboard/tabs/TeamOverviewTab'));
const HRAnalyticsTab = lazy(() => import('@/components/dashboard/tabs/HRAnalyticsTab'));
const OrganizationTab = lazy(() => import('@/components/dashboard/tabs/OrganizationTab'));

const TAB_COMPONENTS: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  'my-performance': MyPerformanceTab,
  'team-overview': TeamOverviewTab,
  'hr-analytics': HRAnalyticsTab,
  'organization': OrganizationTab,
};

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-secondary-200 dark:border-white/20 border-t-primary-500 dark:border-t-white/60 animate-spin" />
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

/**
 * DashboardPage — top-level route component.
 *
 * Keeps the AI-mode conditional return BEFORE any hooks by delegating
 * the real dashboard UI to DashboardContent. This avoids the React
 * "hooks called in different order" error that occurs when an early
 * return sits between hook calls.
 */
export function DashboardPage() {
  usePageTitle('Dashboard');
  const { isAiMode } = useAIWorkspaceStore();

  if (isAiMode) {
    return <AIWorkspacePage />;
  }

  return <DashboardContent />;
}

// ─── Dashboard Content (non-AI mode) ────────────────────────────────────────

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('my-performance');
  const { connectionStatus, lastUpdated } = useLiveDashboard();

  const TabComponent = TAB_COMPONENTS[activeTab] ?? MyPerformanceTab;

  return (
    <div className="space-y-3 pb-4">
      {/* Tab Bar + Live Indicator */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <LiveIndicator status={connectionStatus} lastUpdated={lastUpdated} />
      </div>

      {/* Tab Content — keyed for fresh mount animation on tab switch */}
      <Suspense fallback={<TabFallback />}>
        <div key={activeTab} className="dash-fade-in-up">
          <TabComponent />
        </div>
      </Suspense>
    </div>
  );
}
