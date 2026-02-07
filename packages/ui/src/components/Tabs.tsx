import { createContext, useContext, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import type { BaseProps, Size, ColorScheme } from '../types';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  size: Size;
  colorScheme: ColorScheme;
  variant: 'line' | 'enclosed' | 'pills';
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends BaseProps {
  defaultTab?: string;
  value?: string;
  onChange?: (tab: string) => void;
  size?: Size;
  colorScheme?: ColorScheme;
  variant?: 'line' | 'enclosed' | 'pills';
}

interface TabListProps extends BaseProps {}
interface TabProps extends BaseProps {
  value: string;
  disabled?: boolean;
  icon?: ReactNode;
}
interface TabPanelProps extends BaseProps {
  value: string;
}

export function Tabs({
  defaultTab,
  value,
  onChange,
  size = 'md',
  colorScheme = 'primary',
  variant = 'line',
  className,
  children,
}: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab || '');
  const activeTab = value !== undefined ? value : internalTab;

  const setActiveTab = (tab: string) => {
    if (value === undefined) {
      setInternalTab(tab);
    }
    onChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, size, colorScheme, variant }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ className, children }: TabListProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabList must be used within Tabs');

  return (
    <div
      role="tablist"
      className={clsx(
        'flex',
        context.variant === 'line' && 'border-b border-gray-200 space-x-8',
        context.variant === 'enclosed' && 'border-b border-gray-200',
        context.variant === 'pills' && 'space-x-2',
        className
      )}
    >
      {children}
    </div>
  );
}

const sizeStyles: Record<Size, string> = {
  xs: 'py-1 px-2 text-xs',
  sm: 'py-1.5 px-3 text-sm',
  md: 'py-2 px-4 text-sm',
  lg: 'py-2.5 px-5 text-base',
  xl: 'py-3 px-6 text-lg',
};

export function Tab({ value, disabled = false, icon, className, children }: TabProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  const isActive = context.activeTab === value;

  const baseStyles = clsx(
    'font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizeStyles[context.size],
    disabled && 'opacity-50 cursor-not-allowed'
  );

  const variantStyles = {
    line: clsx(
      '-mb-px border-b-2',
      isActive
        ? `border-${context.colorScheme}-600 text-${context.colorScheme}-600`
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    ),
    enclosed: clsx(
      'border rounded-t-lg -mb-px',
      isActive
        ? 'bg-white border-gray-200 border-b-white'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    ),
    pills: clsx(
      'rounded-lg',
      isActive
        ? `bg-${context.colorScheme}-100 text-${context.colorScheme}-700`
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    ),
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && context.setActiveTab(value)}
      className={clsx(
        baseStyles,
        variantStyles[context.variant],
        'flex items-center',
        className
      )}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}

export function TabPanel({ value, className, children }: TabPanelProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  if (context.activeTab !== value) return null;

  return (
    <div role="tabpanel" className={clsx('pt-4', className)}>
      {children}
    </div>
  );
}

Tabs.displayName = 'Tabs';
TabList.displayName = 'TabList';
Tab.displayName = 'Tab';
TabPanel.displayName = 'TabPanel';
