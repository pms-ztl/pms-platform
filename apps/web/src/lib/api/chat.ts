// ============================================================================
// Chat API
// ============================================================================

import { api } from './client';

export interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isActive?: boolean;
  email?: string;
  jobTitle?: string;
}

export interface ChatParticipant {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
}

export interface ReplyToData {
  id: string;
  content: string;
  senderId: string;
  sender: { id: string; firstName: string; lastName: string };
  deletedAt: string | null;
}

export interface ForwardedFromData {
  id: string;
  content: string;
  senderId: string;
  sender: { id: string; firstName: string; lastName: string };
}

export interface PinnedByData {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ChatMessageData {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'SYSTEM';
  reactions: Array<{ emoji: string; userId: string; createdAt: string }> | null;
  replyToId: string | null;
  replyTo: ReplyToData | null;
  isPinned: boolean;
  pinnedById: string | null;
  pinnedAt: string | null;
  pinnedBy: PinnedByData | null;
  forwardedFromId: string | null;
  forwardedFrom: ForwardedFromData | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  sender: ChatUser;
}

export interface LastMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

export interface ConversationData {
  id: string;
  type: 'DIRECT' | 'GROUP' | 'TEAM_CHANNEL';
  name: string | null;
  avatarUrl: string | null;
  teamId: string | null;
  teamName: string | null;
  participants: ChatParticipant[];
  lastMessage: LastMessage | null;
  lastMessageAt: string | null;
  hasUnread: boolean;
  unreadCount: number;
  pinnedCount: number;
  isMuted: boolean;
  createdAt: string;
}

export interface TeamWithChannel {
  id: string;
  name: string;
  code: string;
  chatChannel: { id: string }[];
  _count: { members: number };
}

export interface SearchResultData {
  id: string;
  content: string;
  senderId: string;
  sender: ChatUser;
  createdAt: string;
  conversationId: string;
  conversationName: string;
  conversationType: string;
}

export const chatApi = {
  // Conversations
  listConversations: () =>
    api.get<ConversationData[]>('/chat/conversations'),

  getConversation: (id: string) =>
    api.get<ConversationData>(`/chat/conversations/${id}`),

  createDirect: (targetUserId: string) =>
    api.post<ConversationData>('/chat/conversations/direct', { targetUserId }),

  createGroup: (name: string, participantIds: string[]) =>
    api.post<ConversationData>('/chat/conversations/group', { name, participantIds }),

  createTeamChannel: (teamId: string) =>
    api.post<ConversationData>('/chat/conversations/team-channel', { teamId }),

  addParticipants: (conversationId: string, userIds: string[]) =>
    api.post<ConversationData>(`/chat/conversations/${conversationId}/participants`, { userIds }),

  leaveConversation: (conversationId: string) =>
    api.post<{ left: boolean }>(`/chat/conversations/${conversationId}/leave`),

  renameConversation: (conversationId: string, name: string) =>
    api.put<ConversationData>(`/chat/conversations/${conversationId}/name`, { name }),

  toggleMuteConversation: (conversationId: string) =>
    api.post<{ muted: boolean }>(`/chat/conversations/${conversationId}/mute`),

  // Messages
  getMessages: (conversationId: string, before?: string, limit?: number) =>
    api.get<ChatMessageData[]>(`/chat/conversations/${conversationId}/messages`, {
      params: { before, limit },
    }),

  sendMessage: (conversationId: string, content: string, replyToId?: string) =>
    api.post<ChatMessageData>(`/chat/conversations/${conversationId}/messages`, { content, replyToId }),

  editMessage: (conversationId: string, messageId: string, content: string) =>
    api.put<ChatMessageData>(`/chat/conversations/${conversationId}/messages/${messageId}`, { content }),

  deleteMessage: (conversationId: string, messageId: string) =>
    api.delete<ChatMessageData>(`/chat/conversations/${conversationId}/messages/${messageId}`),

  toggleReaction: (conversationId: string, messageId: string, emoji: string) =>
    api.post<{ message: ChatMessageData; action: string }>(`/chat/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji }),

  togglePin: (conversationId: string, messageId: string) =>
    api.post<ChatMessageData>(`/chat/conversations/${conversationId}/messages/${messageId}/pin`),

  getPinnedMessages: (conversationId: string) =>
    api.get<ChatMessageData[]>(`/chat/conversations/${conversationId}/pinned`),

  forwardMessage: (conversationId: string, messageId: string, targetConversationId: string) =>
    api.post<ChatMessageData>(`/chat/conversations/${conversationId}/messages/${messageId}/forward`, { targetConversationId }),

  markRead: (conversationId: string) =>
    api.post(`/chat/conversations/${conversationId}/read`),

  searchMessages: (q: string, conversationId?: string) =>
    api.get<SearchResultData[]>('/chat/messages/search', { params: { q, conversationId } }),

  getUnreadCounts: () =>
    api.get<Record<string, number>>('/chat/messages/unread-counts'),

  // Email
  sendEmail: (to: string, subject: string, body: string) =>
    api.post<{ sent: boolean }>('/chat/email/send', { to, subject, body }),

  aiDraftEmail: (prompt: string, context?: string) =>
    api.post<{ subject: string; body: string; metadata?: Record<string, unknown> }>('/chat/email/ai-draft', { prompt, context }),

  // Users & Teams
  searchUsers: (q: string) =>
    api.get<ChatUser[]>('/chat/users/search', { params: { q } }),

  getUserTeams: () =>
    api.get<TeamWithChannel[]>('/chat/teams'),
};
