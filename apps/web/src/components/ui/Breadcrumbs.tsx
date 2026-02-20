import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

// Maps URL path segments to human-readable labels
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  goals: 'Goals',
  'goal-alignment': 'Goal Alignment',
  reviews: 'Reviews',
  feedback: 'Feedback',
  'one-on-ones': '1-on-1s',
  development: 'Development',
  pip: 'PIP',
  recognition: 'Recognition',
  calibration: 'Calibration',
  analytics: 'Analytics',
  realtime: 'Real-time',
  team: 'Team',
  profile: 'Profile',
  settings: 'Settings',
  'self-appraisal': 'Self-Appraisal',
  reports: 'Reports',
  'hr-analytics': 'HR Analytics',
  succession: 'Succession',
  help: 'Help',
  admin: 'Administration',
  users: 'User Management',
  config: 'Configuration',
  audit: 'Audit Log',
  skills: 'Skills',
  compensation: 'Compensation',
  promotions: 'Promotions',
  evidence: 'Evidence',
  employees: 'Employees',
  compliance: 'Compliance',
  announcements: 'Announcements',
  'review-cycles': 'Review Cycles',
  career: 'Career Path',
  'manager-dashboard': 'Manager Hub',
  leaderboard: 'Leaderboard',
  chat: 'Chat',
  notifications: 'Notifications',
  licenses: 'License & Seats',
  'excel-upload': 'Excel Upload',
  'ai-access': 'AI Access',
  roles: 'Roles',
  upgrade: 'Upgrade Plan',
  'org-chart': 'Org Chart',
  directory: 'Directory',
  'health-dashboard': 'Org Health',
  engagement: 'Engagement',
  pulse: 'Pulse',
  moderate: 'Moderator',
};

// Check if a segment looks like a UUID or ID
const isIdSegment = (segment: string) => /^[0-9a-f-]{8,}$/i.test(segment);

interface BreadcrumbsProps {
  items?: Array<{ label: string; href?: string }>;
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { pathname } = useLocation();

  // Don't show on dashboard (it's the root)
  if (pathname === '/dashboard' || pathname === '/') return null;

  // Use custom items if provided, otherwise auto-generate
  const crumbs = items ?? generateCrumbs(pathname);

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={clsx('mb-4', className)}>
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={crumb.href ?? index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRightIcon className="h-3.5 w-3.5 text-secondary-400 dark:text-secondary-600 shrink-0" />
              )}
              {isLast || !crumb.href ? (
                <span className="font-medium text-secondary-900 dark:text-white truncate max-w-[200px]">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.href}
                  className="text-secondary-500 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate max-w-[200px]"
                >
                  {index === 0 ? (
                    <span className="flex items-center gap-1">
                      <HomeIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">{crumb.label}</span>
                    </span>
                  ) : (
                    crumb.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function generateCrumbs(pathname: string): Array<{ label: string; href: string }> {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Array<{ label: string; href: string }> = [
    { label: 'Home', href: '/dashboard' },
  ];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;

    if (isIdSegment(segment)) {
      crumbs.push({ label: 'Details', href: currentPath });
    } else {
      const label = ROUTE_LABELS[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      crumbs.push({ label, href: currentPath });
    }
  }

  return crumbs;
}
