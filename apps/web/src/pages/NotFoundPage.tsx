import { Link } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';
import { usePageTitle } from '@/hooks/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Page Not Found');

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="text-center">
        {/* Large 404 */}
        <p className="text-8xl font-extrabold tracking-tight text-primary-500/20 dark:text-primary-400/15 select-none">
          404
        </p>

        {/* Title */}
        <h1 className="-mt-4 text-2xl font-bold text-secondary-900 dark:text-white">
          Page not found
        </h1>

        {/* Description */}
        <p className="mt-3 max-w-sm mx-auto text-sm text-secondary-500 dark:text-secondary-400">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Check the URL or head back to the dashboard.
        </p>

        {/* Action */}
        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900"
        >
          <HomeIcon className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
