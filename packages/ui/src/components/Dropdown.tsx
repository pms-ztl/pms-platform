import { Fragment, type ReactNode } from 'react';
import { Menu, Transition } from '@headlessui/react';
import clsx from 'clsx';
import type { BaseProps } from '../types';

export interface DropdownProps extends BaseProps {
  trigger: ReactNode;
  align?: 'left' | 'right';
  width?: 'auto' | 'sm' | 'md' | 'lg';
}

interface DropdownItemProps {
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const widthStyles = {
  auto: 'w-auto',
  sm: 'w-48',
  md: 'w-56',
  lg: 'w-64',
};

export function Dropdown({
  trigger,
  align = 'right',
  width = 'sm',
  className,
  children,
}: DropdownProps) {
  return (
    <Menu as="div" className={clsx('relative inline-block text-left', className)}>
      <Menu.Button as={Fragment}>{trigger}</Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={clsx(
            'absolute z-10 mt-2 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            widthStyles[width]
          )}
        >
          <div className="py-1">{children}</div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

export function DropdownItem({
  onClick,
  disabled = false,
  danger = false,
  icon,
  children,
}: DropdownItemProps) {
  return (
    <Menu.Item disabled={disabled}>
      {({ active }) => (
        <button
          onClick={onClick}
          disabled={disabled}
          className={clsx(
            'flex w-full items-center px-4 py-2 text-sm',
            active && !danger && 'bg-gray-100',
            active && danger && 'bg-danger-50',
            disabled && 'opacity-50 cursor-not-allowed',
            danger ? 'text-danger-600' : 'text-gray-700'
          )}
        >
          {icon && <span className="mr-3 h-5 w-5">{icon}</span>}
          {children}
        </button>
      )}
    </Menu.Item>
  );
}

Dropdown.Item = DropdownItem;
Dropdown.Divider = function DropdownDivider() {
  return <div className="my-1 border-t border-gray-100" />;
};

Dropdown.displayName = 'Dropdown';
DropdownItem.displayName = 'DropdownItem';
