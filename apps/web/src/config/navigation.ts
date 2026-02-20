import {
  HomeIcon,
  FlagIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ChartBarIcon,
  ScaleIcon,
  BoltIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  StarIcon,
  DocumentChartBarIcon,
  UserPlusIcon,
  QuestionMarkCircleIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  DocumentMagnifyingGlassIcon,
  MegaphoneIcon,
  PuzzlePieceIcon,
  CheckBadgeIcon,
  TrophyIcon,
  RectangleGroupIcon,
  MapIcon,
  ClipboardDocumentListIcon,
  ArrowUpTrayIcon,
  KeyIcon,
  SparklesIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  BuildingOffice2Icon,
  FaceSmileIcon,
  HeartIcon,
  FireIcon,
  ArrowsRightLeftIcon,
  ViewfinderCircleIcon,
  ArrowDownTrayIcon,
  ChartBarSquareIcon,
  ClockIcon,
  LinkIcon,
  LightBulbIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

// ── Types ────────────────────────────────────────────────────────────────────

export type NavItem = {
  name: string;
  href: string;
  icon: React.ForwardRefExoticComponent<any>;
  roles?: string[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
};

// ── Navigation Sections ──────────────────────────────────────────────────────

export const navigationSections: NavSection[] = [
  {
    label: 'Core',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'Goals', href: '/goals', icon: FlagIcon },
      { name: 'Goal Alignment', href: '/goal-alignment', icon: MapIcon },
      { name: 'OKRs', href: '/okrs', icon: FlagIcon },
      { name: '1-on-1s', href: '/one-on-ones', icon: CalendarDaysIcon },
      { name: 'Reviews', href: '/reviews', icon: ClipboardDocumentCheckIcon },
      { name: 'Self-Appraisal', href: '/self-appraisal', icon: DocumentTextIcon },
      { name: 'Feedback', href: '/feedback', icon: ChatBubbleLeftRightIcon },
      { name: 'Recognition', href: '/recognition', icon: StarIcon },
      { name: 'Chat', href: '/chat', icon: ChatBubbleOvalLeftEllipsisIcon },
      { name: 'Org Chart', href: '/org-chart', icon: BuildingOffice2Icon },
      { name: 'Directory', href: '/directory', icon: UserGroupIcon },
      { name: 'Pulse', href: '/pulse', icon: FaceSmileIcon },
      { name: 'Calendar', href: '/calendar', icon: CalendarDaysIcon },
    ],
  },
  {
    label: 'Growth',
    collapsible: true,
    items: [
      { name: 'Skills', href: '/skills', icon: PuzzlePieceIcon },
      { name: 'Skill Gaps', href: '/skill-gaps', icon: ChartBarIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
      { name: 'Development', href: '/development', icon: AcademicCapIcon },
      { name: 'AI Dev Plans', href: '/ai-development', icon: SparklesIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Career Path', href: '/career', icon: ArrowTrendingUpIcon },
      { name: 'Evidence', href: '/evidence', icon: DocumentMagnifyingGlassIcon },
      { name: 'Leaderboard', href: '/leaderboard', icon: TrophyIcon },
      { name: 'Mentoring', href: '/mentoring', icon: AcademicCapIcon },
    ],
  },
  {
    label: 'Management',
    collapsible: true,
    items: [
      { name: 'Review Cycles', href: '/review-cycles', icon: ClipboardDocumentListIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'PIP', href: '/pip', icon: ExclamationTriangleIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Compensation', href: '/compensation', icon: CurrencyDollarIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Promotions', href: '/promotions', icon: ArrowTrendingUpIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Calibration', href: '/calibration', icon: ScaleIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Succession', href: '/succession', icon: UserPlusIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
      { name: 'Manager Hub', href: '/manager-dashboard', icon: RectangleGroupIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Team', href: '/team', icon: UsersIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Team Insights', href: '/team-insights', icon: ChartBarSquareIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Talent Intelligence', href: '/talent-intelligence', icon: LightBulbIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN'] },
      { name: 'Team Optimizer', href: '/team-optimizer', icon: UserGroupIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN'] },
      { name: 'Simulator', href: '/simulator', icon: BeakerIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
    ],
  },
  {
    label: 'Insights',
    collapsible: true,
    items: [
      { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Schedules', href: '/report-schedules', icon: ClockIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Real-time', href: '/realtime', icon: BoltIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'HR Analytics', href: '/hr-analytics', icon: AdjustmentsHorizontalIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
      { name: 'Org Health', href: '/health-dashboard', icon: HeartIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Engagement', href: '/engagement', icon: FireIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Wellbeing', href: '/wellbeing', icon: HeartIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Meetings', href: '/meeting-analytics', icon: CalendarDaysIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'AI Insights', href: '/ai-insights', icon: SparklesIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
      { name: 'Anomalies', href: '/anomalies', icon: ExclamationTriangleIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Benchmarks', href: '/benchmarks', icon: ChartBarSquareIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { name: 'Culture Diagnostics', href: '/culture-diagnostics', icon: HeartIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN'] },
      { name: 'Compliance', href: '/compliance', icon: CheckBadgeIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
      { name: 'Exports', href: '/exports', icon: ArrowDownTrayIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
    ],
  },
  {
    label: 'More',
    collapsible: true,
    items: [
      { name: 'Announcements', href: '/announcements', icon: MegaphoneIcon },
      { name: 'Help', href: '/help', icon: QuestionMarkCircleIcon },
    ],
  },
];

export const adminSection: NavSection = {
  label: 'Administration',
  collapsible: true,
  items: [
    { name: 'User Management', href: '/admin/users', icon: UserGroupIcon },
    { name: 'License & Seats', href: '/admin/licenses', icon: KeyIcon },
    { name: 'Excel Upload', href: '/admin/excel-upload', icon: ArrowUpTrayIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
    { name: 'Configuration', href: '/admin/config', icon: Cog6ToothIcon },
    { name: 'Audit Log', href: '/admin/audit', icon: DocumentMagnifyingGlassIcon },
    { name: 'Moderator', href: '/reviews/moderate', icon: ShieldCheckIcon },
    { name: 'AI Access', href: '/admin/ai-access', icon: SparklesIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'] },
    { name: 'Roles', href: '/admin/roles', icon: ShieldCheckIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN'] },
    { name: 'Delegations', href: '/admin/delegations', icon: ArrowsRightLeftIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN', 'MANAGER'] },
    { name: 'Access Policies', href: '/admin/policies', icon: DocumentTextIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN'] },
    { name: 'RBAC Dashboard', href: '/admin/rbac-dashboard', icon: ViewfinderCircleIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN'] },
    { name: 'Upgrade Plan', href: '/admin/upgrade', icon: ArrowTrendingUpIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN'] },
    { name: 'Integrations', href: '/admin/integrations', icon: LinkIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN'] },
  ],
};

/**
 * Get all navigation items as a flat list (for search/command palette).
 * Optionally filters by user roles.
 */
export function getAllNavItems(userRoles?: string[]): NavItem[] {
  const allSections = [...navigationSections, adminSection];
  const allItems = allSections.flatMap((section) => section.items);

  if (!userRoles) return allItems;

  return allItems.filter(
    (item) => !item.roles || item.roles.some((r) => userRoles.includes(r))
  );
}
