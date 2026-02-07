import clsx from 'clsx';
import type { BaseProps } from '../types';

interface ContainerProps extends BaseProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  centered?: boolean;
  padding?: boolean;
}

const maxWidthStyles = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

export function Container({
  maxWidth = 'xl',
  centered = true,
  padding = true,
  className,
  children,
}: ContainerProps) {
  return (
    <div
      className={clsx(
        'w-full',
        maxWidthStyles[maxWidth],
        centered && 'mx-auto',
        padding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  );
}

Container.displayName = 'Container';
