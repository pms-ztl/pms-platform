import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// MasterDetail — Strict master-detail layout primitive
// ---------------------------------------------------------------------------
// Rules enforced:
//   1. If nothing selected → list spans full width, detail is HIDDEN (not reserved)
//   2. If selected on lg+ → grid-cols-[1fr_420px] with right detail panel
//   3. On small screens → detail opens in a Modal/Drawer overlay
//   4. data-testid on detail panel for automated audit
// ---------------------------------------------------------------------------

interface MasterDetailProps<T> {
  /** List items to render in master pane */
  items: T[];
  /** Currently selected item (null = nothing selected) */
  selectedItem: T | null;
  /** Render the master list. Receives full width flag. */
  renderList: (items: T[], isFullWidth: boolean) => ReactNode;
  /** Render the detail panel for a selected item */
  renderDetail: (item: T) => ReactNode;
  /** Called to clear selection (close detail) */
  onClearSelection: () => void;
  /** Detail panel width on desktop (default 420px) */
  detailWidth?: number;
  /** Title shown in mobile drawer header */
  detailTitle?: string;
  /** Extra class on the outer wrapper */
  className?: string;
}

export function MasterDetail<T>({
  items,
  selectedItem,
  renderList,
  renderDetail,
  onClearSelection,
  detailWidth = 420,
  detailTitle = 'Details',
  className,
}: MasterDetailProps<T>) {
  const hasSelection = selectedItem !== null;

  // Track screen size for mobile drawer behavior
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsLg(e.matches);
    handler(mql);
    mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mql.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  const handleClose = useCallback(() => onClearSelection(), [onClearSelection]);

  return (
    <>
      {/* Desktop layout */}
      <div
        className={clsx('gap-4', className)}
        style={{
          display: 'grid',
          gridTemplateColumns: hasSelection && isLg ? `1fr ${detailWidth}px` : '1fr',
        }}
      >
        {/* Master list */}
        <div className="min-w-0">{renderList(items, !hasSelection || !isLg)}</div>

        {/* Desktop detail panel — only rendered when selected on lg+ */}
        {hasSelection && isLg && (
          <div
            className="rounded-2xl bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl border border-secondary-200/60 dark:border-white/[0.06] overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 10rem)' }}
            data-testid="ui-master-detail-detail"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-secondary-200/60 dark:border-white/[0.06] bg-white/95 dark:bg-secondary-800/95 backdrop-blur-xl px-4 py-3">
              <h3 className="font-semibold text-secondary-900 dark:text-white text-sm">
                {detailTitle}
              </h3>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">{renderDetail(selectedItem)}</div>
          </div>
        )}
      </div>

      {/* Mobile drawer — only shown when selected on small screens */}
      <Transition appear show={hasSelection && !isLg} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-8"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-8"
              >
                <Dialog.Panel className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white dark:bg-secondary-800 shadow-2xl max-h-[85vh] overflow-y-auto">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-secondary-200/60 dark:border-white/[0.06] bg-white/95 dark:bg-secondary-800/95 backdrop-blur-xl px-4 py-3">
                    <Dialog.Title className="font-semibold text-secondary-900 dark:text-white">
                      {detailTitle}
                    </Dialog.Title>
                    <button
                      onClick={handleClose}
                      className="rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-700 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-4">
                    {selectedItem && renderDetail(selectedItem)}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
