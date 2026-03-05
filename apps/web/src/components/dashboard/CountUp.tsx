import { useRef, useEffect, useState } from 'react';

interface CountUpProps {
  /** Target number to count up to */
  end: number;
  /** Duration in ms. Default: 1200 */
  duration?: number;
  /** Decimal places. Default: 0 */
  decimals?: number;
  /** Prefix (e.g. "$") */
  prefix?: string;
  /** Suffix (e.g. "%") */
  suffix?: string;
  className?: string;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Animated number counter that triggers when the element scrolls into view.
 * Uses requestAnimationFrame with easeOutExpo easing.
 */
export default function CountUp({
  end,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState('0');
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.unobserve(el);
          animate();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();

    function animate() {
      const start = performance.now();

      function tick(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const value = easeOutExpo(progress) * end;

        setDisplay(value.toFixed(decimals));

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          setDisplay(end.toFixed(decimals));
        }
      }

      requestAnimationFrame(tick);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, duration, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}
