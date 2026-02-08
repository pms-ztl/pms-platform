import { Fragment, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Dialog, Transition, Menu } from '@headlessui/react';
import {
  HomeIcon,
  FlagIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  UserGroupIcon,
  ChartBarIcon,
  ScaleIcon,
  BoltIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';

const navigation: Array<{ name: string; href: string; icon: React.ForwardRefExoticComponent<any>; roles?: string[] }> = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Goals', href: '/goals', icon: FlagIcon },
  { name: '1-on-1s', href: '/one-on-ones', icon: CalendarDaysIcon },
  { name: 'Reviews', href: '/reviews', icon: ClipboardDocumentCheckIcon },
  { name: 'Self-Appraisal', href: '/self-appraisal', icon: DocumentTextIcon },
  { name: 'Feedback', href: '/feedback', icon: ChatBubbleLeftRightIcon },
  { name: 'Recognition', href: '/recognition', icon: StarIcon },
  { name: 'Development', href: '/development', icon: AcademicCapIcon },
  { name: 'PIP', href: '/pip', icon: ExclamationTriangleIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  { name: 'Calibration', href: '/calibration', icon: ScaleIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  { name: 'Real-time', href: '/realtime', icon: BoltIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
  { name: 'Team', href: '/team', icon: UsersIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'] },
];

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: UserGroupIcon },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout, refreshToken } = useAuthStore();

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
            <div className="fixed inset-0 bg-secondary-900/80" />
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
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
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
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>

                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-secondary-900 px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <span className="text-2xl font-bold text-primary-600">PMS</span>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation
                            .filter((item) => !item.roles || item.roles.some((r) => user?.roles?.includes(r)))
                            .map((item) => (
                            <li key={item.name}>
                              <Link
                                to={item.href}
                                className={clsx(
                                  location.pathname === item.href
                                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                                    : 'text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-800 dark:hover:text-primary-400',
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium'
                                )}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <item.icon
                                  className={clsx(
                                    location.pathname === item.href
                                      ? 'text-primary-600 dark:text-primary-400'
                                      : 'text-secondary-400 group-hover:text-primary-600 dark:text-secondary-500 dark:group-hover:text-primary-400',
                                    'h-6 w-6 shrink-0'
                                  )}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-secondary-200/60 dark:border-secondary-800/60 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-xl px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <span className="text-2xl font-display font-bold bg-gradient-to-r from-primary-600 to-cyan-500 bg-clip-text text-transparent">PMS</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation
                    .filter((item) => !item.roles || item.roles.some((r) => user?.roles?.includes(r)))
                    .map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={clsx(
                          location.pathname === item.href
                            ? 'bg-gradient-to-r from-primary-50 to-cyan-50/50 text-primary-600 dark:from-primary-900/40 dark:to-cyan-900/20 dark:text-primary-400 shadow-sm'
                            : 'text-secondary-600 hover:text-primary-600 hover:bg-secondary-50/80 dark:text-secondary-300 dark:hover:bg-secondary-800/80 dark:hover:text-primary-400',
                          'group flex gap-x-3 rounded-xl p-2.5 text-sm leading-6 font-medium transition-all duration-200'
                        )}
                      >
                        <item.icon
                          className={clsx(
                            location.pathname === item.href
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-secondary-400 group-hover:text-primary-600 dark:text-secondary-500 dark:group-hover:text-primary-400',
                            'h-5 w-5 shrink-0 transition-colors duration-200'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              {/* Admin navigation - only visible for HR Admin / Admin */}
              {(user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('HR_ADMIN') || user?.roles?.includes('ADMIN')) && (
                <li>
                  <div className="text-xs font-semibold leading-6 text-secondary-400 dark:text-secondary-500 uppercase tracking-wider mb-2">
                    Administration
                  </div>
                  <ul role="list" className="-mx-2 space-y-1">
                    {adminNavigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={clsx(
                            location.pathname === item.href
                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                              : 'text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-800 dark:hover:text-primary-400',
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium'
                          )}
                        >
                          <item.icon
                            className={clsx(
                              location.pathname === item.href
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-secondary-400 group-hover:text-primary-600 dark:text-secondary-500 dark:group-hover:text-primary-400',
                              'h-6 w-6 shrink-0'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
              <li className="mt-auto">
                <Link
                  to="/settings"
                  className={clsx(
                    location.pathname === '/settings'
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-800 dark:hover:text-primary-400',
                    'group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6'
                  )}
                >
                  <Cog6ToothIcon
                    className={clsx(
                      location.pathname === '/settings'
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-secondary-400 group-hover:text-primary-600 dark:text-secondary-500 dark:group-hover:text-primary-400',
                      'h-6 w-6 shrink-0'
                    )}
                    aria-hidden="true"
                  />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-secondary-200/60 dark:border-secondary-800/60 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-xl px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-secondary-700 dark:text-secondary-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-secondary-200 dark:bg-secondary-700 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Profile dropdown */}
              <Menu as="div" className="relative">
                <Menu.Button className="-m-1.5 flex items-center p-1.5">
                  <span className="sr-only">Open user menu</span>
                  {user?.avatarUrl ? (
                    <img
                      className="h-8 w-8 rounded-full bg-secondary-50 dark:bg-secondary-800"
                      src={user.avatarUrl}
                      alt=""
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                        {user?.firstName?.[0]}
                        {user?.lastName?.[0]}
                      </span>
                    </div>
                  )}
                  <span className="hidden lg:flex lg:items-center">
                    <span
                      className="ml-4 text-sm font-medium leading-6 text-secondary-900 dark:text-white"
                      aria-hidden="true"
                    >
                      {user?.firstName} {user?.lastName}
                    </span>
                    <ChevronDownIcon
                      className="ml-2 h-5 w-5 text-secondary-400"
                      aria-hidden="true"
                    />
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
                  <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white dark:bg-secondary-800 py-2 shadow-lg ring-1 ring-secondary-900/5 dark:ring-secondary-700 focus:outline-none">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/profile"
                          className={clsx(
                            active ? 'bg-secondary-50 dark:bg-secondary-700' : '',
                            'flex items-center px-3 py-2 text-sm text-secondary-900 dark:text-secondary-100'
                          )}
                        >
                          <UserCircleIcon className="mr-3 h-5 w-5 text-secondary-400" />
                          Your Profile
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={clsx(
                            active ? 'bg-secondary-50 dark:bg-secondary-700' : '',
                            'flex w-full items-center px-3 py-2 text-sm text-secondary-900 dark:text-secondary-100'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-secondary-400" />
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
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8 page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
