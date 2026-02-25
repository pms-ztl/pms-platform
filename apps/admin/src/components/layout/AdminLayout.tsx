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
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  BellIcon,
  SparklesIcon,
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
  { name: 'Security', href: '/security', icon: ShieldCheckIcon },
];

// ── Animated mesh background orbs ────────────────────────────────────────
function MeshBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-[#0a0e1a]" />

      {/* Floating mesh orbs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.15]"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)',
          animation: 'meshFloat1 20s ease-in-out infinite',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute top-[40%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-[0.12]"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)',
          animation: 'meshFloat2 25s ease-in-out infinite',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-[-10%] left-[30%] w-[700px] h-[700px] rounded-full opacity-[0.1]"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.35) 0%, transparent 70%)',
          animation: 'meshFloat3 22s ease-in-out infinite',
          filter: 'blur(100px)',
        }}
      />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Top-right radial fade */}
      <div className="absolute top-0 right-0 w-[50%] h-[40%] opacity-[0.06]"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.3), transparent 70%)' }}
      />
    </div>
  );
}

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
                ? 'bg-white/[0.12] text-white shadow-lg shadow-black/20 border border-white/[0.1]'
                : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80 border border-transparent'
            )}
          >
            {/* Active glow indicator */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white/60" />
            )}
            <item.icon
              className={clsx(
                'h-5 w-5 shrink-0 transition-colors',
                isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'
              )}
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  const UserCard = () => (
    <div className="flex-shrink-0 border-t border-white/[0.06] p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/[0.1] border border-white/[0.1] flex items-center justify-center text-white font-semibold text-sm">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white/90 truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-white/40 truncate">{user?.role?.replace('_', ' ')}</p>
        </div>
        <LiveIndicator />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative">
      <MeshBackground />
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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

                <div className="flex grow flex-col rounded-r-2xl border-r border-white/[0.06]"
                  style={{
                    background: 'rgba(10, 14, 26, 0.9)',
                    backdropFilter: 'blur(40px) saturate(1.3)',
                    WebkitBackdropFilter: 'blur(40px) saturate(1.3)',
                  }}
                >
                  <div className="flex h-14 items-center px-4 border-b border-white/[0.06]">
                    <SparklesIcon className="h-5 w-5 text-white/70 mr-2" />
                    <span className="text-lg font-bold text-white">PMS</span>
                    <span className="ml-2 text-xs font-semibold text-white/40 uppercase tracking-wider">Suite</span>
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
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-30">
        <div className="flex min-h-0 flex-1 flex-col border-r border-white/[0.06]"
          style={{
            background: 'rgba(10, 14, 26, 0.85)',
            backdropFilter: 'blur(40px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.3)',
          }}
        >
          <div className="flex h-14 items-center px-4 border-b border-white/[0.06]">
            <SparklesIcon className="h-5 w-5 text-white/70 mr-2" />
            <span className="text-lg font-bold text-white">PMS</span>
            <span className="ml-2 text-xs font-semibold text-white/40 uppercase tracking-wider">Suite</span>
          </div>
          <SidebarNav />
          <UserCard />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 relative z-10">
        {/* Top bar — glass */}
        <div className="sticky top-0 z-40 flex h-14 items-center gap-x-4 border-b border-white/[0.06] px-4 sm:px-6 lg:px-8"
          style={{
            background: 'rgba(10, 14, 26, 0.7)',
            backdropFilter: 'blur(30px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(30px) saturate(1.2)',
          }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden -m-2.5 p-2.5 text-white/60 hover:text-white"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="h-6 w-px bg-white/[0.08] lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 items-center justify-end gap-x-4">
            <button className="relative p-2 text-white/40 hover:text-white/70 rounded-lg hover:bg-white/[0.06] transition-colors">
              <BellIcon className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-[#0a0e1a]" />
            </button>

            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-x-2 rounded-lg px-2 py-1.5 text-sm text-white/70 hover:bg-white/[0.06] transition-colors">
                <div className="h-8 w-8 rounded-lg bg-white/[0.1] border border-white/[0.1] flex items-center justify-center text-white font-semibold text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <span className="hidden sm:block font-medium text-white/80">{user?.firstName} {user?.lastName}</span>
                <ChevronDownIcon className="h-4 w-4 text-white/40" />
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
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl border border-white/[0.1] py-1 focus:outline-none"
                  style={{
                    background: 'rgba(15, 20, 35, 0.95)',
                    backdropFilter: 'blur(30px)',
                    boxShadow: '0 20px 40px -8px rgba(0,0,0,0.6)',
                  }}
                >
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={clsx(
                          'flex w-full items-center px-4 py-2.5 text-sm transition-colors',
                          active ? 'bg-white/[0.06] text-white' : 'text-white/60'
                        )}
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-white/40" />
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
