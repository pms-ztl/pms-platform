import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  LockClosedIcon,
  XMarkIcon,
  ShieldCheckIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Permission {
  resource: string;
  action: string;
  scope: string;
  key: string;
  description?: string;
}

interface PermissionCatalogGroup {
  resource: string;
  permissions: Permission[];
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  category: 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';
  isSystem: boolean;
  permissions: string[];
  _count?: { users: number };
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS: Role['category'][] = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];

const CATEGORY_COLORS: Record<Role['category'], { bg: string; text: string; ring: string }> = {
  ADMIN: {
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    text: 'text-red-700 dark:text-red-400',
    ring: 'ring-red-500/30',
  },
  HR: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-400',
    ring: 'ring-purple-500/30',
  },
  MANAGER: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
    ring: 'ring-blue-500/30',
  },
  EMPLOYEE: {
    bg: 'bg-green-500/10 dark:bg-green-500/20',
    text: 'text-green-700 dark:text-green-400',
    ring: 'ring-green-500/30',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryBadge({ category }: { category: Role['category'] }) {
  const c = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.EMPLOYEE;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${c.bg} ${c.text} ${c.ring}`}
    >
      {category}
    </span>
  );
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUserCount(role: Role): number {
  if (typeof role.userCount === 'number') return role.userCount;
  if (role._count && typeof role._count.users === 'number') return role._count.users;
  return 0;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function RoleManagementPage() {
  usePageTitle('Role Management');

  // ---- data state ----
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<PermissionCatalogGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- create/edit modal state ----
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  // ---- form fields ----
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<Role['category']>('EMPLOYEE');
  const [formPermissions, setFormPermissions] = useState<Set<string>>(new Set());
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  const [permissionSearch, setPermissionSearch] = useState('');

  // ---- delete modal state ----
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [fallbackRoleId, setFallbackRoleId] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ---- clone state ----
  const [cloning, setCloning] = useState<string | null>(null);

  // ---- compare state ----
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<{
    role1: { id: string; name: string };
    role2: { id: string; name: string };
    shared: string[];
    onlyInRole1: string[];
    onlyInRole2: string[];
  } | null>(null);
  const [comparing, setComparing] = useState(false);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const loadRoles = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/roles');
      setRoles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load roles');
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/roles/permissions-catalog');
      setPermissionsCatalog(Array.isArray(data) ? data : []);
    } catch {
      // Permissions catalog may not exist yet - silently ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      await Promise.all([loadRoles(), loadCatalog()]);
      if (!cancelled) setLoading(false);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [loadRoles, loadCatalog]);

  // -----------------------------------------------------------------------
  // Modal helpers
  // -----------------------------------------------------------------------

  function openCreateModal() {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormCategory('EMPLOYEE');
    setFormPermissions(new Set());
    setExpandedResources(new Set());
    setShowModal(true);
  }

  function openEditModal(role: Role) {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description ?? '');
    setFormCategory(role.category);
    setFormPermissions(new Set(role.permissions ?? []));
    setExpandedResources(new Set());
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingRole(null);
  }

  // -----------------------------------------------------------------------
  // Permission toggle helpers
  // -----------------------------------------------------------------------

  function togglePermission(key: string) {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleResource(resource: string) {
    setExpandedResources((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) next.delete(resource);
      else next.add(resource);
      return next;
    });
  }

  function toggleAllForResource(group: PermissionCatalogGroup) {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      const keys = group.permissions.map((p) => p.key);
      const allSelected = keys.every((k) => next.has(k));
      if (allSelected) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  }

  // -----------------------------------------------------------------------
  // CRUD handlers
  // -----------------------------------------------------------------------

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Role name is required');
      return;
    }

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      category: formCategory,
      permissions: Array.from(formPermissions),
    };

    setSaving(true);
    try {
      if (editingRole) {
        await api.put('/roles/' + editingRole.id, payload);
        toast.success('Role updated successfully');
      } else {
        await api.post('/roles', payload);
        toast.success('Role created successfully');
      }
      closeModal();
      await loadRoles();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(role: Role) {
    setDeleteTarget(role);
    setFallbackRoleId('');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const count = getUserCount(deleteTarget);
    if (count > 0 && !fallbackRoleId) {
      toast.error('Please select a fallback role for existing users');
      return;
    }

    setDeleting(true);
    try {
      const query = fallbackRoleId ? '?fallbackRoleId=' + fallbackRoleId : '';
      await api.delete('/roles/' + deleteTarget.id + query);
      toast.success('Role deleted successfully');
      setDeleteTarget(null);
      await loadRoles();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete role');
    } finally {
      setDeleting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Clone handler
  // -----------------------------------------------------------------------

  async function handleClone(roleId: string) {
    setCloning(roleId);
    try {
      const result = await api.post<any>(`/roles/${roleId}/clone`);
      toast.success(`Role cloned as "${result?.name || 'New Role'}"`);
      await loadRoles();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to clone role');
    } finally {
      setCloning(null);
    }
  }

  // -----------------------------------------------------------------------
  // Compare handler
  // -----------------------------------------------------------------------

  function toggleCompareSelection(roleId: string) {
    setCompareSelection((prev) => {
      if (prev.includes(roleId)) return prev.filter((id) => id !== roleId);
      if (prev.length >= 2) return [prev[1], roleId]; // Replace oldest
      return [...prev, roleId];
    });
  }

  async function handleCompare() {
    if (compareSelection.length !== 2) return;
    setComparing(true);
    try {
      const result = await api.get<any>(`/roles/compare?role1=${compareSelection[0]}&role2=${compareSelection[1]}`);
      setCompareResult(result);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to compare roles');
    } finally {
      setComparing(false);
    }
  }

  // -----------------------------------------------------------------------
  // Filtered permissions catalog for search
  // -----------------------------------------------------------------------

  const filteredCatalog = useMemo(() => {
    if (!permissionSearch.trim()) return permissionsCatalog;
    const q = permissionSearch.toLowerCase();
    return permissionsCatalog
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (p) => p.key.toLowerCase().includes(q) || p.resource.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [permissionsCatalog, permissionSearch]);

  // -----------------------------------------------------------------------
  // Render: Loading skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Role Management" subtitle="Loading roles..." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-6 animate-pulse h-40"
            />
          ))}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Page
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ---- Page header ---- */}
      <PageHeader title="Role Management" subtitle="Create and manage roles and their permissions for your organization.">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); setCompareResult(null); }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              compareMode
                ? 'bg-purple-600 text-white hover:bg-purple-500'
                : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
            }`}
          >
            <ArrowsRightLeftIcon className="h-5 w-5" />
            {compareMode ? 'Exit Compare' : 'Compare Roles'}
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create Role
          </button>
        </div>
      </PageHeader>

      {/* ---- Compare mode bar ---- */}
      {compareMode && (
        <div className="flex items-center gap-3 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 px-4 py-3">
          <ArrowsRightLeftIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <span className="text-sm text-purple-800 dark:text-purple-300 flex-1">
            Select 2 roles to compare. {compareSelection.length}/2 selected.
          </span>
          <button
            onClick={handleCompare}
            disabled={compareSelection.length !== 2 || comparing}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {comparing && <Spinner />}
            Compare
          </button>
        </div>
      )}

      {/* ---- Role cards grid ---- */}
      {roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary-300 dark:border-secondary-700 py-16">
          <ShieldCheckIcon className="h-12 w-12 text-secondary-400 dark:text-secondary-500 mb-4" />
          <p className="text-lg font-medium text-secondary-900 dark:text-white">No roles found</p>
          <p className="text-secondary-500 dark:text-secondary-400 mt-1">
            Get started by creating your first role.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Create Role
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((role) => {
            const count = getUserCount(role);
            return (
              <div
                key={role.id}
                className="bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-5 flex flex-col justify-between hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
              >
                {/* Card top */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-base font-semibold text-secondary-900 dark:text-white break-words">
                        {role.name}
                      </h3>
                      {role.isSystem && (
                        <LockClosedIcon
                          className="h-4 w-4 flex-shrink-0 text-secondary-400 dark:text-secondary-500"
                          title="System role"
                        />
                      )}
                    </div>
                    <CategoryBadge category={role.category} />
                  </div>

                  {role.description && (
                    <p className="mt-2 text-sm text-secondary-600 dark:text-secondary-400">
                      {role.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="h-3.5 w-3.5" />
                      {count} user{count !== 1 ? 's' : ''}
                    </span>
                    {role.permissions && (
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheckIcon className="h-3.5 w-3.5" />
                        {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {role.isSystem && (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <LockClosedIcon className="h-3.5 w-3.5" />
                        System
                      </span>
                    )}
                  </div>
                </div>

                {/* Card actions */}
                <div className="mt-4 flex items-center gap-2 border-t border-secondary-100 dark:border-secondary-800 pt-3">
                  {compareMode ? (
                    <button
                      onClick={() => toggleCompareSelection(role.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        compareSelection.includes(role.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
                      }`}
                    >
                      {compareSelection.includes(role.id) ? 'Selected' : 'Select'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => openEditModal(role)}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleClone(role.id)}
                        disabled={cloning === role.id}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                        title="Clone this role"
                      >
                        {cloning === role.id ? <Spinner className="h-3.5 w-3.5" /> : <DocumentDuplicateIcon className="h-3.5 w-3.5" />}
                        Clone
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(role)}
                        disabled={role.isSystem}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={role.isSystem ? 'System roles cannot be deleted' : 'Delete role'}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================= */}
      {/* Create / Edit Modal                                               */}
      {/* ================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-8">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-secondary-200/60 dark:border-white/[0.06] px-6 py-4">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                {editingRole ? 'Edit Role' : 'Create Role'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 px-6 py-5 max-h-[70vh] overflow-y-auto">
              {/* Name field */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Department Manager"
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                />
              </div>

              {/* Description field */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this role..."
                  rows={3}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors resize-none"
                />
              </div>

              {/* Category dropdown */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as Role['category'])}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Permissions section */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Permissions
                </label>

                {/* Permission search filter */}
                {permissionsCatalog.length > 0 && (
                  <div className="relative mb-3">
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-secondary-400" />
                    <input
                      type="text"
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      placeholder="Search permissions..."
                      className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl pl-9 pr-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                    />
                  </div>
                )}

                {permissionsCatalog.length === 0 ? (
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 italic">
                    No permissions catalog available. Permissions can be configured after the role is created.
                  </p>
                ) : (
                  <div className="rounded-lg border border-secondary-200/60 dark:border-white/[0.06] divide-y divide-secondary-100/60 dark:divide-white/[0.04]">
                    {filteredCatalog.map((group) => {
                      const isExpanded = expandedResources.has(group.resource);
                      const groupKeys = group.permissions.map((p) => p.key);
                      const selectedCount = groupKeys.filter((k) => formPermissions.has(k)).length;
                      const allSelected = selectedCount === groupKeys.length && groupKeys.length > 0;
                      const someSelected = selectedCount > 0 && !allSelected;

                      return (
                        <div key={group.resource}>
                          {/* Resource header */}
                          <button
                            type="button"
                            onClick={() => toggleResource(group.resource)}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDownIcon className="h-4 w-4 text-secondary-400" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4 text-secondary-400" />
                              )}
                              <span className="text-sm font-medium text-secondary-900 dark:text-white capitalize">
                                {group.resource.replace(/[-_]/g, ' ')}
                              </span>
                            </div>
                            <span className="text-xs text-secondary-500 dark:text-secondary-400">
                              {selectedCount}/{groupKeys.length}
                            </span>
                          </button>

                          {/* Expanded permission checkboxes */}
                          {isExpanded && (
                            <div className="bg-secondary-50/50 dark:bg-secondary-800/30 px-4 py-3 space-y-2">
                              {/* Select all */}
                              <label className="flex items-center gap-2 cursor-pointer pb-2 border-b border-secondary-200/60 dark:border-white/[0.06]">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someSelected;
                                  }}
                                  onChange={() => toggleAllForResource(group)}
                                  className="h-4 w-4 rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400">
                                  Select all
                                </span>
                              </label>

                              {/* Individual permissions */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {group.permissions.map((perm) => (
                                  <label
                                    key={perm.key}
                                    className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={formPermissions.has(perm.key)}
                                      onChange={() => togglePermission(perm.key)}
                                      className="h-4 w-4 rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div className="min-w-0">
                                      <span className="block text-xs font-mono text-secondary-800 dark:text-secondary-200 break-words">
                                        {perm.key}
                                      </span>
                                      {perm.description && (
                                        <span className="block text-xs text-secondary-500 dark:text-secondary-400 break-words">
                                          {perm.description}
                                        </span>
                                      )}
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {formPermissions.size > 0 && (
                  <p className="mt-2 text-xs text-secondary-500 dark:text-secondary-400">
                    {formPermissions.size} permission{formPermissions.size !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-secondary-200/60 dark:border-white/[0.06] px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Spinner />}
                {saving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Delete Confirmation Modal                                         */}
      {/* ================================================================= */}
      {/* ================================================================= */}
      {/* Compare Result Modal                                             */}
      {/* ================================================================= */}
      {compareResult && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-8">
          <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-secondary-200/60 dark:border-white/[0.06] px-6 py-4">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Compare: {compareResult.role1.name} vs {compareResult.role2.name}
              </h2>
              <button
                onClick={() => setCompareResult(null)}
                className="rounded-lg p-1.5 text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-5">
              {/* Shared permissions */}
              <div>
                <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                  Shared Permissions ({compareResult.shared.length})
                </h3>
                {compareResult.shared.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {compareResult.shared.map((p) => (
                      <span key={p} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-mono bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 ring-1 ring-green-500/20">
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-secondary-500 italic">No shared permissions</p>
                )}
              </div>

              {/* Only in Role 1 */}
              <div>
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
                  Only in {compareResult.role1.name} ({compareResult.onlyInRole1.length})
                </h3>
                {compareResult.onlyInRole1.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {compareResult.onlyInRole1.map((p) => (
                      <span key={p} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-mono bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/20">
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-secondary-500 italic">No unique permissions</p>
                )}
              </div>

              {/* Only in Role 2 */}
              <div>
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
                  Only in {compareResult.role2.name} ({compareResult.onlyInRole2.length})
                </h3>
                {compareResult.onlyInRole2.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {compareResult.onlyInRole2.map((p) => (
                      <span key={p} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-mono bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20">
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-secondary-500 italic">No unique permissions</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-secondary-200/60 dark:border-white/[0.06] px-6 py-4">
              <button
                onClick={() => setCompareResult(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            {/* Delete header */}
            <div className="flex items-center gap-3 border-b border-secondary-200/60 dark:border-white/[0.06] px-6 py-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Delete Role</h2>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Delete body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-secondary-700 dark:text-secondary-300">
                Are you sure you want to delete the role{' '}
                <span className="font-semibold text-secondary-900 dark:text-white">
                  &ldquo;{deleteTarget.name}&rdquo;
                </span>
                ?
              </p>

              {getUserCount(deleteTarget) > 0 && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                    This role has {getUserCount(deleteTarget)} user
                    {getUserCount(deleteTarget) !== 1 ? 's' : ''} assigned.
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                    Select a fallback role to reassign these users:
                  </p>
                  <select
                    value={fallbackRoleId}
                    onChange={(e) => setFallbackRoleId(e.target.value)}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                  >
                    <option value="">-- Select a role --</option>
                    {roles
                      .filter((r) => r.id !== deleteTarget.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.category})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Delete footer */}
            <div className="flex items-center justify-end gap-3 border-t border-secondary-200/60 dark:border-white/[0.06] px-6 py-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || (getUserCount(deleteTarget) > 0 && !fallbackRoleId)}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting && <Spinner />}
                {deleting ? 'Deleting...' : 'Delete Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
