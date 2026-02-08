import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  PencilSquareIcon,
  StarIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckBadgeIcon,
  Squares2X2Icon,
  ExclamationTriangleIcon,
  SwatchIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { adminConfigApi } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConfigTab = 'rating-scales' | 'templates' | 'frameworks' | 'questionnaires';

interface RatingScale {
  id: string;
  name: string;
  minValue: number;
  maxValue: number;
  levels: Array<{
    value: number;
    label: string;
    description?: string;
    color?: string;
  }>;
}

interface TemplateSection {
  name: string;
  weight: number;
  ratingScale?: string;
}

interface ReviewTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  sections: TemplateSection[];
  createdAt?: string;
}

interface Competency {
  id: string;
  name: string;
  category?: string;
  description?: string;
  parentId?: string;
  levels?: Array<{ level: number; description: string }>;
  children?: Competency[];
}

interface CompetencyFramework {
  id: string;
  name: string;
  description?: string;
  version?: string;
  isActive: boolean;
  competencies?: Competency[];
  createdAt?: string;
}

interface Questionnaire {
  id: string;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  questions: Array<{
    id?: string;
    text: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCALE_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
];

function scaleColor(index: number, total: number): string {
  const mapped = Math.round((index / Math.max(total - 1, 1)) * (SCALE_COLORS.length - 1));
  return SCALE_COLORS[mapped] ?? 'bg-primary-500';
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  SELF_ASSESSMENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  PEER_REVIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  MANAGER_REVIEW: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  '360_FEEDBACK': 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  SURVEY: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
};

function typeBadgeColor(type: string): string {
  return TYPE_BADGE_COLORS[type] ?? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300';
}

const DEFAULT_SECTIONS_JSON = JSON.stringify(
  [
    { name: 'Job Performance', weight: 40, ratingScale: '1-5' },
    { name: 'Competencies', weight: 30, ratingScale: '1-5' },
    { name: 'Goals Achievement', weight: 30, ratingScale: '1-5' },
  ],
  null,
  2,
);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 text-center py-12 px-6">
      <Icon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
      <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">{description}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div
          className={clsx(
            'relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl w-full p-6 border border-secondary-200/50 dark:border-secondary-700',
            wide ? 'max-w-2xl' : 'max-w-lg',
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
            >
              <XMarkIcon className="h-5 w-5 text-secondary-500" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rating Scales Tab
// ---------------------------------------------------------------------------

function RatingScalesTab() {
  const { data: scales, isLoading, error } = useQuery({
    queryKey: ['admin-config', 'rating-scales'],
    queryFn: () => adminConfigApi.getRatingScales(),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={(error as Error).message || 'Failed to load rating scales'} />;
  if (!scales || scales.length === 0) {
    return (
      <EmptyState
        icon={StarIcon}
        title="No rating scales found"
        description="Rating scales are defined within review templates. Create a template to set up rating scales."
      />
    );
  }

  return (
    <div className="space-y-6">
      {(scales as RatingScale[]).map((scale) => (
        <div
          key={scale.id}
          className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">{scale.name}</h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Range: {scale.minValue} &ndash; {scale.maxValue}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              <SwatchIcon className="h-3.5 w-3.5" />
              {scale.levels?.length || 0} levels
            </span>
          </div>

          {/* Visual bar */}
          <div className="px-6 py-5">
            <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-4">
              {(scale.levels || []).map((lvl, idx) => (
                <div
                  key={lvl.value}
                  className={clsx('flex-1 transition-all', scaleColor(idx, scale.levels.length))}
                  title={`${lvl.value} - ${lvl.label}`}
                />
              ))}
            </div>

            {/* Level cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(scale.levels || []).map((lvl, idx) => (
                <div
                  key={lvl.value}
                  className="flex items-start gap-3 p-3 rounded-lg border border-secondary-100 dark:border-secondary-700 bg-secondary-50/50 dark:bg-secondary-900/30"
                >
                  <span
                    className={clsx(
                      'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white',
                      scaleColor(idx, scale.levels.length),
                    )}
                  >
                    {lvl.value}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                      {lvl.label}
                    </p>
                    {lvl.description && (
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5 line-clamp-2">
                        {lvl.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review Templates Tab
// ---------------------------------------------------------------------------

function ReviewTemplatesTab() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReviewTemplate | null>(null);

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['admin-config', 'templates'],
    queryFn: () => adminConfigApi.listTemplates(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminConfigApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config', 'templates'] });
      setShowCreateModal(false);
      toast.success('Template created successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create template'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminConfigApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config', 'templates'] });
      setEditingTemplate(null);
      toast.success('Template updated successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update template'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminConfigApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config', 'templates'] });
      toast.success('Template deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete template'),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={(error as Error).message || 'Failed to load templates'} />;

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          {(templates as ReviewTemplate[] | undefined)?.length ?? 0} template(s) configured
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Template cards */}
      {!templates || (templates as ReviewTemplate[]).length === 0 ? (
        <EmptyState
          icon={DocumentTextIcon}
          title="No review templates"
          description="Create your first review template to get started."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(templates as ReviewTemplate[]).map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <DocumentTextIcon className="h-5 w-5 text-primary-500 flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                    {tpl.name}
                  </h3>
                </div>
                {tpl.isDefault && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                    <CheckBadgeIcon className="h-3.5 w-3.5" />
                    Default
                  </span>
                )}
              </div>
              {tpl.description && (
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-3 line-clamp-2">
                  {tpl.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-secondary-100 dark:border-secondary-700">
                <span className="text-xs text-secondary-500 dark:text-secondary-400">
                  {tpl.sections?.length ?? 0} section(s)
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => setEditingTemplate(tpl)}
                    className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 dark:hover:text-primary-400 transition-colors"
                    title="Edit template"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this template?')) {
                        deleteMutation.mutate(tpl.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                    title="Delete template"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || editingTemplate) && (
        <TemplateModal
          template={editingTemplate}
          isPending={createMutation.isPending || updateMutation.isPending}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          onSubmit={(data) => {
            if (editingTemplate) {
              updateMutation.mutate({ id: editingTemplate.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </>
  );
}

function TemplateModal({
  template,
  isPending,
  onClose,
  onSubmit,
}: {
  template: ReviewTemplate | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [sectionsJson, setSectionsJson] = useState(
    template?.sections ? JSON.stringify(template.sections, null, 2) : DEFAULT_SECTIONS_JSON,
  );
  const [jsonError, setJsonError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setJsonError('');
    let parsed: TemplateSection[];
    try {
      parsed = JSON.parse(sectionsJson);
      if (!Array.isArray(parsed)) throw new Error('Sections must be an array');
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }
    onSubmit({ name, description, isDefault, sections: parsed });
  }

  return (
    <ModalShell title={template ? 'Edit Template' : 'Create Template'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Annual Performance Review"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Template used for annual performance reviews..."
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 text-primary-600 rounded border-secondary-300 dark:border-secondary-600"
          />
          <span className="text-sm text-secondary-700 dark:text-secondary-300">Set as default template</span>
        </label>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Sections (JSON)
          </label>
          <textarea
            value={sectionsJson}
            onChange={(e) => {
              setSectionsJson(e.target.value);
              setJsonError('');
            }}
            rows={10}
            spellCheck={false}
            className={clsx(
              'w-full rounded-lg border px-3 py-2 text-sm font-mono bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              jsonError
                ? 'border-red-400 dark:border-red-600'
                : 'border-secondary-300 dark:border-secondary-600',
            )}
          />
          {jsonError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{jsonError}</p>}
          <p className="mt-1 text-xs text-secondary-400 dark:text-secondary-500">
            Array of objects with <code className="text-primary-600 dark:text-primary-400">name</code>,{' '}
            <code className="text-primary-600 dark:text-primary-400">weight</code>,{' '}
            <code className="text-primary-600 dark:text-primary-400">ratingScale</code>
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            {template ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Competency Frameworks Tab
// ---------------------------------------------------------------------------

function CompetencyFrameworksTab() {
  const queryClient = useQueryClient();
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null);
  const [showCreateFrameworkModal, setShowCreateFrameworkModal] = useState(false);
  const [addCompetencyTo, setAddCompetencyTo] = useState<string | null>(null);

  const { data: frameworks, isLoading, error } = useQuery({
    queryKey: ['admin-config', 'frameworks'],
    queryFn: () => adminConfigApi.listFrameworks(),
  });

  // Fetch competencies when a framework is expanded
  const { data: competencies, isLoading: compLoading } = useQuery({
    queryKey: ['admin-config', 'competencies', expandedFramework],
    queryFn: () => adminConfigApi.listCompetencies(expandedFramework!),
    enabled: !!expandedFramework,
  });

  const createFrameworkMutation = useMutation({
    mutationFn: (data: any) => adminConfigApi.createFramework(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config', 'frameworks'] });
      setShowCreateFrameworkModal(false);
      toast.success('Framework created successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create framework'),
  });

  const deleteFrameworkMutation = useMutation({
    mutationFn: (id: string) => adminConfigApi.deleteFramework(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config', 'frameworks'] });
      toast.success('Framework deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete framework'),
  });

  const createCompetencyMutation = useMutation({
    mutationFn: ({ frameworkId, data }: { frameworkId: string; data: any }) =>
      adminConfigApi.createCompetency(frameworkId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config', 'competencies'] });
      setAddCompetencyTo(null);
      toast.success('Competency added successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create competency'),
  });

  const deleteCompetencyMutation = useMutation({
    mutationFn: (id: string) => adminConfigApi.deleteCompetency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config', 'competencies'] });
      toast.success('Competency deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete competency'),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={(error as Error).message || 'Failed to load frameworks'} />;

  // Build a tree from flat competencies list
  function buildTree(list: Competency[]): Competency[] {
    const map = new Map<string, Competency>();
    const roots: Competency[] = [];
    for (const c of list) {
      map.set(c.id, { ...c, children: [] });
    }
    for (const c of list) {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  function CompetencyNode({ node, depth }: { node: Competency; depth: number }) {
    const [open, setOpen] = useState(depth === 0);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className={clsx(depth > 0 && 'ml-6 border-l-2 border-secondary-200 dark:border-secondary-700 pl-4')}>
        <div className="flex items-start gap-2 py-2">
          {hasChildren ? (
            <button onClick={() => setOpen(!open)} className="mt-0.5 p-0.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700">
              {open ? (
                <ChevronDownIcon className="h-4 w-4 text-secondary-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-secondary-500" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-secondary-900 dark:text-white">{node.name}</p>
              {node.category && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400">
                  {node.category}
                </span>
              )}
            </div>
            {node.description && (
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{node.description}</p>
            )}
            {node.levels && node.levels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {node.levels.map((lvl) => (
                  <span
                    key={lvl.level}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    title={lvl.description}
                  >
                    L{lvl.level}: {lvl.description.length > 30 ? lvl.description.slice(0, 30) + '...' : lvl.description}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (confirm(`Delete competency "${node.name}"?`)) {
                deleteCompetencyMutation.mutate(node.id);
              }
            }}
            className="p-1 rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors flex-shrink-0"
            title="Delete competency"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
        {open && hasChildren && (
          <div>
            {node.children!.map((child) => (
              <CompetencyNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          {(frameworks as CompetencyFramework[] | undefined)?.length ?? 0} framework(s)
        </p>
        <button
          onClick={() => setShowCreateFrameworkModal(true)}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Create Framework
        </button>
      </div>

      {!frameworks || (frameworks as CompetencyFramework[]).length === 0 ? (
        <EmptyState
          icon={AcademicCapIcon}
          title="No competency frameworks"
          description="Create your first framework to define competencies for your organization."
        />
      ) : (
        <div className="space-y-3">
          {(frameworks as CompetencyFramework[]).map((fw) => {
            const isExpanded = expandedFramework === fw.id;
            return (
              <div
                key={fw.id}
                className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden"
              >
                {/* Accordion header */}
                <button
                  onClick={() => setExpandedFramework(isExpanded ? null : fw.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="h-5 w-5 text-secondary-400 flex-shrink-0" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-secondary-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">{fw.name}</h3>
                      {fw.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          Active
                        </span>
                      )}
                      {fw.version && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400">
                          v{fw.version}
                        </span>
                      )}
                    </div>
                    {fw.description && (
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5 truncate">
                        {fw.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        if (confirm(`Delete framework "${fw.name}"?`)) {
                          deleteFrameworkMutation.mutate(fw.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                      title="Delete framework"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-secondary-200 dark:border-secondary-700">
                    <div className="flex items-center justify-between mt-4 mb-3">
                      <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Competencies
                      </p>
                      <button
                        onClick={() => setAddCompetencyTo(fw.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        Add Competency
                      </button>
                    </div>
                    {compLoading ? (
                      <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-600" />
                      </div>
                    ) : !competencies || (competencies as Competency[]).length === 0 ? (
                      <p className="text-sm text-secondary-400 dark:text-secondary-500 py-4 text-center">
                        No competencies defined yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
                        {buildTree(competencies as Competency[]).map((node) => (
                          <CompetencyNode key={node.id} node={node} depth={0} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Framework Modal */}
      {showCreateFrameworkModal && (
        <ModalShell title="Create Framework" onClose={() => setShowCreateFrameworkModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createFrameworkMutation.mutate({
                name: fd.get('name') as string,
                description: fd.get('description') as string,
                version: fd.get('version') as string || undefined,
                isActive: (fd.get('isActive') as string) === 'on',
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Name</label>
              <input
                name="name"
                required
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Leadership Competency Framework"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describes the competencies expected of leaders..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Version</label>
              <input
                name="version"
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="1.0"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="h-4 w-4 text-primary-600 rounded border-secondary-300 dark:border-secondary-600"
              />
              <span className="text-sm text-secondary-700 dark:text-secondary-300">Active</span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateFrameworkModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createFrameworkMutation.isPending}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {createFrameworkMutation.isPending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                Create Framework
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Add Competency Modal */}
      {addCompetencyTo && (
        <ModalShell title="Add Competency" onClose={() => setAddCompetencyTo(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const levelsRaw = fd.get('levels') as string;
              let levels: Array<{ level: number; description: string }> | undefined;
              if (levelsRaw.trim()) {
                try {
                  levels = JSON.parse(levelsRaw);
                } catch {
                  toast.error('Invalid JSON for levels');
                  return;
                }
              }
              createCompetencyMutation.mutate({
                frameworkId: addCompetencyTo!,
                data: {
                  name: fd.get('name') as string,
                  category: (fd.get('category') as string) || undefined,
                  description: (fd.get('description') as string) || undefined,
                  parentId: (fd.get('parentId') as string) || undefined,
                  levels,
                },
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Name</label>
              <input
                name="name"
                required
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Strategic Thinking"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Category</label>
              <input
                name="category"
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Leadership"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Parent Competency ID (optional)
              </label>
              <input
                name="parentId"
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Leave empty for root competency"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Level Descriptions (JSON, optional)
              </label>
              <textarea
                name="levels"
                rows={4}
                spellCheck={false}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm font-mono text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={'[\n  { "level": 1, "description": "Beginner" },\n  { "level": 2, "description": "Intermediate" }\n]'}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAddCompetencyTo(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createCompetencyMutation.isPending}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {createCompetencyMutation.isPending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                Add Competency
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Questionnaires Tab
// ---------------------------------------------------------------------------

function QuestionnairesTab() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: questionnaires, isLoading, error } = useQuery({
    queryKey: ['admin-config', 'questionnaires'],
    queryFn: () => adminConfigApi.listQuestionnaires(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminConfigApi.createQuestionnaire(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config', 'questionnaires'] });
      setShowCreateModal(false);
      toast.success('Questionnaire created successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create questionnaire'),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={(error as Error).message || 'Failed to load questionnaires'} />;

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          {(questionnaires as Questionnaire[] | undefined)?.length ?? 0} questionnaire(s)
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Create Questionnaire
        </button>
      </div>

      {!questionnaires || (questionnaires as Questionnaire[]).length === 0 ? (
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title="No questionnaires"
          description="Create your first questionnaire to start gathering responses."
        />
      ) : (
        <div className="space-y-3">
          {(questionnaires as Questionnaire[]).map((q) => (
            <div
              key={q.id}
              className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 px-5 py-4 flex items-center gap-4"
            >
              <ClipboardDocumentListIcon className="h-8 w-8 text-primary-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-secondary-900 dark:text-white truncate">{q.name}</h3>
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', typeBadgeColor(q.type))}>
                    {q.type?.replace(/_/g, ' ')}
                  </span>
                </div>
                {q.description && (
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5 truncate">
                    {q.description}
                  </p>
                )}
                <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                  {q.questions?.length ?? 0} question(s)
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Active/Inactive toggle */}
                <span
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    q.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-secondary-100 text-secondary-500 dark:bg-secondary-700 dark:text-secondary-400',
                  )}
                >
                  {q.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Questionnaire Modal */}
      {showCreateModal && (
        <ModalShell title="Create Questionnaire" onClose={() => setShowCreateModal(false)} wide>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const questionsRaw = fd.get('questions') as string;
              let questions: any[];
              try {
                questions = JSON.parse(questionsRaw);
                if (!Array.isArray(questions)) throw new Error('Questions must be an array');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Invalid JSON for questions');
                return;
              }
              createMutation.mutate({
                name: fd.get('name') as string,
                description: (fd.get('description') as string) || undefined,
                type: fd.get('type') as string,
                isActive: (fd.get('isActive') as string) === 'on',
                questions,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Name</label>
              <input
                name="name"
                required
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="360 Feedback Questionnaire"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Type</label>
              <select
                name="type"
                required
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="SELF_ASSESSMENT">Self Assessment</option>
                <option value="PEER_REVIEW">Peer Review</option>
                <option value="MANAGER_REVIEW">Manager Review</option>
                <option value="360_FEEDBACK">360 Feedback</option>
                <option value="SURVEY">Survey</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="h-4 w-4 text-primary-600 rounded border-secondary-300 dark:border-secondary-600"
              />
              <span className="text-sm text-secondary-700 dark:text-secondary-300">Active</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Questions (JSON)
              </label>
              <textarea
                name="questions"
                rows={8}
                spellCheck={false}
                defaultValue={JSON.stringify(
                  [
                    { text: 'How would you rate overall performance?', type: 'RATING', required: true },
                    { text: 'What are the key strengths?', type: 'TEXT', required: true },
                    {
                      text: 'Which area needs the most improvement?',
                      type: 'MULTIPLE_CHOICE',
                      required: false,
                      options: ['Communication', 'Technical Skills', 'Leadership', 'Teamwork'],
                    },
                  ],
                  null,
                  2,
                )}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm font-mono text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-secondary-400 dark:text-secondary-500">
                Array of objects with <code className="text-primary-600 dark:text-primary-400">text</code>,{' '}
                <code className="text-primary-600 dark:text-primary-400">type</code> (RATING, TEXT, MULTIPLE_CHOICE),{' '}
                <code className="text-primary-600 dark:text-primary-400">required</code>, and optional{' '}
                <code className="text-primary-600 dark:text-primary-400">options</code>
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {createMutation.isPending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                Create Questionnaire
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Configuration Page
// ---------------------------------------------------------------------------

const TABS: Array<{ key: ConfigTab; label: string; icon: React.ElementType }> = [
  { key: 'rating-scales', label: 'Rating Scales', icon: StarIcon },
  { key: 'templates', label: 'Review Templates', icon: DocumentTextIcon },
  { key: 'frameworks', label: 'Competency Frameworks', icon: AcademicCapIcon },
  { key: 'questionnaires', label: 'Questionnaires', icon: ClipboardDocumentListIcon },
];

export function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('rating-scales');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Configuration</h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Manage rating scales, review templates, competency frameworks, and questionnaires
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-secondary-400 dark:hover:text-secondary-200 dark:hover:border-secondary-600',
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'rating-scales' && <RatingScalesTab />}
        {activeTab === 'templates' && <ReviewTemplatesTab />}
        {activeTab === 'frameworks' && <CompetencyFrameworksTab />}
        {activeTab === 'questionnaires' && <QuestionnairesTab />}
      </div>
    </div>
  );
}
