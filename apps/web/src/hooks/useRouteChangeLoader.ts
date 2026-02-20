import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoadingStore } from '@/store/loading';

/**
 * Watches route changes and triggers the top loading bar.
 * Since the app uses BrowserRouter (not data router), route changes are instant,
 * so this provides a brief visual flash (~300ms) to indicate navigation.
 */
export function useRouteChangeLoader() {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);
  const { startLoading, stopLoading } = useLoadingStore();

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      startLoading();
      // Route changes are instant in BrowserRouter, so stop after a micro-delay
      requestAnimationFrame(() => {
        stopLoading();
      });
    }
  }, [pathname, startLoading, stopLoading]);
}
