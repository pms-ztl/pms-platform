import clsx from 'clsx';
import type { Size, ColorScheme } from '../types';

export interface BadgeProps {
  size?: Size;
  colorScheme?: ColorScheme;
  variant?: 'solid' | 'subtle' | 'outline';
  rounded?: boolean;
  className?: string;
  children: React.ReactNode;
}

const sizeStyles: Record<Size, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-sm',
  xl: 'px-4 py-1.5 text-base',
};

const variantStyles: Record<string, Record<ColorScheme, string>> = {
  solid: {
    primary: 'bg-primary-600 text-white',
    secondary: 'bg-secondary-600 text-white',
    success: 'bg-success-600 text-white',
    warning: 'bg-warning-600 text-white',
    danger: 'bg-danger-600 text-white',
    gray: 'bg-gray-600 text-white',
  },
  subtle: {
    primary: 'bg-primary-100 text-primary-700',
    secondary: 'bg-secondary-100 text-secondary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
    gray: 'bg-gray-100 text-gray-700',
  },
  outline: {
    primary: 'border border-primary-600 text-primary-600',
    secondary: 'border border-secondary-600 text-secondary-600',
    success: 'border border-success-600 text-success-600',
    warning: 'border border-warning-600 text-warning-600',
    danger: 'border border-danger-600 text-danger-600',
    gray: 'border border-gray-400 text-gray-600',
  },
};

export function Badge({
  size = 'md',
  colorScheme = 'gray',
  variant = 'subtle',
  rounded = true,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium',
        rounded ? 'rounded-full' : 'rounded',
        sizeStyles[size],
        variantStyles[variant][colorScheme],
        className
      )}
    >
      {children}
    </span>
  );
}

Badge.displayName = 'Badge';
