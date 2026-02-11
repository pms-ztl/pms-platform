import { useState, Fragment } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { useAuthStore } from '../../stores/authStore';
import { LiveIndicator, ConnectionStatus } from '../ui/ConnectionStatus';
import clsx from 'clsx';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CogIcon,
  DocumentTextIcon,
  CreditCardIcon,
  PuzzlePieceIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Tenants', href: '/tenants', icon: BuildingOfficeIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'System Config', href: '/system', icon: CogIcon },
  { name: 'Audit Logs', href: '/audit', icon: DocumentTextIcon },
  { name: 'Billing', href: '/billing', icon: CreditCardIcon },
  { name: 'Integrations', href: '/integrations', icon: PuzzlePieceIcon },
  { name: 'Security', href: '/security', icon: ShieldCheckIcon },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={onNavigate}
            className={clsx(
              'group relative flex items-center gap-x-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
              isActive
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
            )}
          >
            <item.icon
              className={clsx(
                'h-5 w-5 shrink-0 transition-colors',
                isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
              )}
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  const UserCard = () => (
    <div className="flex-shrink-0 border-t border-gray-800/50 p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-gray-500 truncate">{user?.role?.replace('_', ' ')}</p>
        </div>
        <LiveIndicator />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
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
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" />
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
              <Dialog.Panel className="relative mr-16 flex w-full max-w-[272px] flex-1">
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
                      <XMarkIcon className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </Transition.Child>

                <div className="flex grow flex-col bg-gray-900 rounded-r-2xl">
                  <div className="flex h-14 items-center px-4 border-b border-gray-800/50">
                    <span className="text-lg font-bold text-white">PMS</span>
                    <span className="ml-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</span>
                  </div>
                  <SidebarNav onNavigate={() => setSidebarOpen(false)} />
                  <UserCard />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-gray-900">
          <div className="flex h-14 items-center px-4 border-b border-gray-800/50">
            <span className="text-lg font-bold text-white">PMS</span>
            <span className="ml-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</span>
          </div>
          <SidebarNav />
          <UserCard />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-14 items-center gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden -m-2.5 p-2.5 text-gray-700"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 items-center justify-end gap-x-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <BellIcon className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-x-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <span className="hidden sm:block font-medium">{user?.firstName} {user?.lastName}</span>
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
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
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-gray-200 py-1 focus:outline-none">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={clsx(
                          'flex w-full items-center px-4 py-2.5 text-sm',
                          active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                        )}
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
