import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { navigationSections, adminSection } from '@/config/navigation';

// Maps URL path segments to human-readable labels
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  goals: 'Goals',
  'goal-alignment': 'Goal Alignment',
  okrs: 'OKRs',
  reviews: 'Reviews',
  feedback: 'Feedback',
  'one-on-ones': '1-on-1s',
  'self-appraisal': 'Self-Appraisal',
  development: 'Development',
  'ai-development': 'AI Dev Plans',
  pip: 'PIP',
  recognition: 'Recognition',
  calibration: 'Calibration',
  analytics: 'Analytics',
  realtime: 'Real-time',
  team: 'Team',
  'team-insights': 'Team Insights',
  'talent-intelligence': 'Talent Intelligence',
  'team-optimizer': 'Team Optimizer',
  simulator: 'Simulator',
  profile: 'Profile',
  settings: 'Settings',
  reports: 'Reports',
  'report-schedules': 'Schedules',
  'hr-analytics': 'HR Analytics',
  'health-dashboard': 'Org Health',
  succession: 'Succession',
  help: 'Help',
  admin: 'Administration',
  users: 'User Management',
  config: 'Configuration',
  audit: 'Audit Log',
  skills: 'Skills',
  'skill-gaps': 'Skill Gaps',
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
  mentoring: 'Mentoring',
  chat: 'Chat',
  notifications: 'Notifications',
  licenses: 'License & Seats',
  'excel-upload': 'Excel Upload',
  'ai-access': 'AI Access',
  'ai-insights': 'AI Insights',
  roles: 'Roles',
  delegations: 'Delegations',
  policies: 'Access Policies',
  'rbac-dashboard': 'RBAC Dashboard',
  upgrade: 'Upgrade Plan',
  'org-chart': 'Org Chart',
  directory: 'Directory',
  engagement: 'Engagement',
  wellbeing: 'Wellbeing',
  'meeting-analytics': 'Meetings',
  anomalies: 'Anomalies',
  benchmarks: 'Benchmarks',
  'culture-diagnostics': 'Culture Diagnostics',
  exports: 'Exports',
  pulse: 'Pulse',
  calendar: 'Calendar',
  moderate: 'Moderator',
};

// Segments that are section headers (not real pages) — shown as plain text, not links
const SECTION_ONLY_SEGMENTS = new Set(['admin']);

// ── Build reverse map: nav item href → sidebar section label ─────────────────
const HREF_TO_SECTION: Record<string, string> = {};
[...navigationSections, adminSection].forEach((section) => {
  section.items.forEach((item) => {
    HREF_TO_SECTION[item.href] = section.label;
  });
});

/** Find which sidebar section a given path belongs to */
function findSectionForPath(pathname: string): string | null {
  // Exact match
  if (HREF_TO_SECTION[pathname]) return HREF_TO_SECTION[pathname];
  // Try progressively shorter prefixes (for sub-pages like /goals/abc-123)
  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 1; i--) {
    const prefix = '/' + segments.slice(0, i).join('/');
    if (HREF_TO_SECTION[prefix]) return HREF_TO_SECTION[prefix];
  }
  return null;
}

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
            <li key={crumb.href ?? `crumb-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRightIcon className="h-3.5 w-3.5 text-secondary-400 dark:text-secondary-600 shrink-0" />
              )}
              {isLast || !crumb.href ? (
                <span className={clsx(
                  'break-words',
                  isLast
                    ? 'font-medium text-secondary-900 dark:text-white'
                    : 'text-secondary-400 dark:text-secondary-500'
                )}>
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.href}
                  className="text-secondary-500 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors break-words"
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

function generateCrumbs(pathname: string): Array<{ label: string; href?: string }> {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: 'Home', href: '/dashboard' },
  ];

  // Determine which sidebar section this path belongs to
  const sectionLabel = findSectionForPath(pathname);
  const isAdminPath = segments[0] === 'admin';

  // Insert the section label as a non-clickable crumb right after Home.
  // For /admin/* paths, the 'admin' segment already generates "Administration" below,
  // so we skip the auto-insert to avoid duplication.
  if (sectionLabel && !isAdminPath) {
    crumbs.push({ label: sectionLabel });
  }

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;

    if (isIdSegment(segment)) {
      crumbs.push({ label: 'Details', href: currentPath });
    } else {
      const label = ROUTE_LABELS[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      // Section-only segments (e.g. "admin") are non-clickable labels
      if (SECTION_ONLY_SEGMENTS.has(segment)) {
        crumbs.push({ label });
      } else {
        crumbs.push({ label, href: currentPath });
      }
    }
  }

  return crumbs;
}
