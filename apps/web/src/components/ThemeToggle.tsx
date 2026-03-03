import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  SunIcon,
  ComputerDesktopIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useThemeStore, type Theme } from '@/store/theme';

// ── Custom "Deep Dark / OLED" icon — clean filled crescent moon ───────────

function DeepDarkIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 0 0 12 21a9.003 9.003 0 0 0 8.354-5.646Z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 0 0 12 21a9.003 9.003 0 0 0 8.354-5.646Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Theme config ───────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const THEMES: { key: Theme; label: string; icon: IconComponent; description: string }[] = [
  { key: 'light',     label: 'Light',     icon: SunIcon,             description: 'Bright & clean'   },
  { key: 'deep-dark', label: 'Dark',      icon: DeepDarkIcon,        description: 'Pure black OLED'  },
  { key: 'system',    label: 'System',    icon: ComputerDesktopIcon, description: 'Match OS setting' },
];

function getCurrentIcon(theme: Theme): IconComponent {
  switch (theme) {
    case 'light':     return SunIcon;
    case 'deep-dark': return DeepDarkIcon;
    case 'system':    return ComputerDesktopIcon;
    default:          return DeepDarkIcon;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const CurrentIcon = getCurrentIcon(theme);

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:text-secondary-200 dark:hover:bg-white/[0.04] transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900"
        title="Change theme"
      >
        <span className="sr-only">Change theme</span>
        <CurrentIcon className={clsx(
          'h-5 w-5',
          theme === 'deep-dark' && 'text-primary-400'
        )} />
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
        <Menu.Items className="absolute right-0 z-10 mt-2.5 w-52 origin-top-right rounded-xl bg-white/90 dark:bg-surface-card/90 backdrop-blur-2xl py-1.5 shadow-xl ring-1 ring-secondary-900/5 dark:ring-white/[0.08] focus:outline-none">
          <div className="px-3 py-2 border-b border-secondary-100 dark:border-white/[0.06]">
            <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
              Theme
            </p>
          </div>
          {THEMES.map((t) => (
            <Menu.Item key={t.key}>
              {({ active }) => (
                <button
                  onClick={() => setTheme(t.key)}
                  className={clsx(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                    active ? 'bg-secondary-50 dark:bg-white/[0.04]' : '',
                    theme === t.key
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-secondary-700 dark:text-secondary-300'
                  )}
                >
                  <t.icon className={clsx(
                    'h-[18px] w-[18px] shrink-0',
                    t.key === 'deep-dark' && theme === t.key ? 'text-primary-400' : ''
                  )} />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-secondary-400 dark:text-secondary-500">{t.description}</p>
                  </div>
                  {theme === t.key && (
                    <CheckIcon className="h-4 w-4 text-primary-500 dark:text-primary-400 shrink-0" />
                  )}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
