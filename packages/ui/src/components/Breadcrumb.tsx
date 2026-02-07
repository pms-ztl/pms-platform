import { Fragment, type ReactNode } from 'react';
import clsx from 'clsx';
import type { BaseProps, Size } from '../types';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

export interface BreadcrumbProps extends BaseProps {
  separator?: ReactNode;
  size?: Size;
}

interface BreadcrumbItemProps extends BaseProps {
  href?: string;
  isCurrentPage?: boolean;
  icon?: ReactNode;
}

const sizeStyles: Record<Size, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export function Breadcrumb({
  separator,
  size = 'md',
  className,
  children,
}: BreadcrumbProps) {
  const items = Array.isArray(children) ? children : [children];
  const defaultSeparator = (
    <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
  );

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={clsx('flex items-center space-x-2', sizeStyles[size])}>
        {items.map((child, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <li className="flex items-center">{separator || defaultSeparator}</li>
            )}
            {child}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

export function BreadcrumbItem({
  href,
  isCurrentPage = false,
  icon,
  className,
  children,
}: BreadcrumbItemProps) {
  const content = (
    <>
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </>
  );

  if (isCurrentPage || !href) {
    return (
      <li className="flex items-center">
        <span
          className={clsx(
            'flex items-center',
            isCurrentPage ? 'text-gray-700 font-medium' : 'text-gray-500',
            className
          )}
          aria-current={isCurrentPage ? 'page' : undefined}
        >
          {content}
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-center">
      <a
        href={href}
        className={clsx(
          'flex items-center text-gray-500 hover:text-gray-700 transition-colors',
          className
        )}
      >
        {content}
      </a>
    </li>
  );
}

Breadcrumb.Item = BreadcrumbItem;
Breadcrumb.HomeIcon = HomeIcon;

Breadcrumb.displayName = 'Breadcrumb';
BreadcrumbItem.displayName = 'BreadcrumbItem';
