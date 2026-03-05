import { useQuery } from '@tanstack/react-query';
import { licenseApi } from '@/lib/api/admin';

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

const PLAN_HIERARCHY: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  PROFESSIONAL: 2,
  ENTERPRISE: 3,
};

export function useSubscriptionPlan() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => licenseApi.getSubscription(),
    staleTime: 300_000, // 5 min
  });

  const currentPlan = (subscription?.plan?.toUpperCase() ?? 'FREE') as SubscriptionPlan;
  const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;

  /** Check if the tenant's plan meets the minimum required plan */
  function canAccess(minPlan: SubscriptionPlan): boolean {
    const requiredLevel = PLAN_HIERARCHY[minPlan] ?? 0;
    return currentLevel >= requiredLevel;
  }

  return {
    plan: currentPlan,
    status: subscription?.status ?? 'ACTIVE',
    isLoading,
    canAccess,
    // Convenience booleans
    hasAnalytics: currentLevel >= 1,    // STARTER+
    hasCalibration: currentLevel >= 2,  // PROFESSIONAL+
    hasEnterprise: currentLevel >= 3,   // ENTERPRISE
  };
}
