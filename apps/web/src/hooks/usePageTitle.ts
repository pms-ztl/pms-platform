import { useEffect } from 'react';

const DEFAULT_SUFFIX = ' | PMS Platform';

/**
 * Sets the document title reactively for each page.
 * Usage: usePageTitle('Dashboard') → "Dashboard | PMS Platform"
 */
export function usePageTitle(title: string, suffix: string = DEFAULT_SUFFIX) {
  useEffect(() => {
    document.title = title ? `${title}${suffix}` : `PMS Platform`;
  }, [title, suffix]);
}
