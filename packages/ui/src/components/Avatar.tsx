import clsx from 'clsx';
import type { Size, ColorScheme, BaseProps } from '../types';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: Size;
  colorScheme?: ColorScheme;
  rounded?: 'full' | 'lg' | 'md';
  className?: string;
}

interface AvatarGroupProps extends BaseProps {
  max?: number;
  size?: Size;
}

const sizeStyles: Record<Size, { container: string; text: string }> = {
  xs: { container: 'h-6 w-6', text: 'text-xs' },
  sm: { container: 'h-8 w-8', text: 'text-sm' },
  md: { container: 'h-10 w-10', text: 'text-sm' },
  lg: { container: 'h-12 w-12', text: 'text-base' },
  xl: { container: 'h-16 w-16', text: 'text-lg' },
};

const colorStyles: Record<ColorScheme, string> = {
  primary: 'bg-primary-100 text-primary-700',
  secondary: 'bg-secondary-100 text-secondary-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  gray: 'bg-gray-100 text-gray-700',
};

const roundedStyles: Record<string, string> = {
  full: 'rounded-full',
  lg: 'rounded-lg',
  md: 'rounded-md',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  colorScheme = 'primary',
  rounded = 'full',
  className,
}: AvatarProps) {
  const initials = name ? getInitials(name) : '?';

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={clsx(
          'object-cover',
          sizeStyles[size].container,
          roundedStyles[rounded],
          className
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center justify-center font-medium',
        sizeStyles[size].container,
        sizeStyles[size].text,
        roundedStyles[rounded],
        colorStyles[colorScheme],
        className
      )}
      role="img"
      aria-label={name || 'Avatar'}
    >
      {initials}
    </div>
  );
}

export function AvatarGroup({ max = 4, size = 'md', className, children }: AvatarGroupProps) {
  const childArray = Array.isArray(children) ? children : [children];
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <div className={clsx('flex -space-x-2', className)}>
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className="relative ring-2 ring-white rounded-full"
        >
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={clsx(
            'relative flex items-center justify-center font-medium bg-gray-100 text-gray-600 rounded-full ring-2 ring-white',
            sizeStyles[size].container,
            sizeStyles[size].text
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

Avatar.displayName = 'Avatar';
AvatarGroup.displayName = 'AvatarGroup';
