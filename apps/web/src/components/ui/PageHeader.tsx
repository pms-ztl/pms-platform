import type { ReactNode } from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// PageHeader — Frosted glassmorphism page banner
// ---------------------------------------------------------------------------
// Drop-in header for every page. Renders a frosted glass banner with
// decorative gradient orbs (primary/cyan by default). Accepts:
//   • title        – main heading (h1)
//   • subtitle     – optional description line
//   • children     – right-side action buttons / controls
//   • accentColor  – 'primary' | 'amber' | 'emerald' | 'rose' | 'cyan'
//   • compact      – smaller padding variant
// ---------------------------------------------------------------------------

type AccentColor = 'primary' | 'amber' | 'emerald' | 'rose' | 'cyan';

const orbColors: Record<AccentColor, { a: string; b: string }> = {
  primary: {
    a: 'from-primary-500/20 to-indigo-500/15',
    b: 'from-cyan-500/15 to-primary-500/10',
  },
  amber: {
    a: 'from-amber-500/30 to-orange-500/20',
    b: 'from-red-500/20 to-amber-500/15',
  },
  emerald: {
    a: 'from-emerald-500/20 to-teal-500/15',
    b: 'from-cyan-500/15 to-emerald-500/10',
  },
  rose: {
    a: 'from-rose-500/20 to-pink-500/15',
    b: 'from-fuchsia-500/15 to-rose-500/10',
  },
  cyan: {
    a: 'from-cyan-500/20 to-blue-500/15',
    b: 'from-indigo-500/15 to-cyan-500/10',
  },
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  accent?: AccentColor;
  compact?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  children,
  accent = 'primary',
  compact = false,
  className,
}: PageHeaderProps) {
  const orbs = orbColors[accent];

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl glass-banner shadow-lg',
        compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6',
        className,
      )}
    >
      {/* Decorative gradient orbs */}
      <div
        className={clsx(
          'absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br rounded-full blur-3xl',
          orbs.a,
        )}
      />
      <div
        className={clsx(
          'absolute -bottom-12 -left-12 w-44 h-44 bg-gradient-to-tr rounded-full blur-3xl',
          orbs.b,
        )}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white break-words">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-secondary-500 dark:text-secondary-400 text-sm">
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">{children}</div>
        )}
      </div>
    </div>
  );
}
