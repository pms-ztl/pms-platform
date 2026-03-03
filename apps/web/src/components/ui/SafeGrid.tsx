import type { ReactNode } from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// SafeGrid — Auto-fit grid that never creates empty columns
// ---------------------------------------------------------------------------
// Uses CSS grid auto-fit so that when there are fewer items than columns,
// items stretch to fill available space instead of leaving blank columns.
//
// Props:
//   • minWidth  – minimum column width (default 320px)
//   • gap       – Tailwind gap class (default "gap-4")
//   • children  – grid items
//   • className – additional classes
// ---------------------------------------------------------------------------

interface SafeGridProps {
  children: ReactNode;
  /** Minimum column width in px (default 320) */
  minWidth?: number;
  /** Tailwind gap class */
  gap?: string;
  className?: string;
  'data-testid'?: string;
}

export function SafeGrid({
  children,
  minWidth = 320,
  gap = 'gap-4',
  className,
  'data-testid': testId,
}: SafeGridProps) {
  return (
    <div
      className={clsx('grid', gap, className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))` }}
      data-testid={testId ?? 'ui-safe-grid'}
    >
      {children}
    </div>
  );
}
