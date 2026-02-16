/**
 * ConversationBar - Bottom bar showing recent conversation history as tabs.
 *
 * Displays a horizontally scrollable row of conversation tabs with the
 * active one highlighted by a gradient border. Includes a "+ New Chat"
 * button to start a fresh conversation. Uses aiApi.getConversations().
 */

import { useQuery } from '@tanstack/react-query';
import {
  PlusIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { aiApi, type AIConversation } from '@/lib/api';

// ── Agent Icons ───────────────────────────────────────────────

const AGENT_ICONS: Record<string, string> = {
  performance: '\uD83C\uDFAF',
  analytics: '\uD83D\uDCCA',
  feedback: '\uD83D\uDCAC',
  hr: '\uD83D\uDC65',
  report: '\uD83D\uDCCB',
  goals: '\uD83C\uDFC6',
  onboarding: '\uD83C\uDF93',
  security: '\uD83D\uDD12',
  notification: '\uD83D\uDD14',
  nlp_query: '\uD83D\uDD0D',
  career: '\uD83D\uDE80',
};

// ── Truncate Helper ───────────────────────────────────────────

function truncate(str: string | null, max: number): string {
  if (!str) return 'New conversation';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

// ── Relative Time ─────────────────────────────────────────────

function shortTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ── Props ─────────────────────────────────────────────────────

interface ConversationBarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

// ── Component ─────────────────────────────────────────────────

export function ConversationBar({
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ConversationBarProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: () => aiApi.getConversations({ limit: 20 }),
    refetchInterval: 30_000,
  });

  const conversations: AIConversation[] = Array.isArray(data) ? data : [];

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
          !activeConversationId
            ? 'border-purple-500/40 bg-purple-500/10 text-purple-300 shadow-sm shadow-purple-500/20'
            : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-300'
        }`}
      >
        <PlusIcon className="h-3.5 w-3.5" />
        <span className="whitespace-nowrap">New Chat</span>
      </button>

      {/* Divider */}
      {conversations.length > 0 && (
        <div className="h-5 w-px flex-shrink-0 bg-white/10" />
      )}

      {/* Loading state */}
      {isLoading && (
        <>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-32 flex-shrink-0 animate-pulse rounded-lg bg-white/5"
            />
          ))}
        </>
      )}

      {/* Conversation Tabs */}
      {conversations.map((conv) => {
        const isActive = conv.id === activeConversationId;
        const icon = AGENT_ICONS[conv.agentType] ?? '\uD83E\uDD16';

        return (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`group flex flex-shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 transition-all duration-200 ${
              isActive
                ? 'border-transparent bg-gradient-to-r from-purple-500/15 via-blue-500/15 to-cyan-500/15 text-white shadow-sm ring-1 ring-purple-500/30'
                : 'border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <span className="text-sm">{icon}</span>
            <span className="text-xs whitespace-nowrap max-w-[120px] truncate">
              {truncate(conv.title, 20)}
            </span>
            <span className="text-[10px] text-gray-600 flex-shrink-0">
              {shortTimeAgo(conv.updatedAt)}
            </span>
            {conv.messageCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/10 px-1 text-[9px] text-gray-500">
                {conv.messageCount}
              </span>
            )}
          </button>
        );
      })}

      {/* Empty state */}
      {!isLoading && conversations.length === 0 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
          <span>No conversations yet</span>
        </div>
      )}
    </div>
  );
}
