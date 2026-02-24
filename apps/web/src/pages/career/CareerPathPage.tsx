import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon, ChevronRightIcon, AcademicCapIcon, ClockIcon,
  UserGroupIcon, ArrowTrendingUpIcon, CheckCircleIcon, BriefcaseIcon,
  FunnelIcon, XMarkIcon, RocketLaunchIcon, LightBulbIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { api, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { PageHeader } from '@/components/ui';

// ── Types ────────────────────────────────────────────────────────────────────

interface SkillProficiency { name: string; level: number; maxLevel: number }

interface CareerPosition {
  id: string; title: string; level: number; department: string;
  requiredSkills: string[]; avgTimeToReach: string; description?: string; isCurrent?: boolean;
}

interface CareerPathData {
  currentPosition: {
    title: string; level: number; department: string; tenure: string;
    skills: SkillProficiency[]; performanceScore: number;
  };
  previousRoles: CareerPosition[];
  nextRoles: CareerPosition[];
  lateralMoves: CareerPosition[];
}

interface GrowthRequirement {
  roleId: string;
  competencies: Array<{ name: string; current: number; required: number }>;
  skillGaps: string[];
  activities: Array<{ title: string; type: string; duration: string }>;
  estimatedTimeline: string;
  mentors: Array<{ name: string; role: string; avatarUrl?: string }>;
}

interface OrgRole {
  id: string; title: string; department: string; levelRange: string;
  description: string; requiredSkills: string[];
}

interface CareerGoal {
  id: string; targetRole: string; targetDate: string; progress: number;
  milestones: Array<{ label: string; completed: boolean }>;
}

// ── Constants & Helpers ──────────────────────────────────────────────────────

const LEVEL_LABELS: Record<number, string> = {
  1: 'Junior', 2: 'Mid-Level', 3: 'Senior', 4: 'Staff', 5: 'Principal', 6: 'Director', 7: 'VP',
};

function perfBadgeFor(score: number) {
  if (score >= 4.5) return { label: 'Exceptional', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
  if (score >= 3.5) return { label: 'Exceeds', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
  if (score >= 2.5) return { label: 'Meets', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' };
  return { label: 'Developing', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
}

function fmtDate(d: string) { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); } catch { return d; } }

function SkillBar({ name, level, maxLevel }: SkillProficiency) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-secondary-700 dark:text-secondary-300 w-28 break-words">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary-200 dark:bg-secondary-700">
        <div className="h-2 rounded-full bg-primary-600 dark:bg-primary-500 transition-all duration-500" style={{ width: `${Math.round((level / maxLevel) * 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400 w-10 text-right">{level}/{maxLevel}</span>
    </div>
  );
}

function SkillTags({ skills, max = 4 }: { skills: string[]; max?: number }) {
  return (
    <div className="flex flex-wrap gap-1">
      {skills.slice(0, max).map((s) => (
        <span key={s} className="bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 rounded-full px-2 py-0.5 text-xs">{s}</span>
      ))}
      {skills.length > max && <span className="text-xs text-secondary-400 py-0.5">+{skills.length - max}</span>}
    </div>
  );
}

function CareerNode({ position: p, isSelected, onClick }: { position: CareerPosition; isSelected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={clsx(
      'w-full text-left rounded-xl border p-4 transition-all duration-200',
      p.isCurrent ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-[0_0_16px_rgba(59,130,246,0.15)] dark:shadow-[0_0_16px_rgba(96,165,250,0.2)]'
        : isSelected ? 'border-primary-300 dark:border-primary-600 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl shadow-md ring-2 ring-primary-200 dark:ring-primary-800'
        : 'border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700',
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-secondary-900 dark:text-white leading-tight">{p.title}</h4>
        {p.isCurrent && <span className="shrink-0 px-1.5 py-0.5 rounded text-2xs font-bold tracking-wider bg-primary-600 text-white">Current</span>}
      </div>
      <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-2">
        Level {p.level} {LEVEL_LABELS[p.level] ? `(${LEVEL_LABELS[p.level]})` : ''} &middot; {p.department}
      </p>
      <SkillTags skills={p.requiredSkills} />
      <div className="flex items-center gap-1 text-xs text-secondary-400 dark:text-secondary-500 mt-2">
        <ClockIcon className="h-3.5 w-3.5" /><span>{p.avgTimeToReach}</span>
      </div>
    </button>
  );
}

function CompetencyBar({ name, current, required }: { name: string; current: number; required: number }) {
  const max = Math.max(required, 5);
  const gap = required - current;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary-700 dark:text-secondary-300">{name}</span>
        <span className={clsx('text-xs font-medium', gap > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400')}>
          {gap > 0 ? `Gap: ${(gap ?? 0).toFixed(1)}` : 'Met'}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-secondary-200 dark:bg-secondary-700">
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary-500 dark:bg-primary-400 transition-all duration-500" style={{ width: `${Math.round((current / max) * 100)}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-red-500 dark:bg-red-400" style={{ left: `${Math.round((required / max) * 100)}%` }} title={`Required: ${required}`} />
      </div>
      <div className="flex justify-between text-2xs text-secondary-400 dark:text-secondary-500">
        <span>Current: {current}</span><span>Required: {required}</span>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-10"><div className="glass-spinner" /></div>;
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CareerPathPage() {
  const user = useAuthStore((s) => s.user);
  const [selectedNextRole, setSelectedNextRole] = useState<string | null>(null);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [selectedCatalogRole, setSelectedCatalogRole] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'path' | 'explorer' | 'goals'>('path');

  const { data: cp, isLoading: pathLoading } = useQuery({
    queryKey: ['career-path', user?.id],
    queryFn: () => api.get<CareerPathData>(`/career/path/${user?.id}`),
    enabled: !!user?.id,
  });

  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ['career-growth', selectedNextRole],
    queryFn: () => api.get<GrowthRequirement>(`/career/growth-requirements/${selectedNextRole}`),
    enabled: !!selectedNextRole,
  });

  const { data: orgRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['career-org-roles'],
    queryFn: () => api.get<OrgRole[]>('/career/roles'),
    enabled: activeSection === 'explorer',
  });

  const { data: careerGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ['career-goals', user?.id],
    queryFn: () => api.get<CareerGoal[]>(`/career/goals/${user?.id}`),
    enabled: activeSection === 'goals',
  });

  useQuery({ queryKey: ['departments'], queryFn: () => usersApi.listDepartments(), enabled: activeSection === 'explorer' });

  const filteredRoles = useMemo(() => {
    if (!orgRoles) return [];
    return orgRoles.filter((r) => {
      const q = roleSearchQuery.toLowerCase();
      const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.department.toLowerCase().includes(q) || r.requiredSkills.some((s) => s.toLowerCase().includes(q));
      return matchesSearch && (!deptFilter || r.department === deptFilter) && (!levelFilter || r.levelRange === levelFilter);
    });
  }, [orgRoles, roleSearchQuery, deptFilter, levelFilter]);

  const uniqueDepts = useMemo(() => orgRoles ? [...new Set(orgRoles.map((r) => r.department))].sort() : [], [orgRoles]);
  const uniqueLevels = useMemo(() => orgRoles ? [...new Set(orgRoles.map((r) => r.levelRange))].sort() : [], [orgRoles]);

  const perfBadge = cp ? perfBadgeFor(cp.currentPosition.performanceScore) : null;
  const toggleRole = (id: string) => setSelectedNextRole((prev) => (prev === id ? null : id));
  const sectionTabs = [
    { id: 'path' as const, label: 'Career Path', icon: ArrowTrendingUpIcon },
    { id: 'explorer' as const, label: 'Role Explorer', icon: BriefcaseIcon },
    { id: 'goals' as const, label: 'My Goals', icon: RocketLaunchIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Career Pathways"
        subtitle="Explore career growth opportunities and plan your progression"
      />

      {/* Current Position Card */}
      {pathLoading ? <Spinner /> : cp ? (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">{cp.currentPosition.title}</h2>
                {perfBadge && <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', perfBadge.color)}>{perfBadge.label} ({(cp.currentPosition.performanceScore ?? 0).toFixed(1)})</span>}
              </div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
                Level {cp.currentPosition.level}{LEVEL_LABELS[cp.currentPosition.level] ? ` (${LEVEL_LABELS[cp.currentPosition.level]})` : ''} &middot; {cp.currentPosition.department} &middot; {cp.currentPosition.tenure} tenure
              </p>
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold tracking-wider text-secondary-400 dark:text-secondary-500">Top Skills</h3>
                {cp.currentPosition.skills.slice(0, 5).map((s) => <SkillBar key={s.name} {...s} />)}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-secondary-200 dark:text-secondary-700" />
                  <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * (1 - cp.currentPosition.performanceScore / 5)}
                    strokeLinecap="round" className="text-primary-600 dark:text-primary-400 transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-secondary-900 dark:text-white">{(cp.currentPosition.performanceScore ?? 0).toFixed(1)}</span>
                </div>
              </div>
              <span className="text-xs text-secondary-500 dark:text-secondary-400">Performance Score</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] text-center py-12">
          <BriefcaseIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">Career path data not available</p>
        </div>
      )}

      {/* Section Tabs */}
      <div className="border-b border-secondary-200/60 dark:border-white/[0.06]">
        <nav className="flex gap-6" aria-label="Career sections">
          {sectionTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setActiveSection(id); setSelectedNextRole(null); setSelectedCatalogRole(null); }}
              className={clsx('flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors',
                activeSection === id ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                  : 'border-transparent text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300')}>
              <Icon className="h-5 w-5" />{label}
            </button>
          ))}
        </nav>
      </div>

      {/* Career Path Visualization */}
      {activeSection === 'path' && cp && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Previous Roles */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wider text-secondary-400 dark:text-secondary-500 flex items-center gap-2">
                <ClockIcon className="h-4 w-4" /> Previous Roles
              </h3>
              {cp.previousRoles.length === 0
                ? <p className="text-sm text-secondary-400 dark:text-secondary-500 italic py-4">No previous roles recorded</p>
                : cp.previousRoles.map((r) => (
                    <div key={r.id} className="relative">
                      <CareerNode position={r} isSelected={false} onClick={() => {}} />
                      <div className="hidden lg:block absolute top-1/2 -right-3 w-3 h-px bg-secondary-300 dark:bg-secondary-600" />
                    </div>
                  ))}
            </div>
            {/* Current Role */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-2">
                <StarSolidIcon className="h-4 w-4" /> Current Role
              </h3>
              <CareerNode position={{ id: 'current', title: cp.currentPosition.title, level: cp.currentPosition.level, department: cp.currentPosition.department, requiredSkills: cp.currentPosition.skills.map((s) => s.name), avgTimeToReach: cp.currentPosition.tenure, isCurrent: true }} isSelected={false} onClick={() => {}} />
              {cp.lateralMoves.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-semibold tracking-wider text-secondary-400 dark:text-secondary-500">Lateral Moves</h4>
                  {cp.lateralMoves.map((r) => <CareerNode key={r.id} position={r} isSelected={selectedNextRole === r.id} onClick={() => toggleRole(r.id)} />)}
                </div>
              )}
            </div>
            {/* Next Roles */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wider text-secondary-400 dark:text-secondary-500 flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-4 w-4" /> Next Roles
              </h3>
              {cp.nextRoles.length === 0
                ? <p className="text-sm text-secondary-400 dark:text-secondary-500 italic py-4">No next roles identified</p>
                : cp.nextRoles.map((r) => (
                    <div key={r.id} className="relative">
                      <div className="hidden lg:block absolute top-1/2 -left-3 w-3 h-px bg-secondary-300 dark:bg-secondary-600" />
                      <CareerNode position={r} isSelected={selectedNextRole === r.id} onClick={() => toggleRole(r.id)} />
                    </div>
                  ))}
            </div>
          </div>

          {/* Growth Requirements Panel */}
          {selectedNextRole && (
            <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-secondary-200/60 dark:border-white/[0.06] flex items-center justify-between">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Growth Requirements</h3>
                <button onClick={() => setSelectedNextRole(null)} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                  <XMarkIcon className="h-5 w-5 text-secondary-500 dark:text-secondary-400" />
                </button>
              </div>
              {growthLoading ? <Spinner /> : growthData ? (
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-3 flex items-center gap-2"><ChevronRightIcon className="h-4 w-4" /> Competency Comparison</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {growthData.competencies.map((c) => <CompetencyBar key={c.name} {...c} />)}
                    </div>
                  </div>
                  {growthData.skillGaps.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-3 flex items-center gap-2"><LightBulbIcon className="h-4 w-4" /> Skills Gap</h4>
                      <div className="flex flex-wrap gap-2">
                        {growthData.skillGaps.map((s) => <span key={s} className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full px-3 py-1 text-xs font-medium">{s}</span>)}
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-3 flex items-center gap-2"><AcademicCapIcon className="h-4 w-4" /> Recommended Activities</h4>
                    <div className="space-y-2">
                      {growthData.activities.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50">
                          <AcademicCapIcon className="h-5 w-5 text-primary-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-secondary-900 dark:text-white">{a.title}</p>
                            <p className="text-xs text-secondary-500 dark:text-secondary-400">{a.type} &middot; {a.duration}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                      <div className="flex items-center gap-2 mb-2">
                        <ClockIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        <h4 className="text-sm font-semibold text-primary-700 dark:text-primary-300">Estimated Timeline</h4>
                      </div>
                      <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">{growthData.estimatedTimeline}</p>
                    </div>
                    {growthData.mentors.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-3 flex items-center gap-2"><UserGroupIcon className="h-4 w-4" /> Mentorship</h4>
                        <div className="space-y-2">
                          {growthData.mentors.map((m, i) => (
                            <div key={i} className="flex items-center gap-3">
                              {m.avatarUrl
                                ? <img src={m.avatarUrl} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
                                : <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">{m.name.split(' ').map((n) => n[0]).join('')}</div>}
                              <div>
                                <p className="text-sm font-medium text-secondary-900 dark:text-white">{m.name}</p>
                                <p className="text-xs text-secondary-500 dark:text-secondary-400">{m.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-2">
                    <button className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-5 py-2.5 text-sm font-medium inline-flex items-center gap-2 transition-colors">
                      <RocketLaunchIcon className="h-5 w-5" /> Create Development Plan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-secondary-500 dark:text-secondary-400">Growth requirement data is not available for this role.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Role Explorer */}
      {activeSection === 'explorer' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
              <input type="text" value={roleSearchQuery} onChange={(e) => setRoleSearchQuery(e.target.value)}
                placeholder="Search roles by title, department, or skill..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-secondary-400 shrink-0" />
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">All Departments</option>
                {uniqueDepts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
                className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                <option value="">All Levels</option>
                {uniqueLevels.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          {rolesLoading ? <Spinner /> : filteredRoles.length === 0 ? (
            <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] text-center py-12">
              <BriefcaseIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
              <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">No roles match your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoles.map((role) => (
                <button key={role.id} onClick={() => setSelectedCatalogRole(selectedCatalogRole === role.id ? null : role.id)}
                  className={clsx('text-left rounded-xl border p-4 transition-all duration-200',
                    selectedCatalogRole === role.id ? 'border-primary-300 dark:border-primary-600 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl ring-2 ring-primary-200 dark:ring-primary-800 shadow-md'
                      : 'border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700')}>
                  <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-1">{role.title}</h4>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-2">{role.department} &middot; {role.levelRange}</p>
                  <p className="text-xs text-secondary-600 dark:text-secondary-400 mb-3">{role.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {role.requiredSkills.slice(0, 5).map((s) => <span key={s} className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full px-2 py-0.5 text-xs">{s}</span>)}
                    {role.requiredSkills.length > 5 && <span className="text-xs text-secondary-400 py-0.5">+{role.requiredSkills.length - 5}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Career Goals */}
      {activeSection === 'goals' && (
        <div className="space-y-4">
          {goalsLoading ? <Spinner /> : !careerGoals || careerGoals.length === 0 ? (
            <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] text-center py-12">
              <RocketLaunchIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
              <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">No career goals yet</h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">Set career goals to track your progression toward target roles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {careerGoals.map((goal) => (
                <div key={goal.id} className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">{goal.targetRole}</h4>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400">Target: {fmtDate(goal.targetDate)}</p>
                    </div>
                    <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{goal.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary-200 dark:bg-secondary-700 mb-4">
                    <div className="h-2 rounded-full bg-primary-600 dark:bg-primary-500 transition-all duration-500" style={{ width: `${Math.min(goal.progress, 100)}%` }} />
                  </div>
                  <div className="space-y-2">
                    {goal.milestones.map((ms, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircleIcon className={clsx('h-4 w-4 shrink-0', ms.completed ? 'text-green-500 dark:text-green-400' : 'text-secondary-300 dark:text-secondary-600')} />
                        <span className={clsx('text-sm', ms.completed ? 'text-secondary-500 dark:text-secondary-400 line-through' : 'text-secondary-700 dark:text-secondary-300')}>{ms.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
