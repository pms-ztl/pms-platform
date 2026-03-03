import type { ReactNode } from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// SafePanel — Content-driven card/panel wrapper
// ---------------------------------------------------------------------------
// Hard rules enforced:
//   • NO fixed heights by default (h-auto)
//   • NO justify-between that reserves empty right space
//   • Optional rightSlot — space only allocated when provided
//   • Density prop controls padding (compact | normal | spacious)
//   • data-testid for automated layout audit
// ---------------------------------------------------------------------------

type Density = 'compact' | 'normal' | 'spacious';

const densityPadding: Record<Density, string> = {
  compact: 'p-3',
  normal: 'p-4 sm:p-5',
  spacious: 'p-5 sm:p-6',
};

interface SafePanelProps {
  children: ReactNode;
  /** Optional right-side content (sparkline, badge, etc.) — only allocates space if provided */
  rightSlot?: ReactNode;
  /** Padding density */
  density?: Density;
  /** Optional header above content */
  header?: ReactNode;
  /** Optional footer below content */
  footer?: ReactNode;
  className?: string;
  noBorder?: boolean;
  'data-testid'?: string;
}

export function SafePanel({
  children,
  rightSlot,
  density = 'normal',
  header,
  footer,
  className,
  noBorder,
  'data-testid': testId,
}: SafePanelProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl overflow-hidden',
        !noBorder && 'border border-secondary-200/60 dark:border-white/[0.06]',
        className,
      )}
      data-testid={testId ?? 'ui-panel'}
    >
      {header && (
        <div className="border-b border-secondary-200/60 dark:border-white/[0.06] px-4 py-3">
          {header}
        </div>
      )}
      <div className={clsx(densityPadding[density])}>
        {rightSlot ? (
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">{children}</div>
            <div className="flex-shrink-0">{rightSlot}</div>
          </div>
        ) : (
          children
        )}
      </div>
      {footer && (
        <div className="border-t border-secondary-200/60 dark:border-white/[0.06] px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}
