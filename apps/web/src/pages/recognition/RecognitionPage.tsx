import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackApi, usersApi, type Feedback, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TrophyIcon, StarIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

const AVATAR_COLORS = [
  'bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function UserAvatar({ user, size = 'md' }: { user: { firstName: string; lastName: string; avatarUrl?: string | null }; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white/20`} />;
  }

  return (
    <div className={`${sizeClasses[size]} ${getAvatarColor(user.firstName + user.lastName)} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white/10 shadow-sm`}>
      {initials}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function RecognitionPage() {
  usePageTitle('Recognition');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showGiveModal, setShowGiveModal] = useState(false);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Form state
  const [toUserId, setToUserId] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: wall, isLoading: wallLoading } = useQuery({
    queryKey: ['recognition-wall', page],
    queryFn: () => feedbackApi.getRecognitionWall({ page, limit: 20 }),
  });

  const { data: topRecognized } = useQuery({
    queryKey: ['top-recognized', period],
    queryFn: () => feedbackApi.getTopRecognized(period),
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members-recognition'],
    queryFn: () => usersApi.list({ limit: 100, isActive: true }),
    select: (d) => d.data.filter((u: User) => u.id !== user?.id),
  });

  const giveMutation = useMutation({
    mutationFn: () =>
      feedbackApi.create({
        toUserId,
        type: 'RECOGNITION',
        visibility: 'PUBLIC',
        content,
        isAnonymous: false,
        tags,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognition-wall'] });
      queryClient.invalidateQueries({ queryKey: ['top-recognized'] });
      setShowGiveModal(false);
      resetForm();
    },
  });

  function resetForm() {
    setToUserId('');
    setContent('');
    setTags([]);
    setTagInput('');
    setSearchTerm('');
  }

  const filteredUsers = teamMembers?.filter((u: User) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  const valueSuggestions = ['Teamwork', 'Innovation', 'Leadership', 'Customer Focus', 'Integrity', 'Excellence', 'Collaboration', 'Ownership'];

  return (
    <div className="space-y-6">
      {/* ── Premium Header ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/30 dark:border-amber-500/10 p-6 sm:p-8">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/80 to-rose-50/60 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/20" />
        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-400/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gradient-to-tr from-rose-400/15 to-amber-400/10 blur-3xl" />
        {/* Frost layer */}
        <div className="absolute inset-0 backdrop-blur-[1px]" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-white tracking-tight">Recognition Wall</h1>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">Celebrate your team's achievements and contributions</p>
            </div>
          </div>
          <button
            onClick={() => setShowGiveModal(true)}
            className="group relative flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #f97316, #ef4444)',
              boxShadow: '0 4px 20px rgba(249, 115, 22, 0.35), 0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
            <svg className="relative h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <span className="relative">Give Recognition</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Recognition Feed ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {wallLoading ? (
            <div className="flex justify-center py-16">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-amber-500 border-r-orange-400" />
                <div className="absolute inset-1.5 animate-spin rounded-full border-2 border-transparent border-b-rose-400 border-l-amber-400" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
              </div>
            </div>
          ) : !wall?.data?.length ? (
            /* ── Premium Empty State ── */
            <div className="relative overflow-hidden rounded-2xl border border-secondary-200/60 dark:border-secondary-700/40 bg-white/70 dark:bg-secondary-800/50 backdrop-blur-sm p-12 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-transparent to-orange-50/30 dark:from-amber-950/10 dark:via-transparent dark:to-orange-950/10" />
              <div className="relative z-10">
                <div className="relative mx-auto mb-5 h-20 w-20">
                  <div
                    className="absolute inset-0 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))',
                      border: '1px solid rgba(245,158,11,0.2)',
                      boxShadow: '0 0 30px rgba(245,158,11,0.1)',
                    }}
                  >
                    <svg className="h-9 w-9 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>
                  <span className="absolute -inset-3 rounded-3xl animate-pulse opacity-20 blur-md" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }} />
                </div>
                <h3 className="text-lg font-bold text-secondary-900 dark:text-white">No recognitions yet</h3>
                <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1.5 max-w-xs mx-auto">
                  Be the first to recognize a colleague's great work and start spreading appreciation!
                </p>
                <button
                  onClick={() => setShowGiveModal(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                    boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
                  }}
                >
                  <SparklesIcon className="h-4 w-4" />
                  Give Your First Recognition
                </button>
              </div>
            </div>
          ) : (
            <>
              {wall.data.map((item: Feedback) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-xl border border-secondary-200/60 dark:border-secondary-700/40 bg-white/80 dark:bg-secondary-800/60 backdrop-blur-sm p-5 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 dark:hover:shadow-amber-500/5 hover:border-amber-200/40 dark:hover:border-amber-500/15"
                >
                  {/* Subtle hover glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-50/0 via-amber-50/0 to-amber-50/0 group-hover:from-amber-50/30 group-hover:via-orange-50/10 group-hover:to-transparent dark:group-hover:from-amber-950/10 dark:group-hover:via-transparent dark:group-hover:to-transparent transition-all duration-500" />

                  <div className="relative z-10 flex items-start gap-4">
                    {/* Sender info */}
                    <div className="flex-shrink-0">
                      {item.fromUser ? (
                        <UserAvatar user={item.fromUser} size="md" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-secondary-300 dark:bg-secondary-600 flex items-center justify-center text-secondary-500 text-sm">?</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="font-semibold text-secondary-900 dark:text-white">
                          {item.fromUser ? `${item.fromUser.firstName} ${item.fromUser.lastName}` : 'Anonymous'}
                        </span>
                        <span className="text-secondary-400 dark:text-secondary-500">recognized</span>
                        <span className="font-semibold text-secondary-900 dark:text-white">
                          {item.toUser.firstName} {item.toUser.lastName}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-secondary-700 dark:text-secondary-300 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {item.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-700/30"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-3">{timeAgo(item.createdAt)}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div
                        className="rounded-xl p-2.5"
                        style={{
                          background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.08))',
                          border: '1px solid rgba(245,158,11,0.15)',
                        }}
                      >
                        <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {wall.meta && wall.meta.totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-xl border border-secondary-200/60 dark:border-white/[0.06] text-sm text-secondary-700 dark:text-secondary-300 disabled:opacity-40 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-all hover:shadow-sm"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-secondary-500 font-medium">
                    Page {page} of {wall.meta.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(wall.meta!.totalPages!, p + 1))}
                    disabled={page >= (wall.meta.totalPages ?? 1)}
                    className="px-4 py-2 rounded-xl border border-secondary-200/60 dark:border-white/[0.06] text-sm text-secondary-700 dark:text-secondary-300 disabled:opacity-40 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-all hover:shadow-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Sidebar — Leaderboard ─────────────────────────── */}
        <div className="space-y-5">
          {/* Top Recognized — Frosted Glass Card */}
          <div className="relative overflow-hidden rounded-2xl border border-secondary-200/60 dark:border-secondary-700/40 bg-white/80 dark:bg-secondary-800/60 backdrop-blur-sm p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-transparent to-transparent dark:from-amber-950/10 dark:via-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-md shadow-amber-500/20">
                    <TrophyIcon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-secondary-900 dark:text-white">Top Recognized</h3>
                </div>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value as any)}
                  className="text-xs border border-secondary-200 dark:border-secondary-600 rounded-lg px-2 py-1 bg-white/80 dark:bg-secondary-700/80 text-secondary-600 dark:text-secondary-300 backdrop-blur-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                >
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>
              </div>

              {topRecognized && topRecognized.length > 0 ? (
                <div className="space-y-2.5">
                  {topRecognized.map((entry: any, idx: number) => (
                    <div
                      key={entry.user.id}
                      className={`flex items-center gap-3 rounded-xl p-2.5 transition-all duration-200 ${
                        idx === 0
                          ? 'bg-gradient-to-r from-amber-100/80 to-amber-50/40 dark:from-amber-900/20 dark:to-amber-900/5 border border-amber-200/40 dark:border-amber-700/20'
                          : 'hover:bg-secondary-50/80 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex-shrink-0 w-7 flex items-center justify-center">
                        {idx === 0 ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md shadow-amber-400/30">
                            <TrophyIcon className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : idx === 1 ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600 shadow-sm">
                            <StarIcon className="h-3 w-3 text-white" />
                          </div>
                        ) : idx === 2 ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-700 shadow-sm">
                            <SparklesIcon className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-secondary-400 pl-1">#{idx + 1}</span>
                        )}
                      </div>
                      <UserAvatar user={entry.user} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                          {entry.user.firstName} {entry.user.lastName}
                        </p>
                        {entry.user.jobTitle && (
                          <p className="text-xs text-secondary-400 truncate">{entry.user.jobTitle}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{
                            background: idx === 0
                              ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                              : 'rgba(245,158,11,0.1)',
                            color: idx === 0 ? 'white' : undefined,
                            boxShadow: idx === 0 ? '0 2px 8px rgba(245,158,11,0.3)' : undefined,
                          }}
                        >
                          <span className={idx === 0 ? '' : 'text-amber-600 dark:text-amber-400'}>{entry.count}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="mx-auto h-10 w-10 rounded-xl bg-secondary-100 dark:bg-secondary-700 flex items-center justify-center mb-2">
                    <TrophyIcon className="h-5 w-5 text-secondary-400" />
                  </div>
                  <p className="text-sm text-secondary-400">No recognitions this period</p>
                </div>
              )}
            </div>
          </div>

          {/* Recognition Impact — Premium Gradient Card */}
          <div className="relative overflow-hidden rounded-2xl p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_20%_20%,rgba(255,255,255,0.15),transparent)]" />
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="h-5 w-5 text-white/80" />
                <h3 className="text-base font-bold text-white">Recognition Impact</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-white tracking-tight">{wall?.meta?.total ?? 0}</span>
                <span className="text-sm text-white/70 font-medium">total recognitions</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                shared across the organization. Keep the appreciation flowing!
              </p>
            </div>
          </div>

          {/* Value Categories — Frosted Glass */}
          <div className="relative overflow-hidden rounded-2xl border border-secondary-200/60 dark:border-secondary-700/40 bg-white/80 dark:bg-secondary-800/60 backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-secondary-900 dark:text-white">Popular Values</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {valueSuggestions.map(v => (
                <span
                  key={v}
                  className="rounded-full px-3 py-1 text-xs font-medium bg-secondary-100/80 dark:bg-white/[0.06] text-secondary-600 dark:text-secondary-300 border border-secondary-200/50 dark:border-white/[0.06] transition-all hover:bg-secondary-200/80 dark:hover:bg-white/10 cursor-default"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Give Recognition Modal — Premium Glassmorphism ── */}
      {showGiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowGiveModal(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-lg rounded-2xl border border-secondary-200/60 dark:border-secondary-700/40 bg-white/95 dark:bg-secondary-800/95 backdrop-blur-xl shadow-2xl"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 40px rgba(245,158,11,0.05)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-secondary-900 dark:text-white">Give Recognition</h2>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">Celebrate someone's great work</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGiveModal(false)}
                  className="rounded-xl p-2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100/80 dark:hover:bg-white/5 transition-all"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={e => { e.preventDefault(); giveMutation.mutate(); }} className="space-y-4">
                {/* Person selector */}
                <div>
                  <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-1.5">Who do you want to recognize?</label>
                  <input
                    type="text"
                    placeholder="Search for a colleague..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-shadow"
                  />
                  {searchTerm && !toUserId && filteredUsers.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-700 shadow-lg">
                      {filteredUsers.slice(0, 8).map((u: User) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setToUserId(u.id);
                            setSearchTerm(`${u.firstName} ${u.lastName}`);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/10 text-left transition-colors"
                        >
                          <UserAvatar user={u} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-secondary-900 dark:text-white">{u.firstName} {u.lastName}</p>
                            {u.jobTitle && <p className="text-xs text-secondary-400">{u.jobTitle}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {toUserId && (
                    <button type="button" onClick={() => { setToUserId(''); setSearchTerm(''); }} className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 mt-1.5 font-medium">
                      Change person
                    </button>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-1.5">Your message</label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Share what this person did that was awesome..."
                    rows={4}
                    className="w-full rounded-xl border border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-shadow resize-none"
                    required
                    minLength={3}
                  />
                </div>

                {/* Value tags */}
                <div>
                  <label className="block text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-1.5">Values (optional)</label>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {tags.map(tag => (
                        <span key={tag} className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1 border border-amber-200/50 dark:border-amber-700/30">
                          {tag}
                          <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-amber-900 dark:hover:text-amber-200 transition-colors">
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {valueSuggestions.filter(v => !tags.includes(v)).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setTags([...tags, v])}
                        className="bg-secondary-100/80 dark:bg-white/[0.06] text-secondary-500 dark:text-secondary-400 rounded-full px-2.5 py-0.5 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-300 transition-all border border-transparent hover:border-amber-200/50 dark:hover:border-amber-700/30"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGiveModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-secondary-200 dark:border-secondary-600 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!toUserId || !content.trim() || giveMutation.isPending}
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: !toUserId || !content.trim() ? '#d1d5db' : 'linear-gradient(135deg, #f59e0b, #f97316)',
                      boxShadow: toUserId && content.trim() ? '0 4px 16px rgba(249,115,22,0.3)' : 'none',
                    }}
                  >
                    {giveMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    ) : (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    )}
                    Send Recognition
                  </button>
                </div>
                {giveMutation.isError && (
                  <p className="text-red-500 text-sm mt-1">{(giveMutation.error as Error).message}</p>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
