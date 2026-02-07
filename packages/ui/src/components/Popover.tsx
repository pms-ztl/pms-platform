import { Fragment, type ReactNode } from 'react';
import { Popover as HeadlessPopover, Transition } from '@headlessui/react';
import clsx from 'clsx';

export interface PopoverProps {
  trigger: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  children: ReactNode;
}

const placementStyles = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Popover({
  trigger,
  placement = 'bottom',
  className,
  children,
}: PopoverProps) {
  return (
    <HeadlessPopover className="relative">
      <HeadlessPopover.Button as={Fragment}>{trigger}</HeadlessPopover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <HeadlessPopover.Panel
          className={clsx(
            'absolute z-10 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 p-4',
            placementStyles[placement],
            className
          )}
        >
          {children}
        </HeadlessPopover.Panel>
      </Transition>
    </HeadlessPopover>
  );
}

Popover.displayName = 'Popover';
