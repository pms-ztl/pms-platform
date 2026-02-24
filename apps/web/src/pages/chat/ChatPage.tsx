import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { chatApi } from '@/lib/api/chat';
import {
  PaperAirplaneIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  UsersIcon,
  UserIcon,
  HashtagIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  EnvelopeIcon,
  SparklesIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  FaceSmileIcon,
  EllipsisHorizontalIcon,
  BellSlashIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  MapPinIcon,
  ShareIcon,
  InformationCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  HandThumbUpIcon,
  HeartIcon,
  FireIcon,
  HandRaisedIcon,
  FaceFrownIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { ConversationData, ChatMessageData, ChatUser, SearchResultData } from '@/lib/api/chat';

// ── Helpers ──

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitials(firstName?: string, lastName?: string) {
  return `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();
}

const TYPE_ICONS = { DIRECT: UserIcon, GROUP: UsersIcon, TEAM_CHANNEL: HashtagIcon } as const;
const TYPE_COLORS = {
  DIRECT: 'from-primary-500 to-accent-500',
  GROUP: 'from-accent-500 to-success-500',
  TEAM_CHANNEL: 'from-primary-600 to-primary-400',
} as const;

const URL_REGEX = /https?:\/\/[^\s<]+[^\s<.,:;"')\]!?]/g;

// Reaction identifiers — kept as strings for backward-compat with stored data.
// Visual rendering uses heroicons instead of emoji glyphs.
const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'] as const;

type ReactionEmoji = typeof EMOJI_LIST[number];

const REACTION_ICONS: Record<ReactionEmoji, React.FC<React.SVGProps<SVGSVGElement>>> = {
  '👍': HandThumbUpIcon,
  '❤️': HeartIcon,
  '😂': FaceSmileIcon,
  '😮': ExclamationCircleIcon,
  '😢': FaceFrownIcon,
  '🔥': FireIcon,
  '👏': HandRaisedIcon,
  '🎉': StarIcon,
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ── Text Formatting ──

function renderFormattedText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split by code blocks first
  const codeBlockParts = text.split(/(```[\s\S]*?```)/g);
  let key = 0;

  for (const part of codeBlockParts) {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^\w*\n/, '');
      nodes.push(
        <pre key={key++} className="mt-1.5 mb-1 rounded-lg bg-black/10 dark:bg-black/30 px-3 py-2 text-xs font-mono overflow-x-auto">
          <code>{code}</code>
        </pre>
      );
    } else {
      // Process inline formatting
      const inlineParts = part.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
      for (const inline of inlineParts) {
        if (inline.startsWith('**') && inline.endsWith('**')) {
          nodes.push(<strong key={key++} className="font-bold">{inline.slice(2, -2)}</strong>);
        } else if (inline.startsWith('*') && inline.endsWith('*') && inline.length > 2) {
          nodes.push(<em key={key++} className="italic">{inline.slice(1, -1)}</em>);
        } else if (inline.startsWith('`') && inline.endsWith('`')) {
          nodes.push(
            <code key={key++} className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-black/20 text-sm font-mono">
              {inline.slice(1, -1)}
            </code>
          );
        } else {
          // Handle URLs within plain text
          const urlParts = inline.split(URL_REGEX);
          const urlMatches = inline.match(URL_REGEX) || [];
          let urlIdx = 0;
          for (let i = 0; i < urlParts.length; i++) {
            if (urlParts[i]) nodes.push(<span key={key++}>{urlParts[i]}</span>);
            if (urlIdx < urlMatches.length) {
              nodes.push(
                <a key={key++} href={urlMatches[urlIdx]} target="_blank" rel="noopener noreferrer"
                  className="underline decoration-1 underline-offset-2 hover:opacity-80 transition-opacity">
                  {urlMatches[urlIdx]}
                </a>
              );
              urlIdx++;
            }
          }
        }
      }
    }
  }
  return nodes;
}

// ── Delivery Status Icon ──

function DeliveryStatus({ isOwn }: { isOwn: boolean }) {
  if (!isOwn) return null;
  return (
    <span className="inline-flex items-center ml-1">
      <CheckIcon className="h-3 w-3 text-primary-300" />
      <CheckIcon className="h-3 w-3 -ml-1.5 text-primary-300" />
    </span>
  );
}

// ── Avatar ──

function Avatar({ name, avatarUrl, isOnline, size = 'md' }: {
  name: string; avatarUrl?: string | null; isOnline?: boolean; size?: 'sm' | 'md' | 'lg';
}) {
  const sz = { sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-14 w-14 text-base' };
  const dot = { sm: 'h-2.5 w-2.5 border-[1.5px]', md: 'h-3 w-3 border-2', lg: 'h-3.5 w-3.5 border-2' };
  const parts = name.split(' ');
  const initials = getInitials(parts[0], parts[1]);

  return (
    <div className="relative flex-shrink-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className={clsx(sz[size], 'rounded-full object-cover ring-2 ring-white/20 dark:ring-secondary-700/50')} />
      ) : (
        <div className={clsx(sz[size], 'rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 dark:from-primary-500/30 dark:to-accent-500/30 flex items-center justify-center font-semibold text-primary-600 dark:text-primary-300 ring-2 ring-primary-500/10 dark:ring-primary-400/20')}>
          {initials}
        </div>
      )}
      {isOnline !== undefined && (
        <span className={clsx(
          dot[size],
          'absolute bottom-0 right-0 block rounded-full border-white dark:border-secondary-800',
          isOnline ? 'bg-success-400 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-secondary-300 dark:bg-secondary-600'
        )} />
      )}
    </div>
  );
}

// ── Emoji Picker ──

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute z-20 bottom-full mb-1 left-0 flex items-center gap-0.5 px-2 py-1.5 rounded-xl glass-deep shadow-lg border border-secondary-200/60 dark:border-secondary-700/50">
      {EMOJI_LIST.map((emoji) => {
        const Icon = REACTION_ICONS[emoji as ReactionEmoji];
        return (
          <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-all hover:scale-110 active:scale-95 text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-200">
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

// ── Reaction Bar ──

function ReactionBar({ reactions, userId, onToggle }: {
  reactions: Array<{ emoji: string; userId: string; createdAt: string }>;
  userId: string;
  onToggle: (emoji: string) => void;
}) {
  // Group reactions by emoji
  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; hasUser: boolean }>();
    for (const r of reactions) {
      const existing = map.get(r.emoji);
      if (existing) {
        existing.count++;
        if (r.userId === userId) existing.hasUser = true;
      } else {
        map.set(r.emoji, { count: 1, hasUser: r.userId === userId });
      }
    }
    return map;
  }, [reactions, userId]);

  if (grouped.size === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Array.from(grouped.entries()).map(([emoji, { count, hasUser }]) => {
        const Icon = REACTION_ICONS[emoji as ReactionEmoji];
        return (
          <button key={emoji} onClick={() => onToggle(emoji)}
            className={clsx(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all',
              hasUser
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-300 dark:ring-primary-700'
                : 'bg-secondary-100 dark:bg-secondary-800/50 text-secondary-600 dark:text-secondary-400 ring-1 ring-secondary-200/60 dark:ring-secondary-700/30 hover:bg-secondary-200/80 dark:hover:bg-secondary-700/60'
            )}>
            {Icon
              ? <Icon className="h-3 w-3 flex-shrink-0" />
              : <span>{emoji}</span>}
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Link Preview ──

function LinkPreview({ url }: { url: string }) {
  const domain = extractDomain(url);

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2.5 mt-1.5 px-3 py-2 rounded-xl bg-secondary-50/80 dark:bg-secondary-800/40 ring-1 ring-secondary-200/50 dark:ring-secondary-700/30 hover:ring-primary-300/50 dark:hover:ring-primary-600/30 transition-all group">
      <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-100 dark:bg-secondary-700/50">
        <LinkIcon className="h-4 w-4 text-secondary-400 dark:text-secondary-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 break-words">{domain}</p>
        <p className="text-2xs text-secondary-400 dark:text-secondary-500 break-words">{url}</p>
      </div>
      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 flex-shrink-0 text-secondary-300 dark:text-secondary-600 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors" />
    </a>
  );
}

// ── New Chat Dialog ──

function NewChatDialog({ onClose, onSelectUser, onCreateGroup }: {
  onClose: () => void;
  onSelectUser: (user: ChatUser) => void;
  onCreateGroup: (name: string, userIds: string[]) => void;
}) {
  const [tab, setTab] = useState<'dm' | 'group' | 'team'>('dm');
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);

  const { data: users } = useQuery({
    queryKey: ['chat-users', search],
    queryFn: () => chatApi.searchUsers(search),
    enabled: search.length > 0,
  });

  const { data: teams } = useQuery({
    queryKey: ['chat-teams'],
    queryFn: () => chatApi.getUserTeams(),
    enabled: tab === 'team',
  });

  const handleCreateTeamChannel = async (teamId: string) => {
    try { await chatApi.createTeamChannel(teamId); onClose(); } catch { /* ignore */ }
  };

  const tabs = [
    { key: 'dm' as const, label: 'Direct Message', icon: UserIcon },
    { key: 'group' as const, label: 'Group', icon: UsersIcon },
    { key: 'team' as const, label: 'Team Channel', icon: HashtagIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-950/60 backdrop-blur-sm animate-[fade-in_0.2s_ease]">
      <div className="w-full max-w-lg mx-4 rounded-2xl glass-deep shadow-xl shadow-primary-500/5 border border-secondary-200/60 dark:border-secondary-700/50 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-secondary-200/60 dark:border-secondary-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-accent-500/5" />
          <div className="relative flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-secondary-900 dark:text-white">New Conversation</h3>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">Connect with your team</p>
            </div>
            <button onClick={onClose} className="rounded-xl p-2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-all">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 mx-4 mt-4 bg-secondary-100/80 dark:bg-secondary-800/50 rounded-xl">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all',
                tab === key
                  ? 'bg-white dark:bg-secondary-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
              )}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 max-h-[360px] overflow-y-auto">
          {(tab === 'dm' || tab === 'group') && (
            <>
              <div className="relative mb-3">
                <MagnifyingGlassIcon className="absolute left-3.5 top-3 h-4 w-4 text-secondary-400" />
                <input
                  type="text" placeholder="Search by name or email..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="input w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>

              {tab === 'group' && (
                <div className="mb-3 space-y-2">
                  <input
                    type="text" placeholder="Group name..." value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="input w-full text-sm"
                  />
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUsers.map((u) => (
                        <span key={u.id} className="badge badge-primary inline-flex items-center gap-1">
                          {u.firstName} {u.lastName}
                          <button onClick={() => setSelectedUsers((prev) => prev.filter((p) => p.id !== u.id))} className="hover:text-primary-800 dark:hover:text-primary-200">
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                {search.length === 0 && (
                  <p className="text-center text-xs text-secondary-400 dark:text-secondary-500 py-8">Type to search for colleagues</p>
                )}
                {users?.map((u) => (
                  <button key={u.id}
                    onClick={() => {
                      if (tab === 'dm') onSelectUser(u);
                      else setSelectedUsers((prev) => prev.find((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u]);
                    }}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all',
                      tab === 'group' && selectedUsers.find((p) => p.id === u.id)
                        ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-700'
                        : 'hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/40'
                    )}>
                    <Avatar name={`${u.firstName} ${u.lastName}`} avatarUrl={u.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-secondary-900 dark:text-white break-words">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words">{u.jobTitle || u.email}</p>
                    </div>
                    {tab === 'group' && selectedUsers.find((p) => p.id === u.id) && (
                      <span className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {tab === 'group' && selectedUsers.length > 0 && groupName.trim() && (
                <button onClick={() => onCreateGroup(groupName, selectedUsers.map((u) => u.id))}
                  className="btn btn-primary w-full mt-4">
                  Create Group ({selectedUsers.length} members)
                </button>
              )}
            </>
          )}

          {tab === 'team' && (
            <div className="space-y-1">
              {teams?.length === 0 && (
                <p className="text-center text-xs text-secondary-400 dark:text-secondary-500 py-8">No teams found</p>
              )}
              {teams?.map((team) => (
                <button key={team.id} onClick={() => handleCreateTeamChannel(team.id)}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/40 transition-all">
                  <div className={clsx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br', TYPE_COLORS.TEAM_CHANNEL, 'bg-opacity-10')}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-100 to-secondary-50 dark:from-secondary-700/60 dark:to-secondary-800/60">
                      <HashtagIcon className="h-4.5 w-4.5 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-secondary-900 dark:text-white">{team.name}</p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">{team._count.members} members</p>
                  </div>
                  {team.chatChannel.length > 0 && (
                    <span className="badge badge-success text-2xs">Active</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Conversation List Item ──

function ConversationItem({ convo, isActive, onClick, onlineUsers }: {
  convo: ConversationData; isActive: boolean; onClick: () => void; onlineUsers: Set<string>;
}) {
  const { user } = useAuthStore();
  const TypeIcon = TYPE_ICONS[convo.type];
  const otherParticipant = convo.type === 'DIRECT' ? convo.participants.find((p) => p.userId !== user?.id) : null;
  const isOnline = otherParticipant ? onlineUsers.has(otherParticipant.userId) : undefined;

  return (
    <button onClick={onClick}
      className={clsx(
        'group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200',
        isActive
          ? 'bg-primary-50/80 dark:bg-primary-900/20 ring-1 ring-primary-200/80 dark:ring-primary-700/50 shadow-sm shadow-primary-500/5'
          : 'hover:bg-secondary-50 dark:hover:bg-secondary-800/40'
      )}>
      {convo.type === 'DIRECT' ? (
        <Avatar name={convo.name || 'User'} avatarUrl={convo.avatarUrl} isOnline={isOnline} />
      ) : (
        <div className={clsx('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br', TYPE_COLORS[convo.type], 'bg-opacity-10')}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-100 to-secondary-50 dark:from-secondary-700/60 dark:to-secondary-800/60">
            <TypeIcon className="h-5 w-5 text-secondary-500 dark:text-secondary-400" />
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={clsx(
              'text-sm break-words',
              convo.hasUnread ? 'font-bold text-secondary-900 dark:text-white' : 'font-medium text-secondary-700 dark:text-secondary-300'
            )}>
              {convo.name || 'Chat'}
            </p>
            {convo.isMuted && (
              <BellSlashIcon className="h-3.5 w-3.5 flex-shrink-0 text-secondary-400 dark:text-secondary-500" />
            )}
          </div>
          {convo.lastMessage && (
            <span className="text-2xs text-secondary-400 dark:text-secondary-500 flex-shrink-0 tabular-nums">
              {formatTime(convo.lastMessage.createdAt)}
            </span>
          )}
        </div>
        {convo.lastMessage && (
          <p className={clsx(
            'text-xs break-words mt-0.5 leading-relaxed',
            convo.hasUnread ? 'text-secondary-600 dark:text-secondary-300' : 'text-secondary-400 dark:text-secondary-500'
          )}>
            {convo.type !== 'DIRECT' && convo.lastMessage.senderName && (
              <span className="font-semibold">{convo.lastMessage.senderName.split(' ')[0]}: </span>
            )}
            {convo.lastMessage.content || 'Message deleted'}
          </p>
        )}
      </div>
      {convo.unreadCount > 0 && (
        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white text-2xs font-bold flex items-center justify-center shadow-lg shadow-primary-500/30">
          {convo.unreadCount > 99 ? '99+' : convo.unreadCount}
        </span>
      )}
      {convo.hasUnread && !convo.unreadCount && (
        <span className="h-2 w-2 rounded-full bg-primary-500 flex-shrink-0 shadow-[0_0_6px_rgba(139,92,246,0.5)]" />
      )}
    </button>
  );
}

// ── Conversation Menu ──

function ConversationMenu({ convo, onClose }: {
  convo: ConversationData;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const { removeConversation, updateConversationName, toggleConversationMuted } = useChatStore();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(convo.name || '');
  const ref = useRef<HTMLDivElement>(null);

  const isGroupOrChannel = convo.type === 'GROUP' || convo.type === 'TEAM_CHANNEL';
  const isAdmin = convo.participants.find((p) => p.userId === user?.id)?.role === 'ADMIN';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleLeave = async () => {
    try {
      await chatApi.leaveConversation(convo.id);
      removeConversation(convo.id);
      onClose();
    } catch { /* ignore */ }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === convo.name) { setRenaming(false); return; }
    try {
      await chatApi.renameConversation(convo.id, newName.trim());
      updateConversationName(convo.id, newName.trim());
      setRenaming(false);
      onClose();
    } catch { /* ignore */ }
  };

  const handleMute = async () => {
    try {
      await chatApi.toggleMuteConversation(convo.id);
      toggleConversationMuted(convo.id);
      onClose();
    } catch { /* ignore */ }
  };

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 z-30 w-52 rounded-xl glass-deep shadow-xl border border-secondary-200/60 dark:border-secondary-700/50 py-1 overflow-hidden">
      {showLeaveConfirm ? (
        <div className="p-3 space-y-2">
          <p className="text-xs text-secondary-600 dark:text-secondary-300 font-medium">Leave this conversation?</p>
          <p className="text-2xs text-secondary-400 dark:text-secondary-500">You will no longer receive messages from this chat.</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLeaveConfirm(false)}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-secondary-100 dark:bg-secondary-800/50 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-all">
              Cancel
            </button>
            <button onClick={handleLeave}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all">
              Leave
            </button>
          </div>
        </div>
      ) : renaming ? (
        <div className="p-3 space-y-2">
          <input
            type="text" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            className="input w-full text-xs py-1.5"
            placeholder="New name..."
          />
          <div className="flex items-center gap-2">
            <button onClick={() => setRenaming(false)}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-secondary-100 dark:bg-secondary-800/50 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-all">
              Cancel
            </button>
            <button onClick={handleRename}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-all">
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mute/Unmute */}
          <button onClick={handleMute}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/40 transition-all">
            <BellSlashIcon className="h-4 w-4 text-secondary-400" />
            {convo.isMuted ? 'Unmute' : 'Mute'} Conversation
          </button>

          {/* Rename - only for admin of group/channel */}
          {isGroupOrChannel && isAdmin && (
            <button onClick={() => setRenaming(true)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/40 transition-all">
              <PencilIcon className="h-4 w-4 text-secondary-400" />
              Rename
            </button>
          )}

          {/* Leave - only for group/channel */}
          {isGroupOrChannel && (
            <button onClick={() => setShowLeaveConfirm(true)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              <ArrowLeftIcon className="h-4 w-4" />
              Leave Conversation
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Message Bubble ──

function MessageBubble({ message, isOwn, showSender, userId, conversationId, socket }: {
  message: ChatMessageData; isOwn: boolean; showSender: boolean; userId: string; conversationId: string; socket: any;
}) {
  const { editingMessageId, setEditingMessage, updateMessage, updateMessageReactions, updateMessagePinStatus, setReplyingTo, setForwardingMessage } = useChatStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const menuRef = useRef<HTMLDivElement>(null);
  const isEditing = editingMessageId === message.id;

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-2xs font-medium text-secondary-400 dark:text-secondary-500 bg-secondary-100/60 dark:bg-secondary-800/40 rounded-full px-3 py-1">{message.content}</span>
      </div>
    );
  }

  const isDeleted = message.deletedAt !== null;
  const isEdited = message.editedAt !== null;

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent.trim() === message.content) {
      setEditingMessage(null);
      return;
    }
    try {
      if (socket) {
        socket.emit('chat:edit', { messageId: message.id, conversationId, content: editContent.trim() });
      } else {
        const updated = await chatApi.editMessage(conversationId, message.id, editContent.trim());
        updateMessage(updated);
      }
      setEditingMessage(null);
    } catch { /* ignore */ }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    try {
      if (socket) {
        socket.emit('chat:delete', { messageId: message.id, conversationId });
      } else {
        const updated = await chatApi.deleteMessage(conversationId, message.id);
        updateMessage(updated);
      }
    } catch { /* ignore */ }
  };

  const handleReaction = async (emoji: string) => {
    try {
      if (socket) {
        socket.emit('chat:reaction', { messageId: message.id, conversationId, emoji });
      } else {
        const result = await chatApi.toggleReaction(conversationId, message.id, emoji);
        updateMessageReactions(message.id, result.message.reactions || []);
      }
    } catch { /* ignore */ }
  };

  const handleReply = () => {
    setReplyingTo(message);
    setShowMenu(false);
  };

  const handlePin = async () => {
    setShowMenu(false);
    try {
      if (socket) {
        socket.emit('chat:pin', { messageId: message.id, conversationId });
      } else {
        const updated = await chatApi.togglePin(conversationId, message.id);
        updateMessagePinStatus(message.id, updated.isPinned, updated.pinnedBy, updated.pinnedAt);
      }
    } catch { /* ignore */ }
  };

  const handleForward = () => {
    setForwardingMessage(message);
    setShowMenu(false);
  };

  // Extract URLs for link previews
  const urls = useMemo(() => {
    if (isDeleted) return [];
    const matches = message.content.match(URL_REGEX);
    return matches ? [...new Set(matches)].slice(0, 3) : [];
  }, [message.content, isDeleted]);

  return (
    <div className={clsx('flex gap-2.5 group/msg', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && showSender && (
        <Avatar name={`${message.sender.firstName} ${message.sender.lastName}`} avatarUrl={message.sender.avatarUrl} size="sm" />
      )}
      {!isOwn && !showSender && <div className="w-9" />}
      <div className={clsx('max-w-[70%] space-y-0.5 relative', isOwn ? 'items-end' : 'items-start')}>
        {showSender && !isOwn && (
          <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 ml-1 mb-0.5">
            {message.sender.firstName} {message.sender.lastName}
          </p>
        )}

        {/* Pinned indicator */}
        {message.isPinned && !isDeleted && (
          <div className={clsx(
            'flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium',
            isOwn ? 'justify-end text-amber-200/80' : 'text-amber-500/80'
          )}>
            <MapPinIcon className="h-3 w-3" />
            <span>Pinned{message.pinnedBy ? ` by ${message.pinnedBy.firstName}` : ''}</span>
          </div>
        )}

        {/* Forwarded indicator */}
        {message.forwardedFrom && !isDeleted && (
          <div className={clsx(
            'flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium italic',
            isOwn ? 'justify-end text-primary-200/70' : 'text-secondary-400 dark:text-secondary-500'
          )}>
            <ShareIcon className="h-3 w-3" />
            <span>Forwarded from {message.forwardedFrom.sender.firstName} {message.forwardedFrom.sender.lastName}</span>
          </div>
        )}

        {/* Reply-to preview */}
        {message.replyTo && !isDeleted && (
          <div className={clsx(
            'flex items-start gap-2 px-3 py-1.5 rounded-xl mb-0.5 text-xs border-l-2',
            isOwn
              ? 'bg-primary-700/30 border-white/40 text-primary-100'
              : 'bg-secondary-100/60 dark:bg-secondary-800/30 border-primary-400/60 dark:border-primary-500/40 text-secondary-500 dark:text-secondary-400'
          )}>
            <ArrowUturnLeftIcon className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-semibold">
                {message.replyTo.deletedAt
                  ? 'Deleted message'
                  : `${message.replyTo.sender.firstName} ${message.replyTo.sender.lastName}`}
              </span>
              {!message.replyTo.deletedAt && (
                <p className="break-wordsopacity-80">{message.replyTo.content}</p>
              )}
            </div>
          </div>
        )}

        {/* Hover action buttons */}
        <div className={clsx(
          'absolute top-0 z-10 flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity',
          isOwn ? 'right-0 -top-7' : 'left-10 -top-7'
        )}>
          {/* Emoji reaction button */}
          {!isDeleted && !isEditing && (
            <div className="relative">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl shadow ring-1 ring-secondary-200/60 dark:ring-secondary-700/50 text-secondary-400 hover:text-primary-500 transition-all">
                <FaceSmileIcon className="h-3.5 w-3.5" />
              </button>
              {showEmojiPicker && (
                <EmojiPicker onSelect={handleReaction} onClose={() => setShowEmojiPicker(false)} />
              )}
            </div>
          )}

          {/* Reply button */}
          {!isDeleted && !isEditing && (
            <button onClick={handleReply} title="Reply"
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl shadow ring-1 ring-secondary-200/60 dark:ring-secondary-700/50 text-secondary-400 hover:text-primary-500 transition-all">
              <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Pin button */}
          {!isDeleted && !isEditing && (
            <button onClick={handlePin} title={message.isPinned ? 'Unpin' : 'Pin'}
              className={clsx(
                'flex h-6 w-6 items-center justify-center rounded-lg shadow ring-1 transition-all',
                message.isPinned
                  ? 'bg-amber-50 dark:bg-amber-900/30 ring-amber-200 dark:ring-amber-700/50 text-amber-500'
                  : 'bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl ring-secondary-200/60 dark:ring-secondary-700/50 text-secondary-400 hover:text-amber-500'
              )}>
              <MapPinIcon className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Forward button */}
          {!isDeleted && !isEditing && (
            <button onClick={handleForward} title="Forward"
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl shadow ring-1 ring-secondary-200/60 dark:ring-secondary-700/50 text-secondary-400 hover:text-primary-500 transition-all">
              <ShareIcon className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Own message menu */}
          {isOwn && !isDeleted && !isEditing && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl shadow ring-1 ring-secondary-200/60 dark:ring-secondary-700/50 text-secondary-400 hover:text-primary-500 transition-all">
                <EllipsisHorizontalIcon className="h-3.5 w-3.5" />
              </button>
              {showMenu && (
                <div className="absolute z-20 right-0 top-full mt-1 w-36 rounded-xl glass-deep shadow-xl border border-secondary-200/60 dark:border-secondary-700/50 py-1 overflow-hidden">
                  <button onClick={() => { setEditingMessage(message.id); setEditContent(message.content); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/40 transition-all">
                    <PencilIcon className="h-3.5 w-3.5 text-secondary-400" />
                    Edit
                  </button>
                  <button onClick={handleDelete}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <TrashIcon className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message content */}
        <div className={clsx(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isDeleted
            ? 'bg-secondary-100/50 dark:bg-secondary-800/30 text-secondary-400 dark:text-secondary-500 italic'
            : isOwn
              ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white rounded-br-lg shadow-lg shadow-primary-500/20'
              : 'bg-white/80 dark:bg-secondary-800/60 text-secondary-800 dark:text-secondary-100 rounded-bl-lg ring-1 ring-secondary-200/50 dark:ring-secondary-700/30 backdrop-blur-sm'
        )}>
          {isDeleted ? (
            <p className="whitespace-pre-wrap break-words">This message was deleted</p>
          ) : isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full resize-none rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-inherit placeholder-white/50 focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                  if (e.key === 'Escape') setEditingMessage(null);
                }}
              />
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setEditingMessage(null)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all">
                  Cancel
                </button>
                <button onClick={handleSaveEdit}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-all">
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">{renderFormattedText(message.content)}</div>
          )}
        </div>

        {/* Link previews */}
        {urls.length > 0 && !isEditing && (
          <div className="space-y-1">
            {urls.map((url) => (
              <LinkPreview key={url} url={url} />
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && !isDeleted && (
          <ReactionBar reactions={message.reactions} userId={userId} onToggle={handleReaction} />
        )}

        {/* Timestamp + edited label */}
        <div className={clsx(
          'flex items-center gap-1.5 px-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity',
          isOwn ? 'justify-end' : 'justify-start'
        )}>
          <p className="text-2xs tabular-nums text-secondary-400">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          {isEdited && !isDeleted && (
            <span className="text-2xs text-secondary-400 dark:text-secondary-500 italic">(edited)</span>
          )}
          <DeliveryStatus isOwn={isOwn} />
        </div>
      </div>
    </div>
  );
}

// ── Typing Dots ──

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-secondary-400 dark:bg-secondary-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

// ── Search Panel ──

function SearchPanel({ onSelectResult, onClose }: {
  onSelectResult: (conversationId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultData[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await chatApi.searchMessages(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <span className="bg-primary-200/60 dark:bg-primary-700/40 text-primary-800 dark:text-primary-200 rounded px-0.5">{match}</span>
        {after}
      </>
    );
  };

  return (
    <div className="w-[320px] flex-shrink-0 flex flex-col bg-white/70 dark:bg-secondary-900/50 backdrop-blur-xl border-l border-secondary-200/50 dark:border-secondary-700/30">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-secondary-200/50 dark:border-secondary-700/30">
        <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400 flex-shrink-0" />
        <h4 className="text-sm font-display font-bold text-secondary-900 dark:text-white flex-1">Search Messages</h4>
        <button onClick={onClose}
          className="rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Search input */}
      <div className="px-4 py-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-secondary-400" />
          <input
            type="text" placeholder="Search..." value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full rounded-xl border-0 bg-secondary-100/80 dark:bg-secondary-800/50 py-2.5 pl-9 pr-3 text-sm text-secondary-900 dark:text-secondary-100 placeholder-secondary-400 dark:placeholder-secondary-500 focus:ring-2 focus:ring-primary-500/30 transition-all"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {searching && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
          </div>
        )}

        {!searching && query.trim() && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MagnifyingGlassIcon className="h-8 w-8 text-secondary-300 dark:text-secondary-600 mb-2" />
            <p className="text-xs text-secondary-400 dark:text-secondary-500">No results found</p>
          </div>
        )}

        {!searching && results.map((result) => (
          <button key={result.id} onClick={() => { onSelectResult(result.conversationId); onClose(); }}
            className="flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left hover:bg-secondary-50 dark:hover:bg-secondary-800/40 transition-all">
            <Avatar name={`${result.sender.firstName} ${result.sender.lastName}`} avatarUrl={result.sender.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-secondary-900 dark:text-white break-words">
                  {result.sender.firstName} {result.sender.lastName}
                </p>
                <span className="text-2xs text-secondary-400 dark:text-secondary-500 flex-shrink-0 tabular-nums">
                  {formatTime(result.createdAt)}
                </span>
              </div>
              <p className="text-xs text-secondary-600 dark:text-secondary-300 mt-0.5 leading-relaxed">
                {highlightMatch(result.content, query)}
              </p>
              <p className="text-2xs text-secondary-400 dark:text-secondary-500 mt-0.5 break-words">
                in {result.conversationName || 'Direct Message'}
              </p>
            </div>
          </button>
        ))}

        {!query.trim() && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MagnifyingGlassIcon className="h-8 w-8 text-secondary-300 dark:text-secondary-600 mb-2" />
            <p className="text-xs text-secondary-400 dark:text-secondary-500">Type to search messages</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pinned Messages Panel ──

function PinnedMessagesPanel({ conversationId, onClose }: {
  conversationId: string;
  onClose: () => void;
}) {
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    chatApi.getPinnedMessages(conversationId)
      .then((data) => setPinnedMessages(data))
      .catch(() => setPinnedMessages([]))
      .finally(() => setLoading(false));
  }, [conversationId]);

  const handleUnpin = async (messageId: string) => {
    try {
      await chatApi.togglePin(conversationId, messageId);
      setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch { /* ignore */ }
  };

  return (
    <div className="w-[320px] flex-shrink-0 flex flex-col bg-white/70 dark:bg-secondary-900/50 backdrop-blur-xl border-l border-secondary-200/50 dark:border-secondary-700/30">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-secondary-200/50 dark:border-secondary-700/30">
        <MapPinIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <h4 className="text-sm font-display font-bold text-secondary-900 dark:text-white flex-1">Pinned Messages</h4>
        <span className="text-2xs font-semibold text-secondary-400 bg-secondary-100 dark:bg-secondary-800/50 px-2 py-0.5 rounded-full">{pinnedMessages.length}</span>
        <button onClick={onClose}
          className="rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 pt-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
          </div>
        ) : pinnedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPinIcon className="h-8 w-8 text-secondary-300 dark:text-secondary-600 mb-2" />
            <p className="text-xs text-secondary-400 dark:text-secondary-500">No pinned messages</p>
            <p className="text-2xs text-secondary-400 dark:text-secondary-500 mt-1">Pin important messages to find them easily</p>
          </div>
        ) : (
          pinnedMessages.map((msg) => (
            <div key={msg.id} className="rounded-xl bg-secondary-50/80 dark:bg-secondary-800/40 ring-1 ring-secondary-200/50 dark:ring-secondary-700/30 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={`${msg.sender.firstName} ${msg.sender.lastName}`} avatarUrl={msg.sender.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-secondary-900 dark:text-white break-words">{msg.sender.firstName} {msg.sender.lastName}</p>
                    <p className="text-2xs text-secondary-400">{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
                <button onClick={() => handleUnpin(msg.id)} title="Unpin"
                  className="rounded-lg p-1 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex-shrink-0">
                  <MapPinIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-secondary-600 dark:text-secondary-300 leading-relaxed">{msg.content}</p>
              {msg.pinnedBy && (
                <p className="text-2xs text-secondary-400 dark:text-secondary-500 italic">
                  Pinned by {msg.pinnedBy.firstName} {msg.pinnedBy.lastName}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Conversation Info Panel ──

function ConversationInfoPanel({ convo, onlineUsers, onClose }: {
  convo: ConversationData;
  onlineUsers: Set<string>;
  onClose: () => void;
}) {
  const TypeIcon = TYPE_ICONS[convo.type];

  return (
    <div className="w-[320px] flex-shrink-0 flex flex-col bg-white/70 dark:bg-secondary-900/50 backdrop-blur-xl border-l border-secondary-200/50 dark:border-secondary-700/30">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-secondary-200/50 dark:border-secondary-700/30">
        <InformationCircleIcon className="h-5 w-5 text-primary-500 flex-shrink-0" />
        <h4 className="text-sm font-display font-bold text-secondary-900 dark:text-white flex-1">Details</h4>
        <button onClick={onClose}
          className="rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Conversation Header */}
        <div className="px-4 py-5 text-center border-b border-secondary-200/50 dark:border-secondary-700/30">
          <div className={clsx('mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br mb-3', TYPE_COLORS[convo.type])}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 dark:bg-secondary-800/80">
              <TypeIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <h3 className="text-base font-display font-bold text-secondary-900 dark:text-white">{convo.name || 'Chat'}</h3>
          <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1 capitalize">{convo.type.replace('_', ' ').toLowerCase()}</p>
          {convo.teamName && (
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5 font-medium">Team: {convo.teamName}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-secondary-200/50 dark:border-secondary-700/30">
          <div className="text-center">
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{convo.participants.length}</p>
            <p className="text-2xs text-secondary-400">Members</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{convo.pinnedCount || 0}</p>
            <p className="text-2xs text-secondary-400">Pinned</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-success-500">
              {convo.participants.filter((p) => onlineUsers.has(p.userId)).length}
            </p>
            <p className="text-2xs text-secondary-400">Online</p>
          </div>
        </div>

        {/* Members */}
        <div className="px-4 py-3">
          <h5 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-3">
            Members ({convo.participants.length})
          </h5>
          <div className="space-y-1">
            {convo.participants.map((p) => (
              <div key={p.userId} className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary-50 dark:hover:bg-secondary-800/40 transition-all">
                <Avatar
                  name={`${p.firstName} ${p.lastName}`}
                  avatarUrl={p.avatarUrl}
                  isOnline={onlineUsers.has(p.userId)}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-secondary-900 dark:text-white break-words">{p.firstName} {p.lastName}</p>
                  <p className="text-2xs text-secondary-400 dark:text-secondary-500">
                    {onlineUsers.has(p.userId) ? <span className="text-success-500">Online</span> : 'Offline'}
                  </p>
                </div>
                {p.role === 'ADMIN' && (
                  <span className="text-3xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded-full tracking-wider">Admin</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Created info */}
        <div className="px-4 py-3 border-t border-secondary-200/50 dark:border-secondary-700/30">
          <p className="text-2xs text-secondary-400 dark:text-secondary-500">
            Created {new Date(convo.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Forward Message Dialog ──

function ForwardMessageDialog({ message, conversations, onClose, onForward }: {
  message: ChatMessageData;
  conversations: ConversationData[];
  onClose: () => void;
  onForward: (targetConversationId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? conversations.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-950/60 backdrop-blur-sm animate-[fade-in_0.2s_ease]">
      <div className="w-full max-w-md mx-4 rounded-2xl glass-deep shadow-xl shadow-primary-500/5 border border-secondary-200/60 dark:border-secondary-700/50 overflow-hidden">
        <div className="relative px-6 py-5 border-b border-secondary-200/60 dark:border-secondary-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-accent-500/5" />
          <div className="relative flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-secondary-900 dark:text-white">Forward Message</h3>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">Choose a conversation</p>
            </div>
            <button onClick={onClose} className="rounded-xl p-2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-all">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Message preview */}
        <div className="px-4 pt-3">
          <div className="rounded-xl bg-secondary-50/80 dark:bg-secondary-800/40 ring-1 ring-secondary-200/50 dark:ring-secondary-700/30 p-3">
            <p className="text-2xs font-semibold text-secondary-400 dark:text-secondary-500 mb-1">
              From: {message.sender.firstName} {message.sender.lastName}
            </p>
            <p className="text-xs text-secondary-600 dark:text-secondary-300">{message.content}</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-2.5 h-4 w-4 text-secondary-400" />
            <input type="text" placeholder="Search conversations..." value={search}
              onChange={(e) => setSearch(e.target.value)} autoFocus
              className="w-full rounded-xl border-0 bg-secondary-100/80 dark:bg-secondary-800/50 py-2.5 pl-10 pr-3 text-sm text-secondary-900 dark:text-secondary-100 placeholder-secondary-400 focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="p-3 max-h-[300px] overflow-y-auto space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-secondary-400 dark:text-secondary-500 py-6">No conversations found</p>
          ) : (
            filtered.map((convo) => {
              const TypeIcon = TYPE_ICONS[convo.type];
              return (
                <button key={convo.id} onClick={() => { onForward(convo.id); onClose(); }}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/40 transition-all">
                  {convo.type === 'DIRECT' ? (
                    <Avatar name={convo.name || 'User'} avatarUrl={convo.avatarUrl} size="sm" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary-100 dark:bg-secondary-700/60">
                      <TypeIcon className="h-4 w-4 text-secondary-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-secondary-900 dark:text-white break-words">{convo.name || 'Chat'}</p>
                    <p className="text-2xs text-secondary-400 dark:text-secondary-500 capitalize">{convo.type.replace('_', ' ').toLowerCase()}</p>
                  </div>
                  <ShareIcon className="h-4 w-4 text-secondary-300 dark:text-secondary-600" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Email Compose Modal ──

function EmailComposeModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const hasAI = user?.aiAccessEnabled === true;
  const [step, setStep] = useState<'compose' | 'preview' | 'sent'>('compose');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // AI state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiLoading, setAILoading] = useState(false);

  const { data: userSuggestions } = useQuery({
    queryKey: ['chat-users-email', recipientSearch],
    queryFn: () => chatApi.searchUsers(recipientSearch),
    enabled: recipientSearch.length > 1 && showSuggestions,
  });

  const handleSelectRecipient = (u: ChatUser) => {
    setTo(u.email || '');
    setRecipientSearch(`${u.firstName} ${u.lastName}`);
    setShowSuggestions(false);
  };

  const handleAIDraft = async () => {
    if (!aiPrompt.trim()) return;
    setAILoading(true);
    try {
      const result = await chatApi.aiDraftEmail(aiPrompt);
      setSubject(result.subject);
      setBody(result.body);
      setShowAIPanel(false);
    } catch {
      setSendError('AI drafting failed. Please try again.');
    } finally {
      setAILoading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setSendError('');
    try {
      await chatApi.sendEmail(to, subject, body);
      setStep('sent');
    } catch (err: any) {
      setSendError(err?.response?.data?.error?.message || err?.message || 'Failed to send email');
      setStep('compose');
    } finally {
      setSending(false);
    }
  };

  const canPreview = to.trim() && subject.trim() && body.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-950/60 backdrop-blur-sm animate-[fade-in_0.2s_ease]">
      <div className="w-full max-w-2xl mx-4 rounded-2xl glass-deep shadow-xl shadow-primary-500/5 border border-secondary-200/60 dark:border-secondary-700/50 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-secondary-200/60 dark:border-secondary-700/50 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-accent-500/5" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/25">
                <EnvelopeIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-secondary-900 dark:text-white">
                  {step === 'preview' ? 'Preview Email' : step === 'sent' ? 'Email Sent' : 'Compose Email'}
                </h3>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                  {step === 'preview' ? 'Review before sending' : step === 'sent' ? 'Your email has been delivered' : 'Send a message to a colleague'}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="rounded-xl p-2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-all">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'sent' ? (
            /* ── Success State ── */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full bg-success-500/20 blur-2xl" />
                <div className="relative rounded-2xl bg-success-500/10 dark:bg-success-500/15 p-5">
                  <CheckCircleIcon className="h-12 w-12 text-success-500" />
                </div>
              </div>
              <h4 className="text-lg font-display font-bold text-secondary-900 dark:text-white mb-1">Email Sent Successfully</h4>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-6">Your message has been delivered to {recipientSearch || to}</p>
              <button onClick={onClose} className="btn btn-primary">Done</button>
            </div>
          ) : step === 'preview' ? (
            /* ── Preview Step ── */
            <div className="space-y-4">
              <div className="card p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                  <span className="font-semibold text-secondary-600 dark:text-secondary-300 w-12">To:</span>
                  <span>{recipientSearch || to}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                  <span className="font-semibold text-secondary-600 dark:text-secondary-300 w-12">Subject:</span>
                  <span className="font-medium text-secondary-800 dark:text-secondary-100">{subject}</span>
                </div>
                <hr className="border-secondary-200/60 dark:border-secondary-700/30" />
                <div className="text-sm text-secondary-700 dark:text-secondary-200 whitespace-pre-wrap leading-relaxed min-h-[120px]">
                  {body}
                </div>
              </div>
              <p className="text-xs text-secondary-400 dark:text-secondary-500 text-center">
                This email will be sent from PMS Platform with branded formatting
              </p>
            </div>
          ) : (
            /* ── Compose Step ── */
            <div className="space-y-4">
              {sendError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/50 text-sm text-red-600 dark:text-red-400">
                  <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
                  {sendError}
                </div>
              )}

              {/* AI Draft Panel */}
              {hasAI && (
                <div className="relative">
                  {!showAIPanel ? (
                    <button onClick={() => setShowAIPanel(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-accent-500/10 dark:from-primary-500/15 dark:via-primary-500/10 dark:to-accent-500/15 ring-1 ring-primary-500/20 dark:ring-primary-500/30 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:from-primary-500/15 hover:to-accent-500/15 transition-all group">
                      <SparklesIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      Write with AI
                    </button>
                  ) : (
                    <div className="rounded-xl bg-gradient-to-br from-primary-500/5 to-accent-500/5 dark:from-primary-500/10 dark:to-accent-500/10 ring-1 ring-primary-500/20 dark:ring-primary-500/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="h-4 w-4 text-primary-500" />
                          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">AI Email Drafter</span>
                        </div>
                        <button onClick={() => setShowAIPanel(false)}
                          className="rounded-lg p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-all">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAIPrompt(e.target.value)}
                        placeholder="Describe what you want to say... e.g. 'Ask John about the Q4 review deadline'"
                        rows={3}
                        className="w-full rounded-xl border border-primary-200/60 dark:border-primary-700/40 bg-white/60 dark:bg-secondary-800/40 px-4 py-3 text-sm text-secondary-900 dark:text-secondary-100 placeholder-secondary-400 dark:placeholder-secondary-500 focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={handleAIDraft} disabled={!aiPrompt.trim() || aiLoading}
                          className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                            aiPrompt.trim() && !aiLoading
                              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40'
                              : 'bg-secondary-100 dark:bg-secondary-800/50 text-secondary-300 dark:text-secondary-600 cursor-not-allowed'
                          )}>
                          {aiLoading ? (
                            <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Drafting...</>
                          ) : (
                            <><SparklesIcon className="h-4 w-4" /> Generate Draft</>
                          )}
                        </button>
                        {subject && body && (
                          <button onClick={handleAIDraft} disabled={aiLoading}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 transition-all"
                            title="Regenerate">
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* To Field */}
              <div className="relative">
                <label className="block text-xs font-semibold text-secondary-600 dark:text-secondary-400 mb-1.5 ml-1">To</label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => {
                      setRecipientSearch(e.target.value);
                      setShowSuggestions(true);
                      setSendError('');
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search for a colleague..."
                    className="input w-full text-sm"
                  />
                  {showSuggestions && userSuggestions && userSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl glass-deep shadow-xl border border-secondary-200/60 dark:border-secondary-700/50 py-1 max-h-48 overflow-y-auto">
                      {userSuggestions.map((u) => (
                        <button key={u.id} onClick={() => handleSelectRecipient(u)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/40 transition-all">
                          <Avatar name={`${u.firstName} ${u.lastName}`} avatarUrl={u.avatarUrl} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words">{u.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-secondary-600 dark:text-secondary-400 mb-1.5 ml-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => { setSubject(e.target.value); setSendError(''); }}
                  placeholder="Email subject..."
                  className="input w-full text-sm"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-secondary-600 dark:text-secondary-400 mb-1.5 ml-1">Message</label>
                <textarea
                  value={body}
                  onChange={(e) => { setBody(e.target.value); setSendError(''); }}
                  placeholder="Write your message..."
                  rows={8}
                  className="input w-full text-sm resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'sent' && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-secondary-200/60 dark:border-secondary-700/50 flex items-center justify-between">
            <button onClick={() => step === 'preview' ? setStep('compose') : onClose()}
              className="btn text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200">
              {step === 'preview' ? (
                <><PencilIcon className="h-4 w-4 mr-1.5" /> Edit</>
              ) : (
                'Cancel'
              )}
            </button>
            {step === 'compose' ? (
              <button onClick={() => setStep('preview')} disabled={!canPreview}
                className={clsx(
                  'btn flex items-center gap-2 text-sm font-semibold transition-all',
                  canPreview
                    ? 'btn-primary shadow-lg shadow-primary-500/25'
                    : 'bg-secondary-100 dark:bg-secondary-800/50 text-secondary-300 dark:text-secondary-600 cursor-not-allowed'
                )}>
                <EyeIcon className="h-4 w-4" />
                Preview
              </button>
            ) : (
              <button onClick={handleSend} disabled={sending}
                className="btn btn-primary flex items-center gap-2 text-sm font-semibold shadow-lg shadow-primary-500/25">
                {sending ? (
                  <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Sending...</>
                ) : (
                  <><PaperAirplaneIcon className="h-4 w-4" /> Send Email</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mock Data (shown when API returns no conversations) ──
const MOCK_CONVERSATIONS: ConversationData[] = [
  {
    id: 'mock-conv-1',
    type: 'DIRECT',
    name: 'Sanjay N',
    participants: [
      { id: 'mock-u1', firstName: 'Sanjay', lastName: 'N', email: 'sanjay@company.com', avatarUrl: '', isOnline: true },
    ],
    lastMessage: {
      id: 'mock-msg-1',
      content: 'Hey! The sprint demo went really well. Can we discuss the feedback from stakeholders?',
      senderId: 'mock-u1',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      type: 'TEXT',
    } as any,
    unreadCount: 2,
    updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    createdAt: '2026-01-15T10:00:00Z',
    isMuted: false,
    isPinned: true,
  },
  {
    id: 'mock-conv-2',
    type: 'GROUP',
    name: 'Engineering Standup',
    participants: [
      { id: 'mock-u1', firstName: 'Sanjay', lastName: 'N', email: 'sanjay@company.com', avatarUrl: '', isOnline: true },
      { id: 'mock-u2', firstName: 'Preethi', lastName: 'S', email: 'preethi@company.com', avatarUrl: '', isOnline: false },
      { id: 'mock-u3', firstName: 'Danish', lastName: 'A G', email: 'danish@company.com', avatarUrl: '', isOnline: true },
    ],
    lastMessage: {
      id: 'mock-msg-2',
      content: 'Standup notes: All blockers resolved. Deploy scheduled for Thursday.',
      senderId: 'mock-u2',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      type: 'TEXT',
    } as any,
    unreadCount: 5,
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: '2026-01-10T09:00:00Z',
    isMuted: false,
    isPinned: false,
  },
  {
    id: 'mock-conv-3',
    type: 'TEAM_CHANNEL',
    name: 'product-engineering',
    participants: [
      { id: 'mock-u1', firstName: 'Sanjay', lastName: 'N', email: 'sanjay@company.com', avatarUrl: '', isOnline: true },
      { id: 'mock-u4', firstName: 'Prasina', lastName: 'Sathish A', email: 'prasina@company.com', avatarUrl: '', isOnline: false },
      { id: 'mock-u5', firstName: 'Danish', lastName: 'A G', email: 'danish@company.com', avatarUrl: '', isOnline: true },
    ],
    lastMessage: {
      id: 'mock-msg-3',
      content: 'New RFC posted: Microservices migration plan for Q2. Please review by Friday.',
      senderId: 'mock-u4',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      type: 'TEXT',
    } as any,
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    createdAt: '2025-12-01T08:00:00Z',
    isMuted: false,
    isPinned: false,
  },
  {
    id: 'mock-conv-4',
    type: 'DIRECT',
    name: 'Danish A G',
    participants: [
      { id: 'mock-u5', firstName: 'Danish', lastName: 'A G', email: 'danish@company.com', avatarUrl: '', isOnline: false },
    ],
    lastMessage: {
      id: 'mock-msg-4',
      content: 'Thanks for the infrastructure review. I\'ll update the terraform configs tonight.',
      senderId: 'mock-u5',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      type: 'TEXT',
    } as any,
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2026-02-01T14:00:00Z',
    isMuted: false,
    isPinned: false,
  },
  {
    id: 'mock-conv-5',
    type: 'GROUP',
    name: 'Q1 Planning',
    participants: [
      { id: 'mock-u1', firstName: 'Sanjay', lastName: 'N', email: 'sanjay@company.com', avatarUrl: '', isOnline: true },
      { id: 'mock-u6', firstName: 'Preethi', lastName: 'S', email: 'preethi@company.com', avatarUrl: '', isOnline: true },
    ],
    lastMessage: {
      id: 'mock-msg-5',
      content: 'Budget approved! Let\'s finalize the hiring plan in our next meeting.',
      senderId: 'mock-u6',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'TEXT',
    } as any,
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2026-01-20T11:00:00Z',
    isMuted: true,
    isPinned: false,
  },
  {
    id: 'mock-conv-6',
    type: 'TEAM_CHANNEL',
    name: 'announcements',
    participants: [
      { id: 'mock-u4', firstName: 'Prasina', lastName: 'Sathish A', email: 'prasina@company.com', avatarUrl: '', isOnline: false },
    ],
    lastMessage: {
      id: 'mock-msg-6',
      content: 'Company all-hands moved to Friday 3PM. Updated calendar invite sent.',
      senderId: 'mock-u4',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'TEXT',
    } as any,
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2025-11-15T08:00:00Z',
    isMuted: false,
    isPinned: false,
  },
] as ConversationData[];

// ════════════════════════════════════════════════════════════════════
// ── Main Chat Page ──
// ════════════════════════════════════════════════════════════════════

export default function ChatPage() {
  usePageTitle('Chat');
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const {
    activeConversationId, setActiveConversation,
    conversations, setConversations,
    messages, setMessages, addMessage,
    onlineUsers, setOnlineUsers, setUserOnline, setUserOffline,
    typingUsers, setTyping,
    markConversationRead, updateConversationLastMessage,
    showNewChat, setShowNewChat,
    editingMessageId, setEditingMessage, updateMessage, updateMessageReactions, updateMessagePinStatus,
    replyingTo, setReplyingTo,
    showSearch, setShowSearch,
    showPinned, setShowPinned,
    showInfo, setShowInfo,
    forwardingMessage, setForwardingMessage,
    removeConversation, updateConversationName, toggleConversationMuted,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [showConvoMenu, setShowConvoMenu] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load conversations
  const { refetch: refetchConversations } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      const data = await chatApi.listConversations();
      setConversations(data);
      return data;
    },
    refetchInterval: 30000,
  });

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) return;
    setLoading(true);
    chatApi.getMessages(activeConversationId)
      .then((data) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    chatApi.markRead(activeConversationId).catch(() => {});
    markConversationRead(activeConversationId);
  }, [activeConversationId]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    if (activeConversationId) socket.emit('chat:join', activeConversationId);

    const handleMessage = (msg: ChatMessageData) => {
      addMessage(msg);
      updateConversationLastMessage(msg.conversationId, msg);
      if (msg.conversationId === activeConversationId && msg.senderId !== user?.id) {
        socket.emit('chat:read', msg.conversationId);
      }
    };
    const handleNotification = (data: { conversationId: string; message: ChatMessageData }) => {
      updateConversationLastMessage(data.conversationId, data.message);
      refetchConversations();
    };
    const handlePresence = (data: { userId: string; status: 'online' | 'offline' }) => {
      data.status === 'online' ? setUserOnline(data.userId) : setUserOffline(data.userId);
    };
    const handleTyping = (data: { userId: string; conversationId: string; isTyping: boolean }) => {
      setTyping(data.conversationId, data.userId, data.isTyping);
    };
    const handleOnlineUsers = (userIds: string[]) => setOnlineUsers(userIds);

    // New socket events for edit/delete/reactions/conversation management
    const handleMessageUpdated = (msg: ChatMessageData) => {
      updateMessage(msg);
    };
    const handleMessageDeleted = (msg: ChatMessageData) => {
      updateMessage(msg);
    };
    const handleReaction = (data: { messageId: string; reactions: any[] }) => {
      updateMessageReactions(data.messageId, data.reactions);
    };
    const handleParticipantLeft = () => {
      refetchConversations();
    };
    const handleConversationRenamed = (data: { conversationId: string; name: string }) => {
      updateConversationName(data.conversationId, data.name);
    };
    const handleMessagePinned = (data: { messageId: string; conversationId: string; isPinned: boolean; pinnedBy: any; pinnedAt: string | null }) => {
      updateMessagePinStatus(data.messageId, data.isPinned, data.pinnedBy, data.pinnedAt);
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:notification', handleNotification);
    socket.on('chat:presence', handlePresence);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:online-users', handleOnlineUsers);
    socket.on('chat:message-updated', handleMessageUpdated);
    socket.on('chat:message-deleted', handleMessageDeleted);
    socket.on('chat:reaction', handleReaction);
    socket.on('chat:participant-left', handleParticipantLeft);
    socket.on('chat:conversation-renamed', handleConversationRenamed);
    socket.on('chat:message-pinned', handleMessagePinned);
    socket.emit('chat:get-online');

    return () => {
      if (activeConversationId) socket.emit('chat:leave', activeConversationId);
      socket.off('chat:message', handleMessage);
      socket.off('chat:notification', handleNotification);
      socket.off('chat:presence', handlePresence);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:online-users', handleOnlineUsers);
      socket.off('chat:message-updated', handleMessageUpdated);
      socket.off('chat:message-deleted', handleMessageDeleted);
      socket.off('chat:reaction', handleReaction);
      socket.off('chat:participant-left', handleParticipantLeft);
      socket.off('chat:conversation-renamed', handleConversationRenamed);
      socket.off('chat:message-pinned', handleMessagePinned);
    };
  }, [socket, activeConversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message (updated with reply support)
  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeConversationId) return;
    const content = input.trim();
    const replyId = replyingTo?.id;
    setInput('');
    setReplyingTo(null);
    if (socket) {
      socket.emit('chat:send', { conversationId: activeConversationId, content, replyToId: replyId });
      socket.emit('chat:typing', { conversationId: activeConversationId, isTyping: false });
    } else {
      try {
        const msg = await chatApi.sendMessage(activeConversationId, content, replyId);
        addMessage(msg);
        updateConversationLastMessage(activeConversationId, msg);
      } catch { /* ignore */ }
    }
    inputRef.current?.focus();
  }, [input, activeConversationId, socket, replyingTo]);

  const handleInputChange = (value: string) => {
    setInput(value);
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
    }
    if (socket && activeConversationId) {
      socket.emit('chat:typing', { conversationId: activeConversationId, isTyping: true });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('chat:typing', { conversationId: activeConversationId, isTyping: false });
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSelectUser = async (targetUser: ChatUser) => {
    try {
      const convo = await chatApi.createDirect(targetUser.id) as any;
      setShowNewChat(false);
      await refetchConversations();
      setActiveConversation(convo.id);
    } catch { /* ignore */ }
  };

  const handleCreateGroup = async (name: string, userIds: string[]) => {
    try {
      const convo = await chatApi.createGroup(name, userIds);
      setShowNewChat(false);
      await refetchConversations();
      setActiveConversation(convo.id);
    } catch { /* ignore */ }
  };

  const handleForwardMessage = useCallback(async (targetConversationId: string) => {
    if (!forwardingMessage || !activeConversationId) return;
    try {
      if (socket) {
        socket.emit('chat:forward', { messageId: forwardingMessage.id, targetConversationId });
      } else {
        await chatApi.forwardMessage(activeConversationId, forwardingMessage.id, targetConversationId);
      }
    } catch { /* ignore */ }
    setForwardingMessage(null);
  }, [forwardingMessage, activeConversationId, socket]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollBtn(!isNearBottom);
  }, []);

  const activeConvo = conversations.find((c) => c.id === activeConversationId);

  const typingText = activeConversationId ? (() => {
    const typingUserId = typingUsers.get(activeConversationId);
    if (!typingUserId || typingUserId === user?.id) return null;
    const participant = activeConvo?.participants.find((p) => p.userId === typingUserId);
    return participant ? participant.firstName : null;
  })() : null;

  // Filtered conversations
  const displayConversations = conversations.length > 0 ? conversations : MOCK_CONVERSATIONS;
  const filteredConvos = sidebarSearch.trim()
    ? displayConversations.filter((c) => c.name?.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : displayConversations;

  return (
    <div className="flex h-[calc(100vh-7.5rem)] overflow-hidden rounded-2xl card shadow-lg">
      {/* ═══ Sidebar ═══ */}
      <div className={clsx(
        'flex flex-col bg-white/60 dark:bg-secondary-900/40 backdrop-blur-xl transition-all duration-300 border-r border-secondary-200/50 dark:border-secondary-700/30',
        showSidebar ? 'w-[340px]' : 'w-0 overflow-hidden',
        'max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-10 max-md:w-[340px]',
        !showSidebar && 'max-md:hidden'
      )}>
        {/* Sidebar Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-display font-bold text-secondary-900 dark:text-white">Messages</h2>
                <p className="text-2xs text-secondary-400 dark:text-secondary-500 font-medium">{displayConversations.length} conversations</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowEmail(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/10 dark:bg-accent-500/15 text-accent-600 dark:text-accent-400 hover:bg-accent-500/20 dark:hover:bg-accent-500/25 transition-all hover:scale-105 active:scale-95"
                title="Compose email">
                <EnvelopeIcon className="h-5 w-5" />
              </button>
              <button onClick={() => setShowNewChat(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 dark:hover:bg-primary-500/25 transition-all hover:scale-105 active:scale-95"
                title="New conversation">
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-secondary-400" />
            <input
              type="text" placeholder="Search conversations..." value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full rounded-xl border-0 bg-secondary-100/80 dark:bg-secondary-800/50 py-2.5 pl-9 pr-3 text-sm text-secondary-900 dark:text-secondary-100 placeholder-secondary-400 dark:placeholder-secondary-500 focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          {filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="rounded-2xl bg-secondary-100/60 dark:bg-secondary-800/30 p-5 mb-4">
                <ChatBubbleOvalLeftEllipsisIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600" />
              </div>
              <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                {sidebarSearch ? 'No results found' : 'No conversations yet'}
              </p>
              {!sidebarSearch && (
                <button onClick={() => setShowNewChat(true)}
                  className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold transition-colors">
                  Start a conversation
                </button>
              )}
            </div>
          ) : (
            filteredConvos.map((convo) => (
              <ConversationItem key={convo.id} convo={convo}
                isActive={convo.id === activeConversationId}
                onClick={() => { setActiveConversation(convo.id); if (window.innerWidth < 768) setShowSidebar(false); }}
                onlineUsers={onlineUsers}
              />
            ))
          )}
        </div>
      </div>

      {/* ═══ Main Chat Area ═══ */}
      <div className="flex flex-1 flex-col min-w-0 bg-secondary-50/50 dark:bg-secondary-950/20">
        {activeConvo ? (
          <>
            {/* Chat Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 bg-white/70 dark:bg-secondary-900/50 backdrop-blur-xl border-b border-secondary-200/50 dark:border-secondary-700/30">
              <button onClick={() => setShowSidebar(true)} className="md:hidden rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition">
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <Avatar
                name={activeConvo.name || 'Chat'}
                avatarUrl={activeConvo.avatarUrl}
                size="lg"
                isOnline={activeConvo.type === 'DIRECT' ? onlineUsers.has(activeConvo.participants.find((p) => p.userId !== user?.id)?.userId || '') : undefined}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-display font-bold text-secondary-900 dark:text-white break-words">{activeConvo.name || 'Chat'}</h3>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                  {activeConvo.type === 'DIRECT'
                    ? (onlineUsers.has(activeConvo.participants.find((p) => p.userId !== user?.id)?.userId || '')
                        ? <span className="text-success-500 font-medium">Online</span>
                        : 'Offline')
                    : `${activeConvo.participants.length} members`
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeConvo.type !== 'DIRECT' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary-100/60 dark:bg-secondary-800/40">
                    <UserGroupIcon className="h-4 w-4 text-secondary-400" />
                    <span className="text-xs font-semibold text-secondary-500 dark:text-secondary-400">{activeConvo.participants.length}</span>
                  </div>
                )}
                {/* Search button */}
                <button onClick={() => setShowSearch(!showSearch)} title="Search messages"
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95',
                    showSearch
                      ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
                      : 'text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800/50'
                  )}>
                  <MagnifyingGlassIcon className="h-4.5 w-4.5" />
                </button>
                {/* Pin button */}
                <button onClick={() => setShowPinned(!showPinned)} title="Pinned messages"
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95',
                    showPinned
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800/50'
                  )}>
                  <MapPinIcon className="h-4.5 w-4.5" />
                </button>
                {/* Info button */}
                <button onClick={() => setShowInfo(!showInfo)} title="Conversation details"
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95',
                    showInfo
                      ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
                      : 'text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800/50'
                  )}>
                  <InformationCircleIcon className="h-4.5 w-4.5" />
                </button>
                {/* Conversation menu */}
                <div className="relative">
                  <button onClick={() => setShowConvoMenu(!showConvoMenu)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800/50 transition-all hover:scale-105 active:scale-95">
                    <EllipsisHorizontalIcon className="h-5 w-5" />
                  </button>
                  {showConvoMenu && (
                    <ConversationMenu convo={activeConvo} onClose={() => setShowConvoMenu(false)} />
                  )}
                </div>
              </div>
            </div>

            {/* Content area with optional search panel */}
            <div className="flex flex-1 min-h-0">
              {/* Messages Area */}
              <div className="flex flex-1 flex-col min-w-0">
                <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto px-5 py-4 space-y-2 relative">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
                        <p className="text-xs text-secondary-400">Loading messages...</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="relative mb-5">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 blur-2xl" />
                        <div className="relative rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 dark:from-primary-500/15 dark:to-accent-500/15 p-6">
                          <PaperAirplaneIcon className="h-10 w-10 text-primary-500/60 dark:text-primary-400/60 -rotate-45" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">Start the conversation</p>
                      <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">Send a message to get things going</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isOwn = msg.senderId === user?.id;
                      const prevMsg = messages[idx - 1];
                      const showSender = !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId ||
                        new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 300000);
                      // Date separator
                      const showDate = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(prevMsg?.createdAt || '').toDateString();
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex items-center gap-3 py-3">
                              <div className="flex-1 h-px bg-secondary-200/60 dark:bg-secondary-700/30" />
                              <span className="text-2xs font-semibold text-secondary-400 dark:text-secondary-500 tracking-wider">
                                {(() => {
                                  const d = new Date(msg.createdAt);
                                  const today = new Date();
                                  const yesterday = new Date(today);
                                  yesterday.setDate(yesterday.getDate() - 1);
                                  if (d.toDateString() === today.toDateString()) return 'Today';
                                  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
                                  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
                                })()}
                              </span>
                              <div className="flex-1 h-px bg-secondary-200/60 dark:bg-secondary-700/30" />
                            </div>
                          )}
                          <MessageBubble
                            message={msg}
                            isOwn={isOwn}
                            showSender={showSender}
                            userId={user?.id || ''}
                            conversationId={activeConversationId!}
                            socket={socket}
                          />
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                  {/* Scroll to bottom button */}
                  {showScrollBtn && (
                    <button onClick={scrollToBottom}
                      className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl shadow-lg ring-1 ring-secondary-200/60 dark:ring-secondary-700/50 text-xs font-semibold text-secondary-600 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] transition-all z-10">
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                      New messages
                    </button>
                  )}
                </div>

                {/* Typing indicator */}
                {typingText && (
                  <div className="px-5 py-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-secondary-400 dark:text-secondary-500">
                      <span className="font-medium">{typingText}</span> is typing <TypingDots />
                    </div>
                  </div>
                )}

                {/* Reply preview bar */}
                {replyingTo && (
                  <div className="flex-shrink-0 px-5 py-2 bg-white/50 dark:bg-secondary-900/30 border-t border-secondary-200/50 dark:border-secondary-700/30">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary-50/60 dark:bg-primary-900/15 ring-1 ring-primary-200/50 dark:ring-primary-700/30">
                      <ArrowUturnLeftIcon className="h-4 w-4 flex-shrink-0 text-primary-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                          Replying to {replyingTo.sender.firstName} {replyingTo.sender.lastName}
                        </p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words">{replyingTo.content}</p>
                      </div>
                      <button onClick={() => setReplyingTo(null)}
                        className="rounded-lg p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-all">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="flex-shrink-0 px-5 py-4 bg-white/70 dark:bg-secondary-900/50 backdrop-blur-xl border-t border-secondary-200/50 dark:border-secondary-700/30">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full resize-none rounded-2xl border border-secondary-200/60 dark:border-secondary-700/40 bg-secondary-50/80 dark:bg-secondary-800/40 px-4 py-3 text-sm text-secondary-900 dark:text-secondary-100 placeholder-secondary-400 dark:placeholder-secondary-500 focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all max-h-32 overflow-y-auto"
                        style={{ minHeight: '46px' }}
                      />
                    </div>
                    <button onClick={handleSend} disabled={!input.trim()}
                      className={clsx(
                        'flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-200',
                        input.trim()
                          ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:scale-105 active:scale-95'
                          : 'bg-secondary-100 dark:bg-secondary-800/50 text-secondary-300 dark:text-secondary-600 cursor-not-allowed'
                      )}>
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Panel */}
              {showSearch && (
                <SearchPanel
                  onSelectResult={(conversationId) => { setActiveConversation(conversationId); }}
                  onClose={() => setShowSearch(false)}
                />
              )}

              {/* Pinned Messages Panel */}
              {showPinned && activeConversationId && (
                <PinnedMessagesPanel
                  conversationId={activeConversationId}
                  onClose={() => setShowPinned(false)}
                />
              )}

              {/* Conversation Info Panel */}
              {showInfo && activeConvo && (
                <ConversationInfoPanel
                  convo={activeConvo}
                  onlineUsers={onlineUsers}
                  onClose={() => setShowInfo(false)}
                />
              )}
            </div>
          </>
        ) : (
          /* ═══ Empty State ═══ */
          <div className={clsx("flex flex-1 flex-col items-center justify-center text-center px-8", showSidebar && "max-md:hidden")}>
            <div className="relative mb-8">
              {/* Glow orbs */}
              <div className="absolute -top-4 -left-4 h-24 w-24 rounded-full bg-primary-500/10 blur-2xl" />
              <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-accent-500/10 blur-2xl" />
              <div className="relative rounded-3xl bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-accent-500/10 dark:from-primary-500/15 dark:via-primary-500/10 dark:to-accent-500/15 p-8 ring-1 ring-primary-500/10 dark:ring-primary-500/20">
                <ChatBubbleLeftRightIcon className="h-16 w-16 text-primary-500/50 dark:text-primary-400/50" />
              </div>
            </div>
            <h3 className="text-2xl font-display font-bold text-secondary-900 dark:text-white mb-2">Team Chat</h3>
            <p className="text-sm text-secondary-500 dark:text-secondary-400 max-w-sm mb-8 leading-relaxed">
              Connect with colleagues through direct messages, group chats, and team channels — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setShowNewChat(true)}
                className="btn btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                New Conversation
              </button>
            </div>

            {/* Feature chips */}
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              {[
                { icon: UserIcon, label: 'Direct Messages' },
                { icon: UsersIcon, label: 'Group Chats' },
                { icon: HashtagIcon, label: 'Team Channels' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-secondary-100/80 dark:bg-secondary-800/40 px-3 py-1.5 text-xs font-medium text-secondary-500 dark:text-secondary-400 ring-1 ring-secondary-200/50 dark:ring-secondary-700/30">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      {showNewChat && (
        <NewChatDialog
          onClose={() => setShowNewChat(false)}
          onSelectUser={handleSelectUser}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {/* Email Compose Modal */}
      {showEmail && (
        <EmailComposeModal onClose={() => setShowEmail(false)} />
      )}

      {/* Forward Message Dialog */}
      {forwardingMessage && (
        <ForwardMessageDialog
          message={forwardingMessage}
          conversations={conversations}
          onClose={() => setForwardingMessage(null)}
          onForward={handleForwardMessage}
        />
      )}
    </div>
  );
}
