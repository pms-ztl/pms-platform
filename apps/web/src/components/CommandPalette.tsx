import { Fragment, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuthStore } from '@/store/auth';
import { navigationSections, adminSection, type NavItem } from '@/config/navigation';

// Quick-access pages shown when search is empty
const QUICK_ACCESS_PATHS = ['/dashboard', '/goals', '/reviews', '/settings', '/feedback', '/chat'];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const userRoles = user?.roles ?? [];

  // Build searchable list filtered by role
  const allSections = useMemo(() => {
    const sections = [...navigationSections, adminSection];
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.roles || item.roles.some((r) => userRoles.includes(r))
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [userRoles]);

  // Filter by search query
  const filteredSections = useMemo(() => {
    if (!query.trim()) {
      // Show quick-access items when no query
      const quickItems = allSections
        .flatMap((s) => s.items)
        .filter((item) => QUICK_ACCESS_PATHS.includes(item.href));
      return [{ label: 'Quick Access', items: quickItems, collapsible: false }];
    }

    const lowerQuery = query.toLowerCase();
    return allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.name.toLowerCase().includes(lowerQuery)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [query, allSections]);

  const totalResults = filteredSections.reduce((sum, s) => sum + s.items.length, 0);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSelect(href: string) {
    if (href) {
      navigate(href);
      setOpen(false);
      setQuery('');
    }
  }

  function handleClose() {
    setOpen(false);
    setQuery('');
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={handleClose}>
        {/* Backdrop */}
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

        {/* Palette panel */}
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95 translate-y-4"
          >
            <Dialog.Panel className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-secondary-800 shadow-2xl ring-1 ring-secondary-200 dark:ring-secondary-700">
              <Combobox onChange={handleSelect}>
                {/* Search input */}
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-secondary-400 dark:text-secondary-500" />
                  <Combobox.Input
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-sm text-secondary-900 dark:text-white placeholder:text-secondary-400 dark:placeholder:text-secondary-500 focus:ring-0 focus:outline-none"
                    placeholder="Search pages... (type to filter)"
                    onChange={(e) => setQuery(e.target.value)}
                    value={query}
                  />
                </div>

                {/* Results */}
                {totalResults > 0 && (
                  <Combobox.Options
                    static
                    className="max-h-80 scroll-pt-11 scroll-pb-2 space-y-1 overflow-y-auto border-t border-secondary-100 dark:border-secondary-700 p-2"
                  >
                    {filteredSections.map((section) => (
                      <div key={section.label}>
                        <p className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-secondary-400 dark:text-secondary-500">
                          {section.label}
                        </p>
                        {section.items.map((item: NavItem) => (
                          <Combobox.Option
                            key={item.href}
                            value={item.href}
                            className={({ active }) =>
                              clsx(
                                'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                                active
                                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
                                  : 'text-secondary-700 dark:text-secondary-300'
                              )
                            }
                          >
                            {({ active }) => (
                              <>
                                <item.icon
                                  className={clsx(
                                    'h-5 w-5 shrink-0',
                                    active
                                      ? 'text-primary-500 dark:text-primary-400'
                                      : 'text-secondary-400 dark:text-secondary-500'
                                  )}
                                />
                                <span className="flex-1 break-words">{item.name}</span>
                                {active && (
                                  <span className="text-[11px] text-secondary-400 dark:text-secondary-500">
                                    Enter ↵
                                  </span>
                                )}
                              </>
                            )}
                          </Combobox.Option>
                        ))}
                      </div>
                    ))}
                  </Combobox.Options>
                )}

                {/* No results */}
                {query && totalResults === 0 && (
                  <div className="border-t border-secondary-100 dark:border-secondary-700 px-6 py-10 text-center">
                    <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-secondary-300 dark:text-secondary-600" />
                    <p className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">
                      No results found
                    </p>
                    <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                      Try searching with different keywords
                    </p>
                  </div>
                )}

                {/* Footer hints */}
                <div className="flex items-center justify-between border-t border-secondary-100 dark:border-secondary-700 bg-secondary-50/50 dark:bg-secondary-900/50 px-4 py-2.5">
                  <div className="flex items-center gap-3 text-[11px] text-secondary-400 dark:text-secondary-500">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-secondary-200 dark:bg-secondary-700 px-1.5 py-0.5 text-[10px] font-mono">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-secondary-200 dark:bg-secondary-700 px-1.5 py-0.5 text-[10px] font-mono">↵</kbd>
                      Open
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-secondary-200 dark:bg-secondary-700 px-1.5 py-0.5 text-[10px] font-mono">Esc</kbd>
                      Close
                    </span>
                  </div>
                  <span className="text-[11px] text-secondary-400 dark:text-secondary-500">
                    {totalResults} result{totalResults !== 1 ? 's' : ''}
                  </span>
                </div>
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
