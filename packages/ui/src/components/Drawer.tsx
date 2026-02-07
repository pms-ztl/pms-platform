import { Fragment, type ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { Size } from '../types';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: Size;
  placement?: 'left' | 'right';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

const sizeStyles: Record<Size, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  placement = 'right',
  closeOnOverlayClick = true,
  showCloseButton = true,
  children,
  footer,
}: DrawerProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeOnOverlayClick ? onClose : () => {}}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={clsx(
                'fixed inset-y-0 flex max-w-full',
                placement === 'right' ? 'right-0 pl-10' : 'left-0 pr-10'
              )}
            >
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom={
                  placement === 'right' ? 'translate-x-full' : '-translate-x-full'
                }
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo={
                  placement === 'right' ? 'translate-x-full' : '-translate-x-full'
                }
              >
                <Dialog.Panel
                  className={clsx(
                    'w-screen transform bg-white shadow-xl flex flex-col',
                    sizeStyles[size]
                  )}
                >
                  {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-6 border-b border-gray-200">
                      <div>
                        {title && (
                          <Dialog.Title
                            as="h3"
                            className="text-lg font-semibold text-gray-900"
                          >
                            {title}
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description className="mt-1 text-sm text-gray-500">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>
                      {showCloseButton && (
                        <button
                          type="button"
                          className="rounded-lg p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          onClick={onClose}
                        >
                          <span className="sr-only">Close</span>
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-6">{children}</div>

                  {footer && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                      {footer}
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

Drawer.displayName = 'Drawer';
