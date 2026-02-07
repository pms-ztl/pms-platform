import { ReactNode } from 'react';
import {
  SparklesIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, StarIcon } from '@heroicons/react/24/solid';

interface AuthLayoutProps {
  children: ReactNode;
}

const FloatingIcon = ({
  Icon,
  className,
  delay = 0,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  className: string;
  delay?: number;
}) => (
  <div
    className={`absolute opacity-20 animate-bounce ${className}`}
    style={{ animationDuration: '4s', animationDelay: `${delay}s` }}
  >
    <Icon className="w-12 h-12 text-white" />
  </div>
);

export function AuthLayout({ children }: AuthLayoutProps) {
  const features = [
    {
      icon: ChartBarIcon,
      title: 'Goal Tracking',
      desc: 'Set and track OKRs with real-time progress',
    },
    {
      icon: UserGroupIcon,
      title: '360° Feedback',
      desc: 'Comprehensive multi-directional reviews',
    },
    {
      icon: ShieldCheckIcon,
      title: 'AI Bias Detection',
      desc: 'Fair and unbiased performance reviews',
    },
    {
      icon: LightBulbIcon,
      title: 'Smart Insights',
      desc: 'Data-driven performance recommendations',
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Enhanced Branding */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 lg:py-12 bg-gradient-to-br from-primary-600 via-primary-500 to-cyan-500 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient Orbs */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '2s' }}
          />

          {/* Floating particles */}
          <div
            className="absolute top-20 left-[20%] w-2 h-2 bg-white/40 rounded-full animate-bounce"
            style={{ animationDuration: '3s' }}
          />
          <div
            className="absolute top-40 left-[40%] w-3 h-3 bg-cyan-200/40 rounded-full animate-bounce"
            style={{ animationDuration: '4s', animationDelay: '0.5s' }}
          />
          <div
            className="absolute bottom-40 left-[30%] w-2 h-2 bg-white/30 rounded-full animate-bounce"
            style={{ animationDuration: '3.5s', animationDelay: '1s' }}
          />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Floating Icons */}
        <FloatingIcon Icon={RocketLaunchIcon} className="top-16 right-16" delay={0} />
        <FloatingIcon Icon={SparklesIcon} className="bottom-32 right-32" delay={0.5} />
        <FloatingIcon Icon={StarIcon} className="top-1/3 right-24" delay={1} />

        {/* Main Content */}
        <div className="mx-auto max-w-lg relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">PMS Platform</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Transform Your{' '}
            <span className="relative">
              <span className="relative z-10">Performance</span>
              <span className="absolute bottom-2 left-0 w-full h-3 bg-cyan-300/30 rounded" />
            </span>{' '}
            Management
          </h1>
          <p className="text-primary-100 text-lg mb-10 leading-relaxed">
            Empower your organization with fair, transparent, and data-driven
            performance reviews that everyone trusts.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              >
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-primary-100 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex items-center gap-6">
            <div className="flex items-center gap-2 text-white/80">
              <CheckCircleIcon className="w-5 h-5 text-emerald-300" />
              <span className="text-sm">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <CheckCircleIcon className="w-5 h-5 text-emerald-300" />
              <span className="text-sm">GDPR Ready</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <CheckCircleIcon className="w-5 h-5 text-emerald-300" />
              <span className="text-sm">99.9% Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24 bg-white dark:bg-secondary-950 relative">
        {/* Subtle background pattern for dark mode */}
        <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-secondary-950 dark:to-secondary-900 opacity-50" />

        <div className="mx-auto w-full max-w-sm lg:w-96 relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-secondary-900 dark:text-white">PMS Platform</span>
            </div>
          </div>
          {children}

          {/* Demo credentials hint */}
          <div className="mt-8 p-4 bg-secondary-50 dark:bg-secondary-800/50 rounded-xl border border-secondary-200 dark:border-secondary-700">
            <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Demo Credentials</p>
            <div className="space-y-1 text-xs text-secondary-500 dark:text-secondary-400">
              <p>
                <span className="font-medium">Admin:</span> admin@demo.pms-platform.local / demo123
              </p>
              <p>
                <span className="font-medium">Manager:</span> manager@demo.pms-platform.local / demo123
              </p>
              <p>
                <span className="font-medium">Employee:</span> employee@demo.pms-platform.local / demo123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
