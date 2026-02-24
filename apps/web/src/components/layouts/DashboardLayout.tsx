import { Fragment, useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, Transition, Menu } from '@headlessui/react';
import {
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { useAuthStore } from '@/store/auth';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import { authApi, getAvatarUrl } from '@/lib/api';
import { NotificationBell } from '@/components/NotificationBell';
import { AIChatWidget } from '@/components/ai/AIChatWidget';
import { LiveIndicator } from '@/components/ui/ConnectionStatus';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommandPalette } from '@/components/CommandPalette';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { TopLoadingBar } from '@/components/ui/TopLoadingBar';
import { useRouteChangeLoader } from '@/hooks/useRouteChangeLoader';
import { navigationSections, adminSection, type NavItem, type NavSection } from '@/config/navigation';
import { AIWorkspaceTransition } from '@/components/ai-workspace/AIWorkspaceTransition';

// Navigation config imported from @/config/navigation

// ── NavLink ───────────────────────────────────────────────────────────────

function NavLink({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      title={collapsed ? item.name : undefined}
      className={clsx(
        'group relative flex items-center rounded-lg text-xs font-medium transition-all duration-200',
        collapsed ? 'justify-center p-2.5' : 'gap-x-2.5 px-2.5 py-1.5',
        isActive
          ? 'bg-primary-500/10 text-primary-300 shadow-[inset_0_1px_0_rgba(139,92,246,0.1)] sidebar-glow-active'
          : 'text-secondary-400 hover:bg-white/[0.04] hover:text-secondary-200'
      )}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
      )}
      {isActive && collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-full bg-primary-500" />
      )}
      <item.icon
        className={clsx(
          'shrink-0 transition-all duration-200',
          collapsed ? 'h-5 w-5' : 'h-4 w-4',
          isActive
            ? 'text-primary-400 drop-shadow-[0_0_4px_rgba(139,92,246,0.4)]'
            : 'text-secondary-500 group-hover:text-secondary-300'
        )}
        aria-hidden="true"
      />
      {!collapsed && item.name}
    </Link>
  );
}

// ── Collapsible Section ───────────────────────────────────────────────────

function NavSectionGroup({
  section,
  userRoles,
  pathname,
  collapsed,
  onNavigate,
}: {
  section: NavSection;
  userRoles: string[];
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const filtered = section.items.filter(
    (item) => !item.roles || item.roles.some((r) => userRoles.includes(r))
  );

  if (filtered.length === 0) return null;

  const hasActiveChild = filtered.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
  const [isOpen, setIsOpen] = useState(!section.collapsible || hasActiveChild);

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        <div className="mx-auto my-2 h-px w-6 bg-white/[0.06]" />
        {filtered.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname === item.href || pathname.startsWith(item.href + '/')} collapsed onClick={onNavigate} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={section.collapsible ? () => setIsOpen(!isOpen) : undefined}
        className={clsx(
          'flex w-full items-center px-3 pt-5 pb-1.5',
          section.collapsible && 'cursor-pointer group'
        )}
      >
        <span className="text-2xs font-bold tracking-[0.1em] text-secondary-600 dark:text-primary-400/40 flex-1 text-left">
          {section.label}
        </span>
        {section.collapsible && (
          <ChevronRightIcon
            className={clsx(
              'h-3 w-3 text-secondary-600 transition-transform duration-200',
              isOpen && 'rotate-90'
            )}
          />
        )}
      </button>
      <div
        className={clsx(
          'space-y-0.5 overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {filtered.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname === item.href || pathname.startsWith(item.href + '/')} onClick={onNavigate} />
        ))}
      </div>
    </div>
  );
}

// ── Sidebar Content ────────────────────────────────────────────────────────

function SidebarContent({
  userRoles,
  isAdmin,
  pathname,
  collapsed,
  onNavigate,
  onToggleCollapse,
  onAIWorkspaceClick,
  isAiMode,
}: {
  userRoles: string[];
  isAdmin: boolean;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  onAIWorkspaceClick: () => void;
  isAiMode: boolean;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className={clsx('flex shrink-0 items-center h-14 border-b border-white/[0.06]', collapsed ? 'justify-center px-2' : 'px-4')}>
        <span className="text-xl font-display font-bold bg-gradient-to-r from-primary-400 via-accent-400 to-primary-300 bg-clip-text text-transparent">
          {collapsed ? 'P' : 'PMS'}
        </span>
        {!collapsed && (
          <span className="ml-2 text-2xs font-semibold tracking-widest text-secondary-500">
            Platform
          </span>
        )}
        {!collapsed && (
          <div className="ml-auto flex items-center gap-2">
            <LiveIndicator />
          </div>
        )}
      </div>

      {/* Neural Swarm AI entry button */}
      <div className="shrink-0 px-2 py-2 border-b border-white/[0.06]">
        <button
          onClick={onAIWorkspaceClick}
          title={collapsed ? (isAiMode ? 'Exit AI Workspace' : 'Neural Swarm AI') : undefined}
          className={clsx(
            'w-full flex items-center rounded-lg transition-all duration-300',
            collapsed ? 'justify-center p-2.5' : 'gap-x-2.5 px-3 py-2',
            isAiMode
              ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
              : 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20 hover:border-indigo-500/35 text-indigo-300 hover:text-indigo-200'
          )}
        >
          <CpuChipIcon className={clsx('shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-xs font-medium break-words">
                {isAiMode ? 'Exit AI Mode' : 'Neural Swarm AI'}
              </span>
              {isAiMode && (
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Scrollable nav */}
      <nav className={clsx('flex-1 min-h-0 overflow-y-auto pb-4 scrollbar-thin', collapsed ? 'px-1.5' : 'px-2')}>
        {navigationSections.map((section) => (
          <NavSectionGroup
            key={section.label}
            section={section}
            userRoles={userRoles}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}

        {isAdmin && (
          <>
            <div className={clsx('my-2 border-t border-white/[0.06]', collapsed ? 'mx-2' : 'mx-3')} />
            <NavSectionGroup
              section={adminSection}
              userRoles={userRoles}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </>
        )}
      </nav>

      {/* Bottom: Settings + Collapse toggle */}
      <div className="shrink-0 border-t border-white/[0.06] px-2 py-2 space-y-1">
        <NavLink
          item={{ name: 'Settings', href: '/settings', icon: Cog6ToothIcon }}
          isActive={pathname === '/settings'}
          collapsed={collapsed}
          onClick={onNavigate}
        />
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={clsx(
              'flex w-full items-center rounded-lg p-2 text-secondary-500 hover:bg-white/[0.04] hover:text-secondary-300 transition-colors',
              collapsed ? 'justify-center' : 'gap-2 px-3'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronRightIcon className={clsx('h-4 w-4 transition-transform duration-200', !collapsed && 'rotate-180')} />
            {!collapsed && <span className="text-xs font-medium">Collapse</span>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Layout ──────────────────────────────────────────────────────────

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, refreshToken } = useAuthStore();
  const { isAiMode, setAiMode, aiTransitionPhase, setAiTransitionPhase } = useAIWorkspaceStore();

  // ── Cinematic transition timing ─────────────────────────────────────────
  // When a transition is triggered (from any source), flip `isAiMode` at the
  // halfway mark (1 500 ms) and clear the phase when the animation ends (3 000 ms).
  useEffect(() => {
    if (aiTransitionPhase === 'idle') return;

    const flipTimer = setTimeout(() => {
      if (aiTransitionPhase === 'entering') setAiMode(true);
      else if (aiTransitionPhase === 'exiting') setAiMode(false);
    }, 1_500);

    const doneTimer = setTimeout(() => {
      setAiTransitionPhase('idle');
    }, 3_000);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(doneTimer);
    };
  }, [aiTransitionPhase, setAiMode, setAiTransitionPhase]);

  const handleAIWorkspaceToggle = () => {
    if (aiTransitionPhase !== 'idle') return; // block double-trigger
    if (isAiMode && location.pathname === '/dashboard') {
      setAiTransitionPhase('exiting');
    } else {
      if (location.pathname !== '/dashboard') navigate('/dashboard');
      setAiTransitionPhase('entering');
    }
  };

  // Route change loading bar
  useRouteChangeLoader();

  const userRoles = user?.roles ?? [];
  const isAdmin = userRoles.some((r: string) => ['SUPER_ADMIN', 'HR_ADMIN', 'ADMIN'].includes(r));
  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-56';
  const contentPadding = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-56';

  const handleLogout = async () => {
    try {
      await authApi.logout(refreshToken ?? undefined);
    } catch {
      // Ignore logout errors
    }
    logout();
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* Top loading bar */}
      <TopLoadingBar />

      {/* Connection status toast */}
      <ConnectionStatus />

      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-[280px] flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>

                <div className="flex grow flex-col bg-white dark:bg-surface-dark" style={{ fontSize: 14 }}>
                  <SidebarContent
                    userRoles={userRoles}
                    isAdmin={isAdmin}
                    pathname={location.pathname}
                    onNavigate={() => setSidebarOpen(false)}
                    onAIWorkspaceClick={() => { handleAIWorkspaceToggle(); setSidebarOpen(false); }}
                    isAiMode={isAiMode}
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div
        className={clsx(
          'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300',
          sidebarWidth,
          aiTransitionPhase !== 'idle' && 'opacity-0 blur-sm pointer-events-none'
        )}
      >
        <div className="flex grow flex-col overflow-hidden bg-white dark:bg-surface-dark border-r border-secondary-200/60 dark:border-white/[0.06] frosted-noise" style={{ fontSize: 14 }}>
          <SidebarContent
            userRoles={userRoles}
            isAdmin={isAdmin}
            pathname={location.pathname}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onAIWorkspaceClick={handleAIWorkspaceToggle}
            isAiMode={isAiMode}
          />
        </div>
      </div>

      {/* Main content */}
      <div className={clsx('transition-all duration-300', contentPadding)}>
        {/* Top bar */}
        <div className={clsx(
          'sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-4 glass-nav px-4 sm:gap-x-6 sm:px-6 lg:px-8 transition-all duration-300',
          aiTransitionPhase !== 'idle' && 'opacity-0 blur-sm pointer-events-none'
        )}>
          <button
            type="button"
            className="-m-2.5 p-2.5 text-secondary-700 dark:text-secondary-400 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="h-6 w-px bg-secondary-200 dark:bg-white/[0.06] lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-5">
              {/* Neural Swarm AI quick-toggle */}
              <button
                onClick={handleAIWorkspaceToggle}
                title={isAiMode ? 'Exit AI Workspace' : 'Open Neural Swarm AI'}
                className={clsx(
                  'relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                  isAiMode
                    ? 'bg-gradient-to-br from-cyan-500/25 to-emerald-500/25 text-cyan-400 ring-1 ring-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                    : 'text-secondary-500 dark:text-secondary-400 hover:bg-white/[0.06] hover:text-secondary-200 dark:hover:text-white'
                )}
              >
                <CpuChipIcon className="h-5 w-5" />
                {isAiMode && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                  </span>
                )}
              </button>
              <ThemeToggle />
              <NotificationBell />

              <Menu as="div" className="relative">
                <Menu.Button className="-m-1.5 flex items-center p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <span className="sr-only">Open user menu</span>
                  {user?.avatarUrl ? (
                    <img className="h-8 w-8 rounded-full bg-secondary-50 dark:bg-secondary-800 object-cover" src={getAvatarUrl(user.avatarUrl, 'sm') || user.avatarUrl} alt="" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center ring-1 ring-primary-200 dark:ring-primary-500/30">
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    </div>
                  )}
                  <span className="hidden lg:flex lg:items-center">
                    <span className="ml-3 text-sm font-medium leading-6 text-secondary-900 dark:text-secondary-200" aria-hidden="true">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <ChevronDownIcon className="ml-2 h-4 w-4 text-secondary-400 dark:text-secondary-500" aria-hidden="true" />
                  </span>
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-xl bg-white/90 dark:bg-surface-card/90 backdrop-blur-2xl py-2 shadow-xl ring-1 ring-secondary-900/5 dark:ring-white/[0.08] focus:outline-none">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/profile"
                          className={clsx(active ? 'bg-secondary-50 dark:bg-white/[0.04]' : '', 'flex items-center px-3 py-2 text-sm text-secondary-900 dark:text-secondary-200')}
                        >
                          <UserCircleIcon className="mr-3 h-5 w-5 text-secondary-400 dark:text-secondary-500" />
                          Your Profile
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={clsx(active ? 'bg-secondary-50 dark:bg-white/[0.04]' : '', 'flex w-full items-center px-3 py-2 text-sm text-secondary-900 dark:text-secondary-200')}
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-secondary-400 dark:text-secondary-500" />
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className={clsx('py-8 pb-24 sm:pb-8 transition-all duration-300', aiTransitionPhase !== 'idle' && 'opacity-0 blur-md')}>
          <div className="px-4 sm:px-6 lg:px-8 page-content">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating UI elements */}
      <ScrollToTop />
      {!(isAiMode && location.pathname === '/dashboard') && <AIChatWidget />}

      {/* Global overlays */}
      <CommandPalette />
      <KeyboardShortcuts />

      {/* Cinematic AI workspace transition */}
      {aiTransitionPhase !== 'idle' && (
        <AIWorkspaceTransition phase={aiTransitionPhase} />
      )}
    </div>
  );
}
