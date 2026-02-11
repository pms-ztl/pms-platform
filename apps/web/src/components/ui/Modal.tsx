import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, description, children, size = 'md', className }: ModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel
                className={clsx(
                  'w-full rounded-2xl bg-white dark:bg-secondary-800 shadow-2xl',
                  'ring-1 ring-secondary-200 dark:ring-secondary-700',
                  sizeClasses[size],
                  className
                )}
              >
                {title && (
                  <div className="flex items-center justify-between border-b border-secondary-200 dark:border-secondary-700 px-6 py-4">
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-secondary-900 dark:text-white">
                        {title}
                      </Dialog.Title>
                      {description && (
                        <Dialog.Description className="mt-0.5 text-sm text-secondary-500 dark:text-secondary-400">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    <button
                      onClick={onClose}
                      className="rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-700 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
                <div className="px-6 py-4">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
