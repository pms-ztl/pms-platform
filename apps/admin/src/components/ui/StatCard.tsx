import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  className?: string;
  delay?: number;
}

// ── Animated counter hook ─────────────────────────────────────────────────
function useAnimatedValue(target: number, duration = 1200) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}

export function StatCard({ label, value, icon, trend, className, delay = 0 }: StatCardProps) {
  const isPositive = trend && trend.value >= 0;
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  const isNumeric = !isNaN(numericValue) && typeof value === 'number';
  const animatedNum = useAnimatedValue(isNumeric ? numericValue : 0, 1500);

  return (
    <div
      className={clsx('glass-stat group animate-fade-in-up', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Hover shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div
          className="h-full w-full animate-shimmer"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/45">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-white animate-counter-up" style={{ animationDelay: `${delay + 200}ms` }}>
            {isNumeric ? animatedNum.toLocaleString() : value}
          </p>
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={clsx(
                  'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md',
                  isPositive
                    ? 'text-emerald-400 bg-emerald-400/[0.1]'
                    : 'text-red-400 bg-red-400/[0.1]'
                )}
              >
                {isPositive ? '\u2191' : '\u2193'} {Math.abs(trend.value)}%
              </span>
              {trend.label && <span className="text-xs text-white/30">{trend.label}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 rounded-xl bg-white/[0.06] border border-white/[0.08] p-2.5 group-hover:bg-white/[0.1] group-hover:border-white/[0.12] transition-all duration-300">
            <div className="h-6 w-6 text-white/50 group-hover:text-white/80 transition-colors">{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
}
