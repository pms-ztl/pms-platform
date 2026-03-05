import type { ReactNode } from 'react';
import { useSubscriptionPlan, type SubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { LockClosedIcon } from '@heroicons/react/24/outline';

interface GatedChartProps {
  /** Minimum subscription plan required to view this chart */
  minPlan: SubscriptionPlan;
  children: ReactNode;
  className?: string;
}

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

/**
 * Subscription gating wrapper. If the tenant's plan is below minPlan,
 * renders a blurred overlay with an upgrade prompt instead of the chart.
 */
export default function GatedChart({ minPlan, children, className = '' }: GatedChartProps) {
  const { canAccess, isLoading } = useSubscriptionPlan();

  if (isLoading) {
    return <div className={className}>{children}</div>;
  }

  if (canAccess(minPlan)) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)' }}>
        {children}
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800">
            <LockClosedIcon className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Available on {PLAN_LABELS[minPlan]} plan
          </p>
          <p className="text-2xs text-slate-500 dark:text-slate-400">
            Upgrade your subscription to unlock this insight
          </p>
        </div>
      </div>
    </div>
  );
}
