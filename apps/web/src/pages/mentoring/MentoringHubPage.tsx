import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  UserGroupIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  BookOpenIcon,
  RocketLaunchIcon,
  ChatBubbleLeftEllipsisIcon,
  PauseCircleIcon,
  ClockIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { mentoringApi, type MentorMatch, type Mentorship, type LearningPathItem } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

// ── Tab definitions ──────────────────────────────────────────────────────────

const tabs = [
  { id: 'find', label: 'Find a Mentor', icon: SparklesIcon },
  { id: 'my', label: 'My Mentorships', icon: UserGroupIcon },
  { id: 'learning', label: 'Learning Path', icon: BookOpenIcon },
] as const;

type TabId = typeof tabs[number]['id'];

// ── Compatibility Score Ring ─────────────────────────────────────────────────

function CompatibilityBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-amber-500' : 'text-blue-500';
  const bg = score >= 80 ? 'bg-green-50 dark:bg-green-900/20' : score >= 60 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20';
  return (
    <div className={clsx('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold', bg, color)}>
      <StarIcon className="h-3.5 w-3.5" />
      {score}% match
    </div>
  );
}

// ── Mentor Match Card ────────────────────────────────────────────────────────

function MentorCard({ mentor, onRequest }: { mentor: MentorMatch; onRequest: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl p-5 hover:shadow-lg transition-all group">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-lg shadow-primary-500/20">
          {mentor.firstName[0]}{mentor.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white break-words">{mentor.firstName} {mentor.lastName}</h3>
            <CompatibilityBadge score={mentor.compatibilityScore} />
          </div>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{mentor.jobTitle || 'Team Member'}</p>
          {mentor.department && <p className="text-2xs text-secondary-400 dark:text-secondary-500">{mentor.department}</p>}
          <p className="text-2xs text-secondary-400 mt-1">{mentor.yearsExperience} years experience</p>
        </div>
      </div>

      {/* Skills */}
      <div className="mt-4 space-y-2">
        {mentor.sharedSkills.length > 0 && (
          <div>
            <p className="text-3xs font-semibold text-secondary-400 tracking-wider mb-1">Shared Skills</p>
            <div className="flex flex-wrap gap-1">
              {mentor.sharedSkills.slice(0, 4).map((s) => (
                <span key={s} className="text-2xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{s}</span>
              ))}
            </div>
          </div>
        )}
        {mentor.complementarySkills.length > 0 && (
          <div>
            <p className="text-3xs font-semibold text-secondary-400 tracking-wider mb-1">Can Teach You</p>
            <div className="flex flex-wrap gap-1">
              {mentor.complementarySkills.slice(0, 4).map((s) => (
                <span key={s} className="text-2xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => onRequest(mentor.id)}
        className="w-full mt-4 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
      >
        <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" />
        Request Mentorship
      </button>
    </div>
  );
}

// ── Mentorship relationship card ─────────────────────────────────────────────

function MentorshipCard({ mentorship }: { mentorship: Mentorship }) {
  const statusConfig: Record<string, { icon: typeof CheckCircleIcon; color: string; bg: string }> = {
    active: { icon: CheckCircleIcon, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
    completed: { icon: CheckCircleIcon, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    paused: { icon: PauseCircleIcon, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  };
  const cfg = statusConfig[mentorship.status] || statusConfig.active;
  const StatusIcon = cfg.icon;

  return (
    <div className="rounded-2xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
            {mentorship.mentor.firstName[0]}{mentorship.mentor.lastName[0]}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">
              {mentorship.mentor.firstName} {mentorship.mentor.lastName}
            </h4>
            <p className="text-xs text-secondary-500">{mentorship.mentor.jobTitle || 'Mentor'}</p>
          </div>
        </div>
        <div className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold', cfg.bg, cfg.color)}>
          <StatusIcon className="h-3 w-3" />
          {mentorship.status}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-3xs font-semibold text-secondary-400 tracking-wider mb-1.5">Focus Areas</p>
        <div className="flex flex-wrap gap-1.5">
          {mentorship.focusAreas.map((area) => (
            <span key={area} className="text-2xs px-2 py-0.5 rounded-full bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300">{area}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 text-2xs text-secondary-400">
        <ClockIcon className="h-3 w-3" />
        Started {new Date(mentorship.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  );
}

// ── Learning path item ───────────────────────────────────────────────────────

function LearningItem({ item }: { item: LearningPathItem }) {
  const typeIcons: Record<string, typeof BookOpenIcon> = {
    course: BookOpenIcon,
    project: RocketLaunchIcon,
    mentorship: UserGroupIcon,
    certification: AcademicCapIcon,
    book: BookOpenIcon,
  };
  const Icon = typeIcons[item.type] || BookOpenIcon;
  const statusColors = {
    not_started: 'bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400',
    in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl hover:shadow-md transition-shadow">
      <div className={clsx(
        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
        item.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary-100 dark:bg-primary-900/30'
      )}>
        <Icon className={clsx('h-5 w-5', item.status === 'completed' ? 'text-green-500' : 'text-primary-500')} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={clsx('text-sm font-medium', item.status === 'completed' ? 'text-secondary-400 line-through' : 'text-secondary-900 dark:text-white')}>{item.title}</h4>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-2xs text-secondary-400 capitalize">{item.type}</span>
          <span className="text-2xs text-secondary-400">{item.estimatedHours}h</span>
          <span className="text-2xs px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">{item.targetSkill}</span>
        </div>
      </div>
      <span className={clsx('text-3xs font-bold px-2 py-0.5 rounded-full', statusColors[item.status])}>
        {item.status.replace(/_/g, ' ')}
      </span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function MentoringHubPage() {
  usePageTitle('Mentoring Hub');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('find');

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['mentor-matches'],
    queryFn: () => mentoringApi.getMatches(),
    staleTime: 60_000,
  });

  const { data: mentorships, isLoading: mentorshipsLoading } = useQuery({
    queryKey: ['my-mentorships'],
    queryFn: () => mentoringApi.getMyMentorships(),
    staleTime: 60_000,
  });

  const { data: learningPath, isLoading: learningLoading } = useQuery({
    queryKey: ['learning-path'],
    queryFn: () => mentoringApi.getLearningPath(),
    staleTime: 60_000,
  });

  const requestMutation = useMutation({
    mutationFn: (mentorId: string) => mentoringApi.requestMentorship(mentorId, ['Leadership', 'Technical Growth']),
    onSuccess: () => {
      toast.success('Mentorship request sent!');
      queryClient.invalidateQueries({ queryKey: ['my-mentorships'] });
    },
    onError: () => toast.error('Failed to send request'),
  });

  const matchList: MentorMatch[] = matches || [];
  const mentorshipList: Mentorship[] = mentorships || [];
  const learningItems: LearningPathItem[] = learningPath || [];
  const completedLearning = learningItems.filter((l) => l.status === 'completed').length;
  const learningPct = learningItems.length > 0 ? Math.round((completedLearning / learningItems.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <PageHeader
        title="Mentoring Hub"
        subtitle="Find mentors, track mentorships, and follow personalized learning paths"
      />

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <SparklesIcon className="h-6 w-6 text-violet-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{matchList.length}</p>
            <p className="text-xs text-secondary-500">Available Mentors</p>
          </div>
        </div>
        <div className="rounded-2xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <UserGroupIcon className="h-6 w-6 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{mentorshipList.filter(m => m.status === 'active').length}</p>
            <p className="text-xs text-secondary-500">Active Mentorships</p>
            {mentorshipList.filter(m => m.status === 'active').length === 0 && (
              <button onClick={() => setActiveTab('find')} className="mt-1.5 text-2xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                Browse available mentors →
              </button>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <BookOpenIcon className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{learningPct}%</p>
            <p className="text-xs text-secondary-500">Learning Progress</p>
            {learningPct === 0 && (
              <button onClick={() => setActiveTab('learning')} className="mt-1.5 text-2xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                Start a learning path →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'find' && (
        <div>
          {matchesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl p-5 animate-pulse">
                  <div className="flex gap-4"><div className="w-14 h-14 rounded-full bg-secondary-200 dark:bg-secondary-700" /><div className="flex-1 space-y-2"><div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-2/3" /><div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" /></div></div>
                </div>
              ))}
            </div>
          ) : matchList.length === 0 ? (
            <div className="text-center py-16">
              <SparklesIcon className="h-16 w-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-500">No mentor matches yet</h3>
              <p className="text-sm text-secondary-400 mt-1">Complete your skills profile to get personalized mentor recommendations</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchList.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} onRequest={(id) => requestMutation.mutate(id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'my' && (
        <div>
          {mentorshipsLoading ? (
            <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />)}</div>
          ) : mentorshipList.length === 0 ? (
            <div className="text-center py-16">
              <UserGroupIcon className="h-16 w-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-500">No mentorships yet</h3>
              <p className="text-sm text-secondary-400 mt-1">Find a mentor and request a mentorship to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mentorshipList.map((m) => (
                <MentorshipCard key={m.id} mentorship={m} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'learning' && (
        <div>
          {/* Progress bar */}
          {learningItems.length > 0 && (
            <div className="rounded-2xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl p-5 mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Your Learning Journey</h3>
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{completedLearning}/{learningItems.length} completed</span>
              </div>
              <div className="h-2.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                  style={{ width: `${learningPct}%` }}
                />
              </div>
            </div>
          )}

          {learningLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />)}</div>
          ) : learningItems.length === 0 ? (
            <div className="text-center py-16">
              <BookOpenIcon className="h-16 w-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-500">No learning path yet</h3>
              <p className="text-sm text-secondary-400 mt-1">Start a mentorship or update your development plan to generate a learning path</p>
            </div>
          ) : (
            <div className="space-y-3">
              {learningItems.map((item) => (
                <LearningItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
