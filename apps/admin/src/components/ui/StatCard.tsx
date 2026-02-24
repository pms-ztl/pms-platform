import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

type AccentColor = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  className?: string;
  delay?: number;
  accentColor?: AccentColor;
}

const ACCENT_STYLES: Record<AccentColor, { iconBg: string; iconText: string; orbColor: string; shimmer: string }> = {
  blue: {
    iconBg: 'bg-gradient-to-br from-blue-500/25 to-blue-600/10 border-blue-400/20',
    iconText: 'text-blue-400 group-hover:text-blue-300',
    orbColor: 'rgba(59, 130, 246, 0.08)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.4) 50%, transparent 100%)',
  },
  violet: {
    iconBg: 'bg-gradient-to-br from-violet-500/25 to-violet-600/10 border-violet-400/20',
    iconText: 'text-violet-400 group-hover:text-violet-300',
    orbColor: 'rgba(139, 92, 246, 0.08)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.4) 50%, transparent 100%)',
  },
  emerald: {
    iconBg: 'bg-gradient-to-br from-emerald-500/25 to-emerald-600/10 border-emerald-400/20',
    iconText: 'text-emerald-400 group-hover:text-emerald-300',
    orbColor: 'rgba(16, 185, 129, 0.08)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.4) 50%, transparent 100%)',
  },
  amber: {
    iconBg: 'bg-gradient-to-br from-amber-500/25 to-amber-600/10 border-amber-400/20',
    iconText: 'text-amber-400 group-hover:text-amber-300',
    orbColor: 'rgba(245, 158, 11, 0.08)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.4) 50%, transparent 100%)',
  },
  rose: {
    iconBg: 'bg-gradient-to-br from-rose-500/25 to-rose-600/10 border-rose-400/20',
    iconText: 'text-rose-400 group-hover:text-rose-300',
    orbColor: 'rgba(244, 63, 94, 0.08)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(244,63,94,0.4) 50%, transparent 100%)',
  },
  cyan: {
    iconBg: 'bg-gradient-to-br from-cyan-500/25 to-cyan-600/10 border-cyan-400/20',
    iconText: 'text-cyan-400 group-hover:text-cyan-300',
    orbColor: 'rgba(6, 182, 212, 0.08)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.4) 50%, transparent 100%)',
  },
};

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

export function StatCard({ label, value, icon, trend, className, delay = 0, accentColor }: StatCardProps) {
  const isPositive = trend && trend.value >= 0;
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  const isNumeric = !isNaN(numericValue) && typeof value === 'number';
  const animatedNum = useAnimatedValue(isNumeric ? numericValue : 0, 1500);

  const accent = accentColor ? ACCENT_STYLES[accentColor] : null;

  return (
    <div
      className={clsx('glass-stat group animate-fade-in-up', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Accent orb glow in top-right */}
      {accent && (
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent.orbColor} 0%, transparent 70%)` }}
        />
      )}

      {/* Hover shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div
          className="h-full w-full animate-shimmer"
          style={{
            background: accent?.shimmer || 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      </div>

      <div className="flex items-start justify-between relative">
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
          <div
            className={clsx(
              'flex-shrink-0 rounded-xl border p-2.5 transition-all duration-300',
              accent
                ? `${accent.iconBg} group-hover:border-opacity-40`
                : 'bg-white/[0.06] border-white/[0.08] group-hover:bg-white/[0.1] group-hover:border-white/[0.12]'
            )}
          >
            <div className={clsx('h-6 w-6 transition-colors', accent ? accent.iconText : 'text-white/50 group-hover:text-white/80')}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
