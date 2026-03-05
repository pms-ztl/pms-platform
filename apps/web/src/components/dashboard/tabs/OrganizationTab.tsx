import { useAuthStore } from '@/store/auth';

import AnimatedSection from '@/components/dashboard/AnimatedSection';
import LicenseUtilizationGauge from '@/components/dashboard/LicenseUtilizationGauge';
import TenantSystemHealth from '@/components/dashboard/TenantSystemHealth';
import TeamPerformanceChart from '@/components/analytics/TeamPerformanceChart';

export default function OrganizationTab() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-4">
      {/* License Gauge + System Health */}
      <AnimatedSection stagger={1}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LicenseUtilizationGauge />
          <TenantSystemHealth />
        </div>
      </AnimatedSection>

      {/* Cross-Department Performance */}
      <AnimatedSection stagger={2}>
        <TeamPerformanceChart managerId={user?.id ?? ''} />
      </AnimatedSection>
    </div>
  );
}
