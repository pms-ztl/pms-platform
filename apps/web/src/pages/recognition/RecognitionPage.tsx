import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackApi, usersApi, type Feedback, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TrophyIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
    return <img src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} className={`${sizeClasses[size]} rounded-full object-cover`} />;
  }

  return (
    <div className={`${sizeClasses[size]} ${getAvatarColor(user.firstName + user.lastName)} rounded-full flex items-center justify-center text-white font-semibold`}>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Recognition Wall</h1>
          <p className="text-secondary-500 dark:text-secondary-400 mt-1">Celebrate your team's achievements and contributions</p>
        </div>
        <button
          onClick={() => setShowGiveModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-5 py-2.5 font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          Give Recognition
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Recognition Feed */}
        <div className="lg:col-span-2 space-y-4">
          {wallLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : !wall?.data?.length ? (
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-12 text-center">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">No recognitions yet</h3>
              <p className="text-secondary-500 dark:text-secondary-400 mt-2">Be the first to recognize a colleague's great work!</p>
            </div>
          ) : (
            <>
              {wall.data.map((item: Feedback) => (
                <div key={item.id} className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
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
                        <span className="text-secondary-400">recognized</span>
                        <span className="font-semibold text-secondary-900 dark:text-white">
                          {item.toUser.firstName} {item.toUser.lastName}
                        </span>
                      </div>
                      <p className="mt-2 text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">{item.content}</p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {item.tags.map((tag: string) => (
                            <span key={tag} className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-0.5 text-xs font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-3">{timeAgo(item.createdAt)}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2">
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
                    className="px-3 py-1.5 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 disabled:opacity-50 hover:bg-secondary-50 dark:hover:bg-secondary-700"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-secondary-500">
                    Page {page} of {wall.meta.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(wall.meta!.totalPages!, p + 1))}
                    disabled={page >= (wall.meta.totalPages ?? 1)}
                    className="px-3 py-1.5 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 disabled:opacity-50 hover:bg-secondary-50 dark:hover:bg-secondary-700"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar - Leaderboard */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Top Recognized</h3>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value as any)}
                className="text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg px-2 py-1 bg-white dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300"
              >
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {topRecognized && topRecognized.length > 0 ? (
              <div className="space-y-3">
                {topRecognized.map((entry: any, idx: number) => (
                  <div key={entry.user.id} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 flex items-center justify-center">
                      {idx === 0 ? (
                        <TrophyIcon className="h-5 w-5 text-yellow-500" />
                      ) : idx === 1 ? (
                        <StarIcon className="h-5 w-5 text-slate-400" />
                      ) : idx === 2 ? (
                        <SparklesIcon className="h-5 w-5 text-amber-600" />
                      ) : (
                        <span className="text-sm font-semibold text-secondary-400">#{idx + 1}</span>
                      )}
                    </div>
                    <UserAvatar user={entry.user} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">
                        {entry.user.firstName} {entry.user.lastName}
                      </p>
                      {entry.user.jobTitle && (
                        <p className="text-xs text-secondary-400 break-words">{entry.user.jobTitle}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 text-xs font-bold">
                        {entry.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary-400 text-center py-4">No recognitions this period</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="relative overflow-hidden glass-banner-okr rounded-xl shadow-sm p-5 text-secondary-900 dark:text-white">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-amber-500/30 to-orange-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-tr from-red-500/20 to-amber-500/15 rounded-full blur-3xl" />
            <h3 className="relative z-10 text-lg font-semibold mb-2">Recognition Impact</h3>
            <p className="relative z-10 text-secondary-500 dark:text-white/80 text-sm">
              {wall?.meta?.total ?? 0} total recognitions shared across the organization.
              Keep the appreciation flowing!
            </p>
          </div>

          {/* Value Categories */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Popular Values</h3>
            <div className="flex flex-wrap gap-2">
              {valueSuggestions.map(v => (
                <span key={v} className="bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 rounded-full px-3 py-1 text-xs">
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Give Recognition Modal */}
      {showGiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowGiveModal(false)}>
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Give Recognition</h2>
              <button onClick={() => setShowGiveModal(false)} className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={e => { e.preventDefault(); giveMutation.mutate(); }} className="space-y-4">
              {/* Person selector */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Who do you want to recognize?</label>
                <input
                  type="text"
                  placeholder="Search for a colleague..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {searchTerm && !toUserId && filteredUsers.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-700 shadow-lg">
                    {filteredUsers.slice(0, 8).map((u: User) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setToUserId(u.id);
                          setSearchTerm(`${u.firstName} ${u.lastName}`);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary-50 dark:hover:bg-secondary-600 text-left"
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
                  <button type="button" onClick={() => { setToUserId(''); setSearchTerm(''); }} className="text-xs text-primary-600 hover:text-primary-700 mt-1">
                    Change person
                  </button>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Your message</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Share what this person did that was awesome..."
                  rows={4}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  minLength={3}
                />
              </div>

              {/* Value tags */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Values (optional)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-amber-900">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {valueSuggestions.filter(v => !tags.includes(v)).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTags([...tags, v])}
                      className="bg-secondary-100 dark:bg-secondary-700 text-secondary-500 dark:text-secondary-400 rounded-full px-2.5 py-0.5 text-xs hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
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
                  className="px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!toUserId || !content.trim() || giveMutation.isPending}
                  className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-5 py-2 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {giveMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  ) : (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  )}
                  Send Recognition
                </button>
              </div>
              {giveMutation.isError && (
                <p className="text-red-500 text-sm">{(giveMutation.error as Error).message}</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
