import clsx from 'clsx';
import type { BaseProps } from '../types';

interface CardProps extends BaseProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  hoverable?: boolean;
}

interface CardHeaderProps extends BaseProps {
  action?: React.ReactNode;
}

interface CardContentProps extends BaseProps {}

interface CardFooterProps extends BaseProps {
  justify?: 'start' | 'end' | 'center' | 'between';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  variant = 'elevated',
  padding = 'none',
  onClick,
  hoverable = false,
  className,
  children,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={clsx(
        'rounded-xl overflow-hidden',
        variant === 'elevated' && 'bg-white shadow-sm border border-gray-200',
        variant === 'outlined' && 'bg-white border border-gray-200',
        variant === 'filled' && 'bg-gray-50',
        paddingStyles[padding],
        (hoverable || onClick) && 'transition-shadow hover:shadow-md cursor-pointer',
        onClick && 'text-left w-full',
        className
      )}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ action, className, children }: CardHeaderProps) {
  return (
    <div
      className={clsx(
        'px-6 py-4 border-b border-gray-200 flex items-center justify-between',
        className
      )}
    >
      <div className="font-semibold text-gray-900">{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardContent({ className, children }: CardContentProps) {
  return <div className={clsx('p-6', className)}>{children}</div>;
}

export function CardFooter({ justify = 'end', className, children }: CardFooterProps) {
  return (
    <div
      className={clsx(
        'px-6 py-4 border-t border-gray-200 flex items-center gap-3',
        justify === 'start' && 'justify-start',
        justify === 'end' && 'justify-end',
        justify === 'center' && 'justify-center',
        justify === 'between' && 'justify-between',
        className
      )}
    >
      {children}
    </div>
  );
}

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';
