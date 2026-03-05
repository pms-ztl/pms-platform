import { type ReactNode } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;
  /** CSS class applied. Default: 'dash-fade-in-up' */
  animation?: string;
  /** Stagger index (1-8) for cascading delay */
  stagger?: number;
  /** Kept for API compat — unused */
  threshold?: number;
  className?: string;
}

/**
 * Wraps children with a CSS entrance animation + optional stagger delay.
 * Always renders visible — no IntersectionObserver gating (unreliable with zoom: 1.2).
 * The CSS @keyframes handle the fade-in-up effect directly.
 */
export default function AnimatedSection({
  children,
  animation = 'dash-fade-in-up',
  stagger,
  className = '',
}: AnimatedSectionProps) {
  const staggerClass = stagger ? `dash-stagger-${stagger}` : '';

  return (
    <div className={`${className} ${animation} ${staggerClass}`}>
      {children}
    </div>
  );
}
