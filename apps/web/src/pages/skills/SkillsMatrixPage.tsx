import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StarIcon as StarSolid,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/solid';
import {
  StarIcon as StarOutline,
  AcademicCapIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { api } from '@/lib/api';
import { useAuthStore, hasRole } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SkillProgressEntry {
  date: string;
  rating: number;
  assessedBy?: string;
}

interface SkillAssessment {
  id: string;
  skillCategory: string;
  skillName: string;
  selfRating: number;
  managerRating: number;
  targetLevel: number;
  currentLevel: number;
  evidenceNotes?: string;
  assessmentDate: string;
  progressHistory: SkillProgressEntry[];
}

interface TeamMemberSkills {
  userId: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  avatarUrl?: string;
  categories: Record<string, number>;
}

interface SkillGap {
  skillName: string;
  category: string;
  avgRating: number;
  targetLevel: number;
  gap: number;
  employeesAffected: number;
}

interface HeatmapCell {
  departmentName: string;
  category: string;
  avgRating: number;
  count: number;
}

interface SkillCategory {
  id: string;
  name: string;
  description?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'MANAGER'];
const HR_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN'];
type TabId = 'my-skills' | 'team-skills' | 'skill-gaps';

// ─── Star Rating Component ──────────────────────────────────────────────────

function StarRating({
  value,
  max = 5,
  onChange,
  readonly = false,
  size = 'md',
}: {
  value: number;
  max?: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(i + 1)}
            className={clsx(
              'transition-colors',
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            )}
          >
            {filled ? (
              <StarSolid className={clsx(sizeClass, 'text-amber-400')} />
            ) : (
              <StarOutline
                className={clsx(
                  sizeClass,
                  'text-secondary-300 dark:text-secondary-600'
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Sparkline Component ────────────────────────────────────────────────────

function Sparkline({ data }: { data: SkillProgressEntry[] }) {
  if (!data || data.length < 2) return null;
  const max = 5;
  const width = 80;
  const height = 24;
  const points = data.slice(-8).map((d, i, arr) => {
    const x = (i / (arr.length - 1)) * width;
    const y = height - (d.rating / max) * height;
    return `${x},${y}`;
  });
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const trending = last.rating >= prev.rating;

  return (
    <div className="flex items-center gap-1.5">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={trending ? '#10b981' : '#f59e0b'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(' ')}
        />
      </svg>
      {trending ? (
        <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-amber-500 rotate-90" />
      )}
    </div>
  );
}

// ─── Gap Bar Component ──────────────────────────────────────────────────────

function GapIndicator({ gap }: { gap: number }) {
  const color =
    gap <= 0
      ? 'bg-emerald-500'
      : gap === 1
        ? 'bg-amber-400'
        : 'bg-red-500';
  const label =
    gap <= 0 ? 'On Target' : gap === 1 ? 'Minor Gap' : 'Critical Gap';
  const widthPct = gap <= 0 ? 100 : Math.max(10, 100 - gap * 20);

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', color)}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span
        className={clsx(
          'text-2xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap',
          gap <= 0
            ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40'
            : gap === 1
              ? 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40'
              : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40'
        )}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Heatmap Cell Color ─────────────────────────────────────────────────────

function heatmapColor(rating: number): string {
  if (rating >= 4.5) return 'bg-emerald-600 text-white';
  if (rating >= 3.5) return 'bg-emerald-400 text-white';
  if (rating >= 2.5) return 'bg-yellow-400 text-secondary-900';
  if (rating >= 1.5) return 'bg-orange-400 text-white';
  return 'bg-red-500 text-white';
}

// ─── Toast Notification ─────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div
        className={clsx(
          'flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border',
          type === 'success'
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/80 dark:border-emerald-700'
            : 'bg-red-50 border-red-200 dark:bg-red-900/80 dark:border-red-700'
        )}
      >
        {type === 'success' ? (
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
        )}
        <span
          className={clsx(
            'text-sm font-medium',
            type === 'success'
              ? 'text-emerald-800 dark:text-emerald-200'
              : 'text-red-800 dark:text-red-200'
          )}
        >
          {message}
        </span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export function SkillsMatrixPage() {
  usePageTitle('Skills Matrix');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const roles = user?.roles ?? [];
  const isManager = hasRole(roles, MANAGER_ROLES);
  const isHR = hasRole(roles, HR_ROLES);

  const [activeTab, setActiveTab] = useState<TabId>('my-skills');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<SkillAssessment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [teamAssessTarget, setTeamAssessTarget] = useState<string | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    skillCategory: '',
    skillName: '',
    currentLevel: 1,
    targetLevel: 3,
    selfRating: 1,
    evidenceNotes: '',
    assessmentDate: new Date().toISOString().split('T')[0],
  });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  // ── Toast helper ────────────────────────────────────────────────────────
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: mySkills, isLoading: loadingMySkills } = useQuery({
    queryKey: ['skills-matrix-user', user?.id],
    queryFn: () => api.get<SkillAssessment[]>(`/skills/matrix/user/${user!.id}`),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: teamSkills, isLoading: loadingTeam } = useQuery({
    queryKey: ['skills-matrix-team'],
    queryFn: () => api.get<TeamMemberSkills[]>('/skills/matrix/team'),
    enabled: isManager && activeTab === 'team-skills',
    staleTime: 30_000,
  });

  const { data: skillGaps } = useQuery({
    queryKey: ['skills-gaps'],
    queryFn: () => api.get<SkillGap[]>('/skills/gaps'),
    enabled: isHR && activeTab === 'skill-gaps',
    staleTime: 60_000,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['skills-heatmap'],
    queryFn: () => api.get<HeatmapCell[]>('/skills/heatmap'),
    enabled: isHR && activeTab === 'skill-gaps',
    staleTime: 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['skill-categories'],
    queryFn: () => api.get<SkillCategory[]>('/skills/categories'),
    staleTime: 120_000,
  });

  // ── Mutations ───────────────────────────────────────────────────────────
  const createAssessment = useMutation({
    mutationFn: (data: typeof formData & { userId?: string }) =>
      api.post('/skills/assessments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills-matrix-user'] });
      queryClient.invalidateQueries({ queryKey: ['skills-matrix-team'] });
      setShowAssessmentModal(false);
      setTeamAssessTarget(null);
      resetForm();
      showToast('Skill assessment saved successfully');
    },
    onError: (err: Error) => showToast(err.message || 'Failed to save assessment', 'error'),
  });

  const updateAssessment = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<typeof formData>) =>
      api.put(`/skills/assessments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills-matrix-user'] });
      queryClient.invalidateQueries({ queryKey: ['skills-matrix-team'] });
      setShowAssessmentModal(false);
      setEditingAssessment(null);
      resetForm();
      showToast('Assessment updated successfully');
    },
    onError: (err: Error) => showToast(err.message || 'Failed to update assessment', 'error'),
  });

  const requestAssessment = useMutation({
    mutationFn: (skillId: string) =>
      api.post('/skills/assessments/request', { skillAssessmentId: skillId }),
    onSuccess: () => showToast('Assessment request sent to your manager'),
    onError: (err: Error) => showToast(err.message || 'Failed to send request', 'error'),
  });

  const createCategory = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.post('/skills/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
      showToast('Skill category created');
    },
    onError: (err: Error) => showToast(err.message || 'Failed to create category', 'error'),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/skills/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
      showToast('Category deleted');
    },
    onError: (err: Error) => showToast(err.message || 'Failed to delete category', 'error'),
  });

  // ── Helpers ─────────────────────────────────────────────────────────────
  const resetForm = () =>
    setFormData({
      skillCategory: '',
      skillName: '',
      currentLevel: 1,
      targetLevel: 3,
      selfRating: 1,
      evidenceNotes: '',
      assessmentDate: new Date().toISOString().split('T')[0],
    });

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openEditModal = (skill: SkillAssessment) => {
    setEditingAssessment(skill);
    setFormData({
      skillCategory: skill.skillCategory,
      skillName: skill.skillName,
      currentLevel: skill.currentLevel,
      targetLevel: skill.targetLevel,
      selfRating: skill.selfRating,
      evidenceNotes: skill.evidenceNotes || '',
      assessmentDate: skill.assessmentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    setShowAssessmentModal(true);
  };

  const openTeamAssessModal = (userId: string) => {
    setTeamAssessTarget(userId);
    resetForm();
    setShowAssessmentModal(true);
  };

  const handleSubmitAssessment = () => {
    if (editingAssessment) {
      updateAssessment.mutate({ id: editingAssessment.id, ...formData });
    } else {
      createAssessment.mutate({
        ...formData,
        ...(teamAssessTarget ? { userId: teamAssessTarget } : {}),
      });
    }
  };

  const filteredSkills = (mySkills || []).filter(
    (s) =>
      !searchQuery ||
      s.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.skillCategory.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group skills by category for the grid
  const groupedSkills = filteredSkills.reduce<Record<string, SkillAssessment[]>>(
    (acc, skill) => {
      const cat = skill.skillCategory || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    },
    {}
  );

  // ── Skill Gaps derived data ─────────────────────────────────────────────
  const topGaps = (skillGaps || [])
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10);
  const maxGap = topGaps.length > 0 ? topGaps[0].gap : 1;

  // Heatmap: unique departments and categories
  const heatmapDepts = [...new Set((heatmapData || []).map((c) => c.departmentName))];
  const heatmapCats = [...new Set((heatmapData || []).map((c) => c.category))];
  const heatmapLookup = (heatmapData || []).reduce<Record<string, HeatmapCell>>(
    (acc, c) => {
      acc[`${c.departmentName}|${c.category}`] = c;
      return acc;
    },
    {}
  );

  // Org summary cards
  const totalSkillsTracked = (skillGaps || []).length;
  const avgSkillLevel =
    totalSkillsTracked > 0
      ? (skillGaps || []).reduce((s, g) => s + g.avgRating, 0) / totalSkillsTracked
      : 0;
  const criticalGaps = (skillGaps || []).filter((g) => g.gap >= 2).length;
  const improvementRate =
    totalSkillsTracked > 0
      ? Math.round(
          ((skillGaps || []).filter((g) => g.gap <= 0).length / totalSkillsTracked) * 100
        )
      : 0;

  // Team categories for heatmap columns
  const teamCategories = teamSkills
    ? [...new Set(teamSkills.flatMap((m) => Object.keys(m.categories)))]
    : [];

  // ── Tabs configuration ──────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; icon: typeof AcademicCapIcon; visible: boolean }[] = [
    { id: 'my-skills', label: 'My Skills', icon: AcademicCapIcon, visible: true },
    { id: 'team-skills', label: 'Team Skills', icon: UserGroupIcon, visible: isManager },
    { id: 'skill-gaps', label: 'Skill Gaps', icon: ChartBarIcon, visible: isHR },
  ];

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header — frosted glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl glass-banner p-6 shadow-lg frosted-noise">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br from-cyan-500/20 to-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-gradient-to-tr from-indigo-500/15 to-cyan-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Skills Matrix</h1>
            <p className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">
              Track, assess, and develop skills across your organization
            </p>
          </div>
          <button
            onClick={() => {
              setEditingAssessment(null);
              setTeamAssessTarget(null);
              resetForm();
              setShowAssessmentModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 dark:bg-white/10 hover:bg-primary-500/20 dark:hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium text-primary-700 dark:text-white transition-colors border border-primary-200/40 dark:border-white/15"
          >
            <PlusIcon className="w-4 h-4" />
            Add Assessment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl">
        {tabs
          .filter((t) => t.visible)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all',
                activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
      </div>

      {/* ═══════════════════ TAB 1: My Skills ═══════════════════ */}
      {activeTab === 'my-skills' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {loadingMySkills ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-secondary-500 dark:text-secondary-400 mt-3 text-sm">
                Loading your skills...
              </p>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700">
              <AcademicCapIcon className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
              <p className="text-secondary-600 dark:text-secondary-400 font-medium">
                No skill assessments yet
              </p>
              <p className="text-secondary-400 dark:text-secondary-500 text-sm mt-1">
                Add your first skill assessment to start building your skills profile.
              </p>
            </div>
          ) : (
            Object.entries(groupedSkills).map(([category, skills]) => (
              <div
                key={category}
                className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 overflow-hidden"
              >
                <div className="px-5 py-3 bg-secondary-50 dark:bg-secondary-800/80 border-b border-secondary-200 dark:border-secondary-700">
                  <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">
                    {category}
                  </h3>
                </div>
                <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
                  {skills.map((skill) => {
                    const gap =
                      skill.targetLevel -
                      Math.max(skill.selfRating, skill.managerRating);
                    const expanded = expandedRows.has(skill.id);

                    return (
                      <Fragment key={skill.id}>
                        <div
                          className="px-5 py-3 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors cursor-pointer"
                          onClick={() => toggleRow(skill.id)}
                        >
                          <div className="flex items-center gap-4">
                            {/* Expand toggle */}
                            <button className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300">
                              {expanded ? (
                                <ChevronUpIcon className="w-4 h-4" />
                              ) : (
                                <ChevronDownIcon className="w-4 h-4" />
                              )}
                            </button>

                            {/* Skill Name */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">
                                {skill.skillName}
                              </p>
                            </div>

                            {/* Self Rating */}
                            <div className="text-center">
                              <p className="text-2xs text-secondary-400 dark:text-secondary-500 mb-0.5">
                                Self
                              </p>
                              <StarRating value={skill.selfRating} size="sm" readonly />
                            </div>

                            {/* Manager Rating */}
                            <div className="text-center">
                              <p className="text-2xs text-secondary-400 dark:text-secondary-500 mb-0.5">
                                Manager
                              </p>
                              {skill.managerRating > 0 ? (
                                <StarRating
                                  value={skill.managerRating}
                                  size="sm"
                                  readonly
                                />
                              ) : (
                                <span className="text-xs text-secondary-400 italic">
                                  Pending
                                </span>
                              )}
                            </div>

                            {/* Target Level */}
                            <div className="text-center w-16">
                              <p className="text-2xs text-secondary-400 dark:text-secondary-500 mb-0.5">
                                Target
                              </p>
                              <span className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">
                                {skill.targetLevel}/5
                              </span>
                            </div>

                            {/* Gap Indicator */}
                            <GapIndicator gap={gap} />

                            {/* Sparkline */}
                            <Sparkline data={skill.progressHistory} />

                            {/* Actions */}
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => openEditModal(skill)}
                                className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                title="Edit assessment"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                              {skill.managerRating === 0 && (
                                <button
                                  onClick={() =>
                                    requestAssessment.mutate(skill.id)
                                  }
                                  className="p-1.5 rounded-lg text-secondary-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                                  title="Request manager assessment"
                                >
                                  <ClipboardDocumentCheckIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Detail */}
                        {expanded && (
                          <div className="px-5 py-4 bg-secondary-50/50 dark:bg-secondary-900/30 border-t border-secondary-100 dark:border-secondary-700">
                            <div className="ml-8 space-y-3">
                              {skill.evidenceNotes && (
                                <div>
                                  <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
                                    Evidence Notes
                                  </p>
                                  <p className="text-sm text-secondary-700 dark:text-secondary-300">
                                    {skill.evidenceNotes}
                                  </p>
                                </div>
                              )}
                              {skill.progressHistory &&
                                skill.progressHistory.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-2">
                                      Progress History
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {skill.progressHistory.map((entry, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs"
                                        >
                                          <span className="text-secondary-400">
                                            {new Date(
                                              entry.date
                                            ).toLocaleDateString()}
                                          </span>
                                          <StarRating
                                            value={entry.rating}
                                            size="sm"
                                            readonly
                                          />
                                          {entry.assessedBy && (
                                            <span className="text-secondary-500">
                                              by {entry.assessedBy}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════════════ TAB 2: Team Skills ═══════════════════ */}
      {activeTab === 'team-skills' && isManager && (
        <div className="space-y-6">
          {/* Team Skill Gap Summary */}
          {teamSkills && teamSkills.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {teamSkills.length}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  Team Members
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {teamCategories.length}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  Skill Categories
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {teamSkills.length > 0
                    ? (
                        teamSkills.reduce(
                          (s, m) =>
                            s +
                            Object.values(m.categories).reduce((a, b) => a + b, 0) /
                              (Object.values(m.categories).length || 1),
                          0
                        ) / teamSkills.length
                      ).toFixed(1)
                    : '0'}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  Average Rating
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {teamSkills.reduce(
                    (s, m) =>
                      s +
                      Object.values(m.categories).filter((v) => v < 3).length,
                    0
                  )}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  Below Target
                </p>
              </div>
            </div>
          )}

          {/* Heatmap Table */}
          {loadingTeam ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-secondary-500 dark:text-secondary-400 mt-3 text-sm">
                Loading team skills...
              </p>
            </div>
          ) : !teamSkills || teamSkills.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700">
              <UserGroupIcon className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
              <p className="text-secondary-600 dark:text-secondary-400 font-medium">
                No team skill data available
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-200 dark:border-secondary-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-secondary-500 dark:text-secondary-400 sticky left-0 bg-white dark:bg-secondary-800 z-10">
                      Team Member
                    </th>
                    {teamCategories.map((cat) => (
                      <th
                        key={cat}
                        className="text-center px-3 py-3 text-xs font-semibold text-secondary-500 dark:text-secondary-400 min-w-[90px]"
                      >
                        {cat}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 text-xs font-semibold text-secondary-500 dark:text-secondary-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                  {teamSkills.map((member) => (
                    <tr
                      key={member.userId}
                      className="hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 sticky left-0 bg-white dark:bg-secondary-800 z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
                            {member.firstName[0]}
                            {member.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-secondary-900 dark:text-white">
                              {member.firstName} {member.lastName}
                            </p>
                            {member.jobTitle && (
                              <p className="text-xs text-secondary-400">
                                {member.jobTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {teamCategories.map((cat) => {
                        const rating = member.categories[cat] || 0;
                        return (
                          <td key={cat} className="text-center px-3 py-3">
                            {rating > 0 ? (
                              <span
                                className={clsx(
                                  'inline-block px-3 py-1 rounded-lg text-xs font-bold min-w-[40px]',
                                  heatmapColor(rating)
                                )}
                              >
                                {(rating ?? 0).toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-secondary-300 dark:text-secondary-600 text-xs">
                                --
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-3">
                        <button
                          onClick={() => openTeamAssessModal(member.userId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                          Assess
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ TAB 3: Skill Gaps (HR Only) ═══════════════════ */}
      {activeTab === 'skill-gaps' && isHR && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Skills Tracked', value: totalSkillsTracked, color: 'text-primary-600 dark:text-primary-400' },
              { label: 'Average Skill Level', value: (avgSkillLevel ?? 0).toFixed(1), color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Critical Gaps', value: criticalGaps, color: 'text-red-600 dark:text-red-400' },
              { label: 'Improvement Rate', value: `${improvementRate}%`, color: 'text-violet-600 dark:text-violet-400' },
            ].map((card) => (
              <div
                key={card.label}
                className="p-5 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 text-center"
              >
                <p className={clsx('text-3xl font-bold', card.color)}>
                  {card.value}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  {card.label}
                </p>
              </div>
            ))}
          </div>

          {/* Top 10 Skill Gaps Bar Chart */}
          <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">
                Top 10 Skill Gaps
              </h3>
              {isHR && (
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Manage Categories
                </button>
              )}
            </div>
            {topGaps.length === 0 ? (
              <p className="text-center text-secondary-400 py-8 text-sm">
                No skill gap data available
              </p>
            ) : (
              <div className="space-y-3">
                {topGaps.map((gap) => (
                  <div key={`${gap.category}-${gap.skillName}`} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-secondary-900 dark:text-white">
                          {gap.skillName}
                        </span>
                        <span className="text-2xs text-secondary-400 px-1.5 py-0.5 bg-secondary-100 dark:bg-secondary-700 rounded">
                          {gap.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400">
                        <span>Average: {(gap.avgRating ?? 0).toFixed(1)}</span>
                        <span>Target: {gap.targetLevel}</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          Gap: {(gap.gap ?? 0).toFixed(1)}
                        </span>
                        <span>{gap.employeesAffected} affected</span>
                      </div>
                    </div>
                    <div className="h-4 bg-secondary-100 dark:bg-secondary-700 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          gap.gap >= 2
                            ? 'bg-gradient-to-r from-red-500 to-rose-400'
                            : gap.gap >= 1
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        )}
                        style={{
                          width: `${Math.min((gap.gap / maxGap) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department vs Skill Category Heatmap */}
          {heatmapDepts.length > 0 && heatmapCats.length > 0 && (
            <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6 overflow-x-auto">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-5">
                Department Skill Heatmap
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-200 dark:border-secondary-700">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-secondary-500 dark:text-secondary-400">
                      Department
                    </th>
                    {heatmapCats.map((cat) => (
                      <th
                        key={cat}
                        className="text-center px-2 py-2 text-xs font-semibold text-secondary-500 dark:text-secondary-400 min-w-[80px]"
                      >
                        {cat}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                  {heatmapDepts.map((dept) => (
                    <tr key={dept}>
                      <td className="px-3 py-2 text-sm font-medium text-secondary-900 dark:text-white">
                        {dept}
                      </td>
                      {heatmapCats.map((cat) => {
                        const cell = heatmapLookup[`${dept}|${cat}`];
                        return (
                          <td key={cat} className="text-center px-2 py-2">
                            {cell ? (
                              <span
                                className={clsx(
                                  'inline-block px-2.5 py-1 rounded text-xs font-bold min-w-[36px]',
                                  heatmapColor(cell.avgRating)
                                )}
                                title={`${cell.count} assessments`}
                              >
                                {(cell.avgRating ?? 0).toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-secondary-300 dark:text-secondary-600 text-xs">
                                --
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Legend */}
              <div className="flex items-center gap-3 mt-4 text-xs text-secondary-500">
                <span>Legend:</span>
                {[
                  { label: '1-1.5', cls: 'bg-red-500' },
                  { label: '1.5-2.5', cls: 'bg-orange-400' },
                  { label: '2.5-3.5', cls: 'bg-yellow-400' },
                  { label: '3.5-4.5', cls: 'bg-emerald-400' },
                  { label: '4.5-5', cls: 'bg-emerald-600' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className={clsx('w-3 h-3 rounded', l.cls)} />
                    <span>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ Add/Edit Assessment Modal ═══════════════════ */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                {editingAssessment
                  ? 'Edit Skill Assessment'
                  : teamAssessTarget
                    ? 'Assess Team Member'
                    : 'Add Skill Assessment'}
              </h2>
              <button
                onClick={() => {
                  setShowAssessmentModal(false);
                  setEditingAssessment(null);
                  setTeamAssessTarget(null);
                }}
                className="p-1 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Skill Category */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Skill Category
                </label>
                <select
                  value={formData.skillCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, skillCategory: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select category...</option>
                  {(categories || []).map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill Name */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={formData.skillName}
                  onChange={(e) =>
                    setFormData({ ...formData, skillName: e.target.value })
                  }
                  placeholder="e.g. React, Data Analysis, Project Management"
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Ratings Row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Current Level
                  </label>
                  <StarRating
                    value={formData.currentLevel}
                    onChange={(v) =>
                      setFormData({ ...formData, currentLevel: v })
                    }
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Target Level
                  </label>
                  <StarRating
                    value={formData.targetLevel}
                    onChange={(v) =>
                      setFormData({ ...formData, targetLevel: v })
                    }
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Self Rating
                  </label>
                  <StarRating
                    value={formData.selfRating}
                    onChange={(v) =>
                      setFormData({ ...formData, selfRating: v })
                    }
                    size="sm"
                  />
                </div>
              </div>

              {/* Assessment Date */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Assessment Date
                </label>
                <input
                  type="date"
                  value={formData.assessmentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, assessmentDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Evidence Notes */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Evidence Notes
                </label>
                <textarea
                  value={formData.evidenceNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, evidenceNotes: e.target.value })
                  }
                  rows={3}
                  placeholder="Describe evidence of skill proficiency, certifications, projects..."
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary-200 dark:border-secondary-700">
              <button
                onClick={() => {
                  setShowAssessmentModal(false);
                  setEditingAssessment(null);
                  setTeamAssessTarget(null);
                }}
                className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-700 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAssessment}
                disabled={
                  !formData.skillCategory ||
                  !formData.skillName ||
                  createAssessment.isPending ||
                  updateAssessment.isPending
                }
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createAssessment.isPending || updateAssessment.isPending
                  ? 'Saving...'
                  : editingAssessment
                    ? 'Update Assessment'
                    : 'Save Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ Skill Category Management Modal (HR) ═══════════════════ */}
      {showCategoryModal && isHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Manage Skill Categories
              </h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1 rounded-lg text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Create form */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  placeholder="Category name"
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => createCategory.mutate(categoryForm)}
                  disabled={!categoryForm.name || createCategory.isPending}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {createCategory.isPending ? 'Creating...' : 'Add Category'}
                </button>
              </div>

              {/* Existing categories list */}
              <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
                <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-3">
                  Existing Categories
                </p>
                {(categories || []).length === 0 ? (
                  <p className="text-sm text-secondary-400 text-center py-4">
                    No categories created yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(categories || []).map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between px-3 py-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-secondary-900 dark:text-white">
                            {cat.name}
                          </p>
                          {cat.description && (
                            <p className="text-xs text-secondary-400">
                              {cat.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteCategory.mutate(cat.id)}
                          className="p-1 text-secondary-400 hover:text-red-500 transition-colors"
                          title="Delete category"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
