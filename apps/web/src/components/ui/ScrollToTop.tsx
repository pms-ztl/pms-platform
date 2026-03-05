import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
  /** ms of scroll-inactivity before the button fades out */
  hideDelay?: number;
}

export function ScrollToTop({ threshold = 300, className, hideDelay = 2000 }: ScrollToTopProps) {
  const [pastThreshold, setPastThreshold] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [glowing, setGlowing] = useState(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();
  const glowTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const past = window.scrollY > threshold;
          setPastThreshold(past);

          if (past) {
            // User is actively scrolling past threshold → show + glow
            setScrolling(true);
            setGlowing(true);

            // Clear previous timers
            clearTimeout(scrollTimer.current);
            clearTimeout(glowTimer.current);

            // Turn off glow after 600ms (quick pulse)
            glowTimer.current = setTimeout(() => setGlowing(false), 600);

            // Hide button after user stops scrolling
            scrollTimer.current = setTimeout(() => setScrolling(false), hideDelay);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimer.current);
      clearTimeout(glowTimer.current);
    };
  }, [threshold, hideDelay]);

  const scrollToTop = useCallback(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, []);

  const show = pastThreshold && scrolling;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={clsx(
        'fixed bottom-20 right-6 z-40 rounded-full p-2.5 transition-all',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900',
        show
          ? 'translate-y-0 opacity-100 duration-300'
          : 'translate-y-4 opacity-0 pointer-events-none duration-500',
        className
      )}
      style={show ? {
        background: glowing
          ? 'linear-gradient(135deg, var(--c-primary-500), var(--c-primary-400))'
          : 'linear-gradient(135deg, var(--c-primary-600), var(--c-primary-500))',
        color: '#fff',
        boxShadow: glowing
          ? '0 0 20px var(--c-primary-500), 0 0 40px color-mix(in srgb, var(--c-primary-500) 40%, transparent), 0 4px 15px rgba(0,0,0,0.2)'
          : '0 2px 10px rgba(0,0,0,0.15), 0 0 0 transparent',
        transform: glowing ? 'translateY(0) scale(1.1)' : 'translateY(0) scale(1)',
      } : undefined}
    >
      <ChevronUpIcon
        className={clsx(
          'h-[1.125rem] w-[1.125rem] transition-transform duration-300',
          glowing && 'scale-110'
        )}
        strokeWidth={2.5}
      />
    </button>
  );
}
