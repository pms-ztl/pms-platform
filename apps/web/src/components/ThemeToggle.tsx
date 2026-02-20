import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useThemeStore, type Theme } from '@/store/theme';

const THEMES: { key: Theme; label: string; icon: typeof SunIcon; description: string }[] = [
  { key: 'light', label: 'Light', icon: SunIcon, description: 'Bright & clean' },
  { key: 'dark', label: 'Dark', icon: MoonIcon, description: 'Easy on the eyes' },
  { key: 'deep-dark', label: 'Deep Dark', icon: MoonIcon, description: 'Pure black OLED' },
  { key: 'system', label: 'System', icon: ComputerDesktopIcon, description: 'Match OS setting' },
];

function getCurrentIcon(theme: Theme) {
  switch (theme) {
    case 'light': return SunIcon;
    case 'dark': return MoonIcon;
    case 'deep-dark': return MoonIcon;
    case 'system': return ComputerDesktopIcon;
    default: return MoonIcon;
  }
}

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const CurrentIcon = getCurrentIcon(theme);

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className="flex items-center justify-center rounded-lg p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:text-secondary-200 dark:hover:bg-white/[0.04] transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900"
        title="Change theme"
      >
        <span className="sr-only">Change theme</span>
        <CurrentIcon className={clsx(
          'h-5 w-5',
          theme === 'deep-dark' && 'text-cyan-400'
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
            <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
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
                    t.key === 'deep-dark' && theme === t.key ? 'text-cyan-400' : ''
                  )} />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-[13px]">{t.label}</p>
                    <p className="text-[11px] text-secondary-400 dark:text-secondary-500">{t.description}</p>
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
