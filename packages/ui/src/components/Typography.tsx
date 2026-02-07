import clsx from 'clsx';
import type { Size, ColorScheme, BaseProps } from '../types';

export interface TextProps extends BaseProps {
  size?: Size;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: ColorScheme | 'muted';
  truncate?: boolean;
  as?: 'p' | 'span' | 'div' | 'label';
}

export interface HeadingProps extends BaseProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: ColorScheme | 'muted';
  truncate?: boolean;
}

const textSizeStyles: Record<Size, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const headingSizeStyles: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

const weightStyles: Record<string, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const colorStyles: Record<string, string> = {
  primary: 'text-primary-600',
  secondary: 'text-secondary-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  danger: 'text-danger-600',
  gray: 'text-gray-600',
  muted: 'text-gray-500',
};

export function Text({
  size = 'md',
  weight = 'normal',
  color,
  truncate = false,
  as: Component = 'p',
  className,
  children,
}: TextProps) {
  return (
    <Component
      className={clsx(
        textSizeStyles[size],
        weightStyles[weight],
        color ? colorStyles[color] : 'text-gray-900',
        truncate && 'truncate',
        className
      )}
    >
      {children}
    </Component>
  );
}

export function Heading({
  level = 2,
  size,
  weight = 'semibold',
  color,
  truncate = false,
  className,
  children,
}: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  const defaultSize = {
    1: '3xl',
    2: '2xl',
    3: 'xl',
    4: 'lg',
    5: 'md',
    6: 'sm',
  }[level] as string;

  return (
    <Tag
      className={clsx(
        headingSizeStyles[size || defaultSize],
        weightStyles[weight],
        color ? colorStyles[color] : 'text-gray-900',
        truncate && 'truncate',
        className
      )}
    >
      {children}
    </Tag>
  );
}

Text.displayName = 'Text';
Heading.displayName = 'Heading';
