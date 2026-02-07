import clsx from 'clsx';
import type { BaseProps } from '../types';

export interface DataListProps extends BaseProps {
  orientation?: 'horizontal' | 'vertical';
}

interface DataListItemProps extends BaseProps {
  label: string;
  value: React.ReactNode;
}

export function DataList({
  orientation = 'vertical',
  className,
  children,
}: DataListProps) {
  return (
    <dl
      className={clsx(
        orientation === 'horizontal'
          ? 'grid grid-cols-2 gap-4'
          : 'space-y-4 divide-y divide-gray-100',
        className
      )}
    >
      {children}
    </dl>
  );
}

export function DataListItem({ label, value, className }: DataListItemProps) {
  return (
    <div className={clsx('py-2 first:pt-0', className)}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

DataList.Item = DataListItem;

DataList.displayName = 'DataList';
DataListItem.displayName = 'DataListItem';
