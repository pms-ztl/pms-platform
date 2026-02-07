import clsx from 'clsx';
import type { BaseProps } from '../types';

interface StackProps extends BaseProps {
  spacing?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  divider?: boolean;
}

const spacingStyles = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
};

const alignStyles = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyStyles = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

export function Stack({
  spacing = 4,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  divider = false,
  className,
  children,
}: StackProps) {
  return (
    <div
      className={clsx(
        'flex flex-col',
        spacingStyles[spacing],
        alignStyles[align],
        justifyStyles[justify],
        wrap && 'flex-wrap',
        divider && 'divide-y divide-gray-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function HStack({
  spacing = 4,
  align = 'center',
  justify = 'start',
  wrap = false,
  divider = false,
  className,
  children,
}: StackProps) {
  return (
    <div
      className={clsx(
        'flex flex-row',
        spacingStyles[spacing],
        alignStyles[align],
        justifyStyles[justify],
        wrap && 'flex-wrap',
        divider && 'divide-x divide-gray-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function VStack({
  spacing = 4,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  divider = false,
  className,
  children,
}: StackProps) {
  return (
    <div
      className={clsx(
        'flex flex-col',
        spacingStyles[spacing],
        alignStyles[align],
        justifyStyles[justify],
        wrap && 'flex-wrap',
        divider && 'divide-y divide-gray-200',
        className
      )}
    >
      {children}
    </div>
  );
}

Stack.displayName = 'Stack';
HStack.displayName = 'HStack';
VStack.displayName = 'VStack';
