import clsx from 'clsx';
import type { BaseProps } from '../types';

export interface TableProps extends BaseProps {
  striped?: boolean;
  hoverable?: boolean;
}

interface TableHeadProps extends BaseProps {}
interface TableBodyProps extends BaseProps {}
interface TableRowProps extends BaseProps {
  selected?: boolean;
  onClick?: () => void;
}
interface TableCellProps extends BaseProps {
  align?: 'left' | 'center' | 'right';
  isHeader?: boolean;
}

export function Table({
  striped = false,
  hoverable = true,
  className,
  children,
}: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className={clsx(
          'min-w-full divide-y divide-gray-200',
          striped && '[&_tbody_tr:nth-child(odd)]:bg-gray-50',
          hoverable && '[&_tbody_tr]:hover:bg-gray-50',
          className
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, children }: TableHeadProps) {
  return <thead className={clsx('bg-gray-50', className)}>{children}</thead>;
}

export function TableBody({ className, children }: TableBodyProps) {
  return (
    <tbody className={clsx('bg-white divide-y divide-gray-200', className)}>
      {children}
    </tbody>
  );
}

export function TableRow({ selected, onClick, className, children }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={clsx(
        selected && 'bg-primary-50',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  align = 'left',
  isHeader = false,
  className,
  children,
}: TableCellProps) {
  const Component = isHeader ? 'th' : 'td';

  return (
    <Component
      className={clsx(
        isHeader
          ? 'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'
          : 'px-6 py-4 text-sm text-gray-900 whitespace-nowrap',
        align === 'left' && 'text-left',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      {children}
    </Component>
  );
}

Table.displayName = 'Table';
TableHead.displayName = 'TableHead';
TableBody.displayName = 'TableBody';
TableRow.displayName = 'TableRow';
TableCell.displayName = 'TableCell';
