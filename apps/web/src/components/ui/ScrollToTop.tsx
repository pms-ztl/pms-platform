import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
  idleTimeout?: number;
}

export function ScrollToTop({ threshold = 300, className, idleTimeout = 5000 }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  const resetIdle = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), idleTimeout);
  }, [idleTimeout]);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setVisible(window.scrollY > threshold);
          ticking = false;
        });
        ticking = true;
      }
      resetIdle();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', resetIdle, { passive: true });
    window.addEventListener('touchstart', resetIdle, { passive: true });

    // Start idle timer
    idleTimer.current = setTimeout(() => setIdle(true), idleTimeout);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      clearTimeout(idleTimer.current);
    };
  }, [threshold, resetIdle, idleTimeout]);

  const scrollToTop = useCallback(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, []);

  const show = visible && !idle;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={clsx(
        'fixed bottom-20 right-6 z-40 rounded-full p-3 shadow-lg transition-all duration-500',
        'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-xl',
        'dark:bg-primary-500 dark:hover:bg-primary-400',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900',
        show
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none',
        className
      )}
    >
      <ChevronUpIcon className="h-5 w-5" />
    </button>
  );
}
