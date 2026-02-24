import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  PencilSquareIcon,
  EyeIcon,
  CheckBadgeIcon,
  ArchiveBoxIcon,
  LinkIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ChatBubbleLeftEllipsisIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import { PageHeader } from '@/components/ui';

import {
  evidenceApi,
  usersApi,
  type Evidence,
  type CreateEvidenceInput,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ['ALL', 'PENDING', 'VERIFIED', 'ARCHIVED'] as const;
const TYPE_OPTIONS = ['ALL', 'DOCUMENT', 'CERTIFICATE', 'PROJECT', 'METRIC', 'TESTIMONIAL'] as const;
const PAGE_SIZE = 10;

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  VERIFIED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  ARCHIVED: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200',
};

const typeLabels: Record<string, string> = {
  DOCUMENT: 'Document',
  CERTIFICATE: 'Certificate',
  PROJECT: 'Project',
  METRIC: 'Metric',
  TESTIMONIAL: 'Testimonial',
};

const typeBadgeColors: Record<string, string> = {
  DOCUMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  CERTIFICATE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  PROJECT: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  METRIC: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  TESTIMONIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

const typeIcons: Record<string, React.ReactNode> = {
  DOCUMENT: <DocumentTextIcon className="h-4 w-4" />,
  CERTIFICATE: <AcademicCapIcon className="h-4 w-4" />,
  PROJECT: <BriefcaseIcon className="h-4 w-4" />,
  METRIC: <ChartBarIcon className="h-4 w-4" />,
  TESTIMONIAL: <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />,
};

type SortField = 'title' | 'type' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

// ── Mock Data (shown when API returns empty) ──
const MOCK_EVIDENCE: Partial<Evidence>[] = [
  {
    id: 'mock-ev1',
    title: 'Q4 Project Delivery Report',
    description: 'Comprehensive report on the successful delivery of the customer portal redesign project, including metrics on timeline adherence and quality outcomes.',
    type: 'DOCUMENT',
    source: 'Project Management Office',
    url: 'https://docs.company.com/q4-delivery-report',
    status: 'VERIFIED',
    userId: 'mock-u1',
    user: { id: 'mock-u1', firstName: 'Sanjay', lastName: 'N', email: 'sanjay@company.com' } as any,
    metadata: { projectName: 'Customer Portal v2', deliveredOn: '2025-12-15' },
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-01-15T14:30:00Z',
  },
  {
    id: 'mock-ev2',
    title: 'AWS Solutions Architect Certification',
    description: 'AWS Certified Solutions Architect - Professional certification earned after intensive preparation.',
    type: 'CERTIFICATE',
    source: 'Amazon Web Services',
    url: 'https://aws.amazon.com/certification/verify/ABC123',
    status: 'VERIFIED',
    userId: 'mock-u2',
    user: { id: 'mock-u2', firstName: 'Danish', lastName: 'A G', email: 'danish@company.com' } as any,
    metadata: { certificationId: 'SAP-C02', validUntil: '2029-01-10' },
    createdAt: '2026-01-08T10:00:00Z',
    updatedAt: '2026-01-12T11:00:00Z',
  },
  {
    id: 'mock-ev3',
    title: 'Mobile App Performance Optimization',
    description: 'Led initiative to reduce app load time by 40% and decrease crash rate from 2.1% to 0.3%.',
    type: 'PROJECT',
    source: 'Engineering Team',
    url: '',
    status: 'PENDING',
    userId: 'mock-u3',
    user: { id: 'mock-u3', firstName: 'Preethi', lastName: 'S', email: 'preethi@company.com' } as any,
    metadata: { loadTimeReduction: '40%', crashRateImprovement: '85%' },
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'mock-ev4',
    title: 'Customer Satisfaction Improvement Metrics',
    description: 'NPS score improved from 42 to 67 after implementing new support workflow. CSAT increased by 23%.',
    type: 'METRIC',
    source: 'Customer Success Platform',
    url: 'https://analytics.company.com/csat-report',
    status: 'VERIFIED',
    userId: 'mock-u4',
    user: { id: 'mock-u4', firstName: 'Prasina', lastName: 'Sathish A', email: 'prasina@company.com' } as any,
    metadata: { npsBefore: 42, npsAfter: 67, csatIncrease: '23%' },
    createdAt: '2026-01-20T15:00:00Z',
    updatedAt: '2026-01-22T09:00:00Z',
  },
  {
    id: 'mock-ev5',
    title: 'Cross-Team Collaboration Testimonial',
    description: 'Recognition from VP of Product for outstanding cross-functional collaboration during the Q4 launch.',
    type: 'TESTIMONIAL',
    source: 'Danish A G, Chief Technology Officer',
    url: '',
    status: 'PENDING',
    userId: 'mock-u1',
    user: { id: 'mock-u1', firstName: 'Sanjay', lastName: 'N', email: 'sanjay@company.com' } as any,
    metadata: { endorsedBy: 'Danish A G', endorserRole: 'Chief Technology Officer' },
    createdAt: '2026-02-10T11:00:00Z',
    updatedAt: '2026-02-10T11:00:00Z',
  },
  {
    id: 'mock-ev6',
    title: 'Security Audit Compliance Certificate',
    description: 'Successfully passed SOC 2 Type II audit with zero critical findings.',
    type: 'CERTIFICATE',
    source: 'InfoSec Department',
    url: 'https://compliance.company.com/soc2-audit',
    status: 'ARCHIVED',
    userId: 'mock-u2',
    user: { id: 'mock-u2', firstName: 'Danish', lastName: 'A G', email: 'danish@company.com' } as any,
    metadata: { auditType: 'SOC 2 Type II', findings: 0 },
    createdAt: '2025-11-05T13:00:00Z',
    updatedAt: '2025-12-01T16:00:00Z',
  },
  {
    id: 'mock-ev7',
    title: 'Team Mentorship Program Documentation',
    description: 'Created and led a 12-week mentorship program for 6 junior developers, resulting in 2 promotions.',
    type: 'DOCUMENT',
    source: 'L&D Department',
    url: '',
    status: 'PENDING',
    userId: 'mock-u3',
    user: { id: 'mock-u3', firstName: 'Preethi', lastName: 'S', email: 'preethi@company.com' } as any,
    metadata: { duration: '12 weeks', participants: 6, promotions: 2 },
    createdAt: '2026-02-15T08:30:00Z',
    updatedAt: '2026-02-15T08:30:00Z',
  },
  {
    id: 'mock-ev8',
    title: 'Revenue Impact Analysis - API Platform',
    description: 'The API platform generated $2.3M in new revenue through partner integrations in FY2025.',
    type: 'METRIC',
    source: 'Business Analytics',
    url: 'https://analytics.company.com/api-revenue',
    status: 'VERIFIED',
    userId: 'mock-u4',
    user: { id: 'mock-u4', firstName: 'Prasina', lastName: 'Sathish A', email: 'prasina@company.com' } as any,
    metadata: { revenue: '$2.3M', partners: 14, yoyGrowth: '156%' },
    createdAt: '2026-01-25T10:00:00Z',
    updatedAt: '2026-01-28T14:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortEvidence(items: Evidence[], field: SortField, dir: SortDir): Evidence[] {
  return [...items].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case 'title':
        cmp = (a.title ?? '').localeCompare(b.title ?? '');
        break;
      case 'type':
        cmp = (a.type ?? '').localeCompare(b.type ?? '');
        break;
      case 'status':
        cmp = (a.status ?? '').localeCompare(b.status ?? '');
        break;
      case 'createdAt':
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EvidencePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isHRAdmin =
    user?.roles?.includes('HR_ADMIN') ||
    user?.roles?.includes('ADMIN') ||
    user?.roles?.includes('SUPER_ADMIN');
  const isManager = isHRAdmin || user?.roles?.includes('MANAGER');

  // Filters & pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEvidence, setViewingEvidence] = useState<Evidence | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingEvidence, setLinkingEvidence] = useState<Evidence | null>(null);
  const [linkReviewId, setLinkReviewId] = useState('');

  // ---- Queries ----
  const { data: listResult, isLoading } = useQuery({
    queryKey: ['evidence-items', { page, status: statusFilter, type: typeFilter }],
    queryFn: () =>
      evidenceApi.list({
        page,
        limit: PAGE_SIZE,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
      }),
  });

  const { data: usersResult } = useQuery({
    queryKey: ['users-list-for-evidence'],
    queryFn: () => usersApi.list({ limit: 200, isActive: true }),
    enabled: showCreateModal,
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (data: CreateEvidenceInput) => evidenceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence-items'] });
      setShowCreateModal(false);
      setEditingEvidence(null);
      toast.success('Evidence created successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create evidence'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEvidenceInput> }) =>
      evidenceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence-items'] });
      setShowCreateModal(false);
      setEditingEvidence(null);
      toast.success('Evidence updated successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update evidence'),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => evidenceApi.verify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence-items'] });
      toast.success('Evidence verified');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to verify evidence'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => evidenceApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence-items'] });
      toast.success('Evidence archived');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to archive evidence'),
  });

  const linkToReviewMutation = useMutation({
    mutationFn: ({ evidenceId, reviewId }: { evidenceId: string; reviewId: string }) =>
      evidenceApi.linkToReview(evidenceId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence-items'] });
      setShowLinkModal(false);
      setLinkingEvidence(null);
      setLinkReviewId('');
      toast.success('Evidence linked to review');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to link evidence'),
  });

  // ---- Derived data ----
  const rawEvidenceItems = listResult?.data ?? [];
  const evidenceItems = rawEvidenceItems.length > 0 ? rawEvidenceItems : (MOCK_EVIDENCE as Evidence[]);
  const meta = rawEvidenceItems.length > 0
    ? (listResult?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
    : { total: MOCK_EVIDENCE.length, page: 1, limit: PAGE_SIZE, totalPages: 1 };

  const filteredEvidence = useMemo(() => {
    let result = evidenceItems;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => {
        const title = (e.title ?? '').toLowerCase();
        const source = (e.source ?? '').toLowerCase();
        const userName = e.user
          ? `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.toLowerCase()
          : '';
        return title.includes(q) || source.includes(q) || userName.includes(q);
      });
    }
    return sortEvidence(result, sortField, sortDir);
  }, [evidenceItems, search, sortField, sortDir]);

  // Summary counts
  const totalCount = meta.total;
  const pendingCount = evidenceItems.filter((e) => e.status === 'PENDING').length;
  const verifiedCount = evidenceItems.filter((e) => e.status === 'VERIFIED').length;
  const archivedCount = evidenceItems.filter((e) => e.status === 'ARCHIVED').length;

  // ---- Sort handler ----
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  // ---- Modal form state ----
  const [formState, setFormState] = useState<{
    title: string;
    description: string;
    type: string;
    source: string;
    url: string;
    metadata: string;
    userId: string;
  }>({
    title: '',
    description: '',
    type: 'DOCUMENT',
    source: '',
    url: '',
    metadata: '',
    userId: '',
  });

  const [employeeSearch, setEmployeeSearch] = useState('');

  const filteredUsers = useMemo(() => {
    const users = usersResult?.data ?? [];
    if (!employeeSearch.trim()) return users.slice(0, 20);
    const q = employeeSearch.toLowerCase();
    return users.filter((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)).slice(0, 20);
  }, [usersResult, employeeSearch]);

  const selectedUser = useMemo(
    () => (usersResult?.data ?? []).find((u) => u.id === formState.userId),
    [usersResult, formState.userId],
  );

  function openCreateModal() {
    setEditingEvidence(null);
    setFormState({
      title: '',
      description: '',
      type: 'DOCUMENT',
      source: '',
      url: '',
      metadata: '',
      userId: '',
    });
    setEmployeeSearch('');
    setShowCreateModal(true);
  }

  function openEditModal(e: Evidence) {
    setEditingEvidence(e);
    setFormState({
      title: e.title ?? '',
      description: e.description ?? '',
      type: e.type ?? 'DOCUMENT',
      source: e.source ?? '',
      url: e.url ?? '',
      metadata: e.metadata ? JSON.stringify(e.metadata, null, 2) : '',
      userId: e.userId ?? '',
    });
    setEmployeeSearch(
      e.user ? `${e.user.firstName} ${e.user.lastName}` : '',
    );
    setShowCreateModal(true);
  }

  function openViewModal(e: Evidence) {
    setViewingEvidence(e);
    setShowViewModal(true);
  }

  function openLinkModal(e: Evidence) {
    setLinkingEvidence(e);
    setLinkReviewId('');
    setShowLinkModal(true);
  }

  function handleSave() {
    if (!formState.title.trim() || !formState.source.trim()) {
      toast.error('Please fill all required fields (Title and Source)');
      return;
    }

    let parsedMetadata: Record<string, unknown> | undefined;
    if (formState.metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(formState.metadata);
      } catch {
        toast.error('Metadata must be valid JSON');
        return;
      }
    }

    const payload: CreateEvidenceInput = {
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      type: formState.type,
      source: formState.source.trim(),
      url: formState.url.trim() || undefined,
      metadata: parsedMetadata,
      userId: formState.userId || undefined,
    };

    if (editingEvidence) {
      updateMutation.mutate({ id: editingEvidence.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleLinkToReview() {
    if (!linkingEvidence || !linkReviewId.trim()) {
      toast.error('Please enter a Review ID');
      return;
    }
    linkToReviewMutation.mutate({
      evidenceId: linkingEvidence.id,
      reviewId: linkReviewId.trim(),
    });
  }

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <PageHeader
        title="Evidence Management"
        subtitle="Track, verify, and manage performance evidence and supporting documents"
      >
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          New Evidence
        </button>
      </PageHeader>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<ClipboardDocumentListIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          label="Total Evidence"
          value={totalCount}
          bgClass="bg-primary-50 dark:bg-primary-900/20"
        />
        <SummaryCard
          icon={<ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />}
          label="Pending Review"
          value={pendingCount}
          bgClass="bg-yellow-50 dark:bg-yellow-900/20"
        />
        <SummaryCard
          icon={<ShieldCheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />}
          label="Verified"
          value={verifiedCount}
          bgClass="bg-green-50 dark:bg-green-900/20"
        />
        <SummaryCard
          icon={<ArchiveBoxIcon className="h-6 w-6 text-secondary-600 dark:text-secondary-400" />}
          label="Archived"
          value={archivedCount}
          bgClass="bg-secondary-50 dark:bg-secondary-800/40"
        />
      </div>

      {/* ---- Status Filter Tabs ---- */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-700',
                )}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-secondary-200 dark:bg-secondary-700" />

          {/* Type filter + Search */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-secondary-400" />
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="input-field text-sm py-1.5"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t === 'ALL' ? 'All Types' : typeLabels[t] ?? t}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search by title, source, or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field text-sm py-1.5 pl-9 w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---- Evidence Table ---- */}
      <div className="card dark:bg-secondary-800 dark:border-secondary-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="glass-spinner" />
          </div>
        ) : filteredEvidence.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
            <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">
              No evidence items found
            </h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Get started by adding a new piece of evidence.
            </p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              <PlusIcon className="h-5 w-5 mr-2 inline" />
              New Evidence
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-100/60 dark:divide-white/[0.04]">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    <SortableHeader
                      label="Title"
                      field="title"
                      currentField={sortField}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Type"
                      field="type"
                      currentField={sortField}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                      Source
                    </th>
                    <SortableHeader
                      label="Status"
                      field="status"
                      currentField={sortField}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                      User
                    </th>
                    <SortableHeader
                      label="Created Date"
                      field="createdAt"
                      currentField={sortField}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                  {filteredEvidence.map((e) => {
                    const isExpanded = expandedRow === e.id;
                    return (
                      <TableRowGroup key={e.id}>
                        <tr
                          onClick={() => setExpandedRow(isExpanded ? null : e.id)}
                          className="cursor-pointer hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/40 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-secondary-400 dark:text-secondary-500">
                                {typeIcons[e.type] ?? <DocumentTextIcon className="h-4 w-4" />}
                              </span>
                              <div>
                                <div className="text-sm font-medium text-secondary-900 dark:text-white">
                                  {e.title}
                                </div>
                                {e.description && (
                                  <div className="text-xs text-secondary-500 dark:text-secondary-400 break-words max-w-[240px]">
                                    {e.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                typeBadgeColors[e.type] ?? 'bg-secondary-100 text-secondary-700',
                              )}
                            >
                              {typeLabels[e.type] ?? e.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">
                            {e.source || '--'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={clsx(
                                'px-2.5 py-0.5 rounded-full text-xs font-medium',
                                statusColors[e.status] ?? '',
                              )}
                            >
                              {e.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-secondary-900 dark:text-white">
                              {e.user
                                ? `${e.user.firstName} ${e.user.lastName}`
                                : '--'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">
                            {e.createdAt
                              ? format(new Date(e.createdAt), 'MMM d, yyyy')
                              : '--'}
                          </td>
                          <td className="px-4 py-3">
                            <div
                              className="flex items-center gap-1"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              <ActionBtn
                                icon={<EyeIcon className="h-4 w-4" />}
                                title="View"
                                onClick={() => openViewModal(e)}
                              />
                              {e.status === 'PENDING' && (
                                <>
                                  <ActionBtn
                                    icon={<PencilSquareIcon className="h-4 w-4" />}
                                    title="Edit"
                                    onClick={() => openEditModal(e)}
                                  />
                                  {isManager && (
                                    <ActionBtn
                                      icon={
                                        <CheckBadgeIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                      }
                                      title="Verify"
                                      onClick={() => verifyMutation.mutate(e.id)}
                                    />
                                  )}
                                </>
                              )}
                              {e.status !== 'ARCHIVED' && (
                                <ActionBtn
                                  icon={
                                    <ArchiveBoxIcon className="h-4 w-4 text-secondary-500 dark:text-secondary-400" />
                                  }
                                  title="Archive"
                                  onClick={() => archiveMutation.mutate(e.id)}
                                />
                              )}
                              {e.status === 'VERIFIED' && (
                                <ActionBtn
                                  icon={
                                    <LinkIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                  }
                                  title="Link to Review"
                                  onClick={() => openLinkModal(e)}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-secondary-50/50 dark:bg-secondary-900/30">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                                    Description
                                  </p>
                                  <p className="text-secondary-700 dark:text-secondary-400">
                                    {e.description || 'No description provided'}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                                    URL / Link
                                  </p>
                                  {e.url ? (
                                    <a
                                      href={e.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary-600 dark:text-primary-400 hover:underline break-all"
                                    >
                                      {e.url}
                                    </a>
                                  ) : (
                                    <p className="text-secondary-400 dark:text-secondary-500 italic">
                                      No URL attached
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                                    Metadata
                                  </p>
                                  {e.metadata && Object.keys(e.metadata).length > 0 ? (
                                    <pre className="text-xs text-secondary-700 dark:text-secondary-400 bg-secondary-100 dark:bg-secondary-900 rounded p-2 overflow-x-auto max-h-24">
                                      {JSON.stringify(e.metadata, null, 2)}
                                    </pre>
                                  ) : (
                                    <p className="text-secondary-400 dark:text-secondary-500 italic">
                                      No metadata
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </TableRowGroup>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-200/60 dark:border-white/[0.06]">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Showing {(meta.page - 1) * meta.limit + 1}
                {' '}-{' '}
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-secondary-500 dark:text-secondary-400">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  <button
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---- Create / Edit Modal ---- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200/60 dark:border-white/[0.06]">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                {editingEvidence ? 'Edit Evidence' : 'New Evidence'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingEvidence(null);
                }}
                className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700"
              >
                <XMarkIcon className="h-5 w-5 text-secondary-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(ev) =>
                    setFormState((s) => ({ ...s, title: ev.target.value }))
                  }
                  placeholder="e.g. Q4 Performance Report"
                  className="input-field text-sm w-full"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formState.description}
                  onChange={(ev) =>
                    setFormState((s) => ({ ...s, description: ev.target.value }))
                  }
                  placeholder="Describe the evidence and its relevance..."
                  className="input-field text-sm w-full resize-none"
                />
              </div>

              {/* Type + Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formState.type}
                    onChange={(ev) =>
                      setFormState((s) => ({ ...s, type: ev.target.value }))
                    }
                    className="input-field text-sm w-full"
                  >
                    {TYPE_OPTIONS.filter((t) => t !== 'ALL').map((t) => (
                      <option key={t} value={t}>
                        {typeLabels[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Source <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formState.source}
                    onChange={(ev) =>
                      setFormState((s) => ({ ...s, source: ev.target.value }))
                    }
                    placeholder="e.g. Jira, Google Drive"
                    className="input-field text-sm w-full"
                  />
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  URL (optional)
                </label>
                <input
                  type="url"
                  value={formState.url}
                  onChange={(ev) =>
                    setFormState((s) => ({ ...s, url: ev.target.value }))
                  }
                  placeholder="https://..."
                  className="input-field text-sm w-full"
                />
              </div>

              {/* User / Employee selector */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Assign to User (optional)
                </label>
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(ev) => setEmployeeSearch(ev.target.value)}
                  className="input-field text-sm w-full mb-1"
                />
                {employeeSearch && !formState.userId && (
                  <div className="border border-secondary-200 dark:border-secondary-600 rounded-lg max-h-32 overflow-y-auto bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setFormState((s) => ({ ...s, userId: u.id }));
                          setEmployeeSearch(`${u.firstName} ${u.lastName}`);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm text-secondary-900 dark:text-white"
                      >
                        {u.firstName} {u.lastName}{' '}
                        {u.jobTitle ? `- ${u.jobTitle}` : ''}
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                      Selected: {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <button
                      onClick={() => {
                        setFormState((s) => ({ ...s, userId: '' }));
                        setEmployeeSearch('');
                      }}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Metadata (optional, JSON)
                </label>
                <textarea
                  rows={3}
                  value={formState.metadata}
                  onChange={(ev) =>
                    setFormState((s) => ({ ...s, metadata: ev.target.value }))
                  }
                  placeholder='{"key": "value"}'
                  className="input-field text-sm w-full resize-none font-mono"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary-200/60 dark:border-white/[0.06]">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingEvidence(null);
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary text-sm"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingEvidence
                    ? 'Update Evidence'
                    : 'Create Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- View Detail Modal ---- */}
      {showViewModal && viewingEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200/60 dark:border-white/[0.06]">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Evidence Details
              </h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingEvidence(null);
                }}
                className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700"
              >
                <XMarkIcon className="h-5 w-5 text-secondary-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Title & Status */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                    {viewingEvidence.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={clsx(
                        'px-2.5 py-0.5 rounded-full text-xs font-medium',
                        typeBadgeColors[viewingEvidence.type] ?? 'bg-secondary-100 text-secondary-700',
                      )}
                    >
                      {typeLabels[viewingEvidence.type] ?? viewingEvidence.type}
                    </span>
                    <span
                      className={clsx(
                        'px-2.5 py-0.5 rounded-full text-xs font-medium',
                        statusColors[viewingEvidence.status] ?? '',
                      )}
                    >
                      {viewingEvidence.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail rows */}
              <DetailRow
                label="Description"
                value={viewingEvidence.description || 'No description provided'}
              />
              <DetailRow label="Source" value={viewingEvidence.source} />
              <DetailRow
                label="User"
                value={
                  viewingEvidence.user
                    ? `${viewingEvidence.user.firstName} ${viewingEvidence.user.lastName}`
                    : '--'
                }
              />
              <DetailRow
                label="Created"
                value={
                  viewingEvidence.createdAt
                    ? format(new Date(viewingEvidence.createdAt), 'MMMM d, yyyy h:mm a')
                    : '--'
                }
              />
              <DetailRow
                label="Last Updated"
                value={
                  viewingEvidence.updatedAt
                    ? format(new Date(viewingEvidence.updatedAt), 'MMMM d, yyyy h:mm a')
                    : '--'
                }
              />

              {/* URL */}
              {viewingEvidence.url && (
                <div>
                  <p className="text-sm font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                    URL
                  </p>
                  <a
                    href={viewingEvidence.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline break-all"
                  >
                    {viewingEvidence.url}
                  </a>
                </div>
              )}

              {/* Metadata */}
              {viewingEvidence.metadata &&
                Object.keys(viewingEvidence.metadata).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-secondary-600 dark:text-secondary-300 mb-1">
                      Metadata
                    </p>
                    <pre className="text-xs text-secondary-700 dark:text-secondary-400 bg-secondary-100 dark:bg-secondary-900 rounded-lg p-3 overflow-x-auto">
                      {JSON.stringify(viewingEvidence.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>

            {/* Modal footer actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-200/60 dark:border-white/[0.06]">
              <div className="flex gap-2">
                {viewingEvidence.status === 'PENDING' && isManager && (
                  <button
                    onClick={() => {
                      verifyMutation.mutate(viewingEvidence.id);
                      setShowViewModal(false);
                      setViewingEvidence(null);
                    }}
                    className="btn-primary text-sm flex items-center gap-1"
                  >
                    <CheckBadgeIcon className="h-4 w-4" />
                    Verify
                  </button>
                )}
                {viewingEvidence.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => {
                      archiveMutation.mutate(viewingEvidence.id);
                      setShowViewModal(false);
                      setViewingEvidence(null);
                    }}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <ArchiveBoxIcon className="h-4 w-4" />
                    Archive
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingEvidence(null);
                }}
                className="btn-secondary text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Link to Review Modal ---- */}
      {showLinkModal && linkingEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200/60 dark:border-white/[0.06]">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Link Evidence to Review
              </h2>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkingEvidence(null);
                  setLinkReviewId('');
                }}
                className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700"
              >
                <XMarkIcon className="h-5 w-5 text-secondary-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                  Linking <span className="font-semibold text-secondary-900 dark:text-white">{linkingEvidence.title}</span> to a performance review.
                </p>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Review ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={linkReviewId}
                  onChange={(ev) => setLinkReviewId(ev.target.value)}
                  placeholder="Enter the performance review ID..."
                  className="input-field text-sm w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary-200/60 dark:border-white/[0.06]">
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkingEvidence(null);
                  setLinkReviewId('');
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkToReview}
                disabled={linkToReviewMutation.isPending}
                className="btn-primary text-sm flex items-center gap-1"
              >
                <LinkIcon className="h-4 w-4" />
                {linkToReviewMutation.isPending ? 'Linking...' : 'Link Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  icon,
  label,
  value,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgClass: string;
}) {
  return (
    <div
      className={clsx(
        'card card-body dark:bg-secondary-800 dark:border-secondary-700 flex items-center gap-4',
        bgClass,
      )}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
          {label}
        </p>
        <p className="text-2xl font-bold text-secondary-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
    >
      {icon}
    </button>
  );
}

function TableRowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function SortableHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider cursor-pointer select-none hover:text-secondary-700 dark:hover:text-secondary-200 transition-colors"
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'asc' ? (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowsUpDownIcon className="h-3.5 w-3.5 opacity-30" />
        )}
      </div>
    </th>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-secondary-600 dark:text-secondary-300 mb-0.5">
        {label}
      </p>
      <p className="text-sm text-secondary-700 dark:text-secondary-400">{value}</p>
    </div>
  );
}
