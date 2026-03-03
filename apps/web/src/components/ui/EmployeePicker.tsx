import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { usersApi, getAvatarUrl } from '@/lib/api';

interface EmployeePickerProps {
  value: string;
  onChange: (userId: string, displayName?: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  /** If true, uses dark-mode-first styling (gray-700/800 bg) */
  dark?: boolean;
  /** Accent color for focus ring */
  accent?: 'amber' | 'purple' | 'indigo' | 'primary';
}

const ACCENT_RING: Record<string, string> = {
  amber: 'focus-within:ring-amber-500',
  purple: 'focus-within:ring-purple-500',
  indigo: 'focus-within:ring-indigo-500',
  primary: 'focus-within:ring-primary-500',
};

export function EmployeePicker({
  value,
  onChange,
  placeholder = 'Search employees...',
  className,
  label,
  dark = false,
  accent = 'primary',
}: EmployeePickerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch users for dropdown
  const { data: usersData } = useQuery({
    queryKey: ['employee-picker', search],
    queryFn: () => usersApi.list({ search: search || undefined, limit: 10, isActive: true }),
    staleTime: 30_000,
    enabled: isOpen,
  });

  const users = usersData?.data ?? usersData ?? [];
  const userList = Array.isArray(users) ? users : [];

  // Resolve selected user name if we have an ID but no name
  const { data: selectedUser } = useQuery({
    queryKey: ['employee-picker-selected', value],
    queryFn: () => usersApi.getById(value),
    enabled: !!value && !selectedName,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (selectedUser && !selectedName) {
      const u = (selectedUser as any)?.data ?? selectedUser;
      if (u?.firstName) {
        setSelectedName(`${u.firstName} ${u.lastName}`);
      }
    }
  }, [selectedUser, selectedName]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((userId: string, name: string) => {
    onChange(userId, name);
    setSelectedName(name);
    setSearch('');
    setIsOpen(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('', '');
    setSelectedName('');
    setSearch('');
    inputRef.current?.focus();
  }, [onChange]);

  const baseBg = dark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white dark:bg-secondary-700 border-secondary-300 dark:border-secondary-600 text-secondary-900 dark:text-white';

  const dropdownBg = dark
    ? 'bg-gray-800 border-gray-600'
    : 'bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-600';

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {label && (
        <label className={clsx(
          'block text-sm font-medium mb-1',
          dark ? 'text-gray-300' : 'text-secondary-700 dark:text-secondary-300'
        )}>
          {label}
        </label>
      )}

      {/* Selected state or search input */}
      <div className={clsx(
        'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all focus-within:ring-2',
        baseBg,
        ACCENT_RING[accent],
      )}>
        {value && selectedName && !isOpen ? (
          <>
            <UserIcon className="h-4 w-4 text-secondary-400 flex-shrink-0" />
            <button
              type="button"
              onClick={() => { setIsOpen(true); setSearch(''); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="flex-1 text-left truncate"
            >
              {selectedName}
            </button>
            <button type="button" onClick={handleClear} className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 flex-shrink-0">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <MagnifyingGlassIcon className="h-4 w-4 text-secondary-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none min-w-0"
            />
            {value && (
              <button type="button" onClick={handleClear} className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 flex-shrink-0">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className={clsx(
          'absolute z-50 mt-1 w-full rounded-lg border shadow-lg max-h-60 overflow-y-auto',
          dropdownBg,
        )}>
          {userList.length === 0 ? (
            <div className={clsx('px-3 py-4 text-center text-sm', dark ? 'text-gray-400' : 'text-secondary-400')}>
              {search ? 'No employees found' : 'Type to search employees'}
            </div>
          ) : (
            userList.map((user) => {
              const avatarSrc = getAvatarUrl(user.avatarUrl, 'sm');
              const name = `${user.firstName} ${user.lastName}`;
              const isSelected = user.id === value;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user.id, name)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                    isSelected
                      ? dark ? 'bg-purple-500/20' : 'bg-primary-50 dark:bg-primary-500/10'
                      : dark ? 'hover:bg-gray-700' : 'hover:bg-secondary-50 dark:hover:bg-white/[0.04]',
                  )}
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary-200 dark:bg-secondary-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-secondary-600 dark:text-secondary-300">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={clsx('text-sm font-medium truncate', dark ? 'text-white' : 'text-secondary-900 dark:text-white')}>
                      {name}
                    </p>
                    <p className={clsx('text-xs truncate', dark ? 'text-gray-400' : 'text-secondary-500 dark:text-secondary-400')}>
                      {user.jobTitle || user.email}
                      {user.department?.name && ` · ${user.department.name}`}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
