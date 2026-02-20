import { create } from 'zustand';
import type { ConversationData, ChatMessageData } from '@/lib/api/chat';

interface ChatState {
  // Active conversation
  activeConversationId: string | null;
  conversations: ConversationData[];
  messages: ChatMessageData[];
  onlineUsers: Set<string>;
  typingUsers: Map<string, string>; // conversationId -> userId

  // New conversation dialog
  showNewChat: boolean;

  // Edit & Reply state
  editingMessageId: string | null;
  replyingTo: ChatMessageData | null;

  // Search state
  showSearch: boolean;

  // Pinned messages panel
  showPinned: boolean;

  // Info panel
  showInfo: boolean;

  // Forward dialog
  forwardingMessage: ChatMessageData | null;

  // Actions
  setActiveConversation: (id: string | null) => void;
  setConversations: (convos: ConversationData[]) => void;
  setMessages: (msgs: ChatMessageData[]) => void;
  addMessage: (msg: ChatMessageData) => void;
  prependMessages: (msgs: ChatMessageData[]) => void;
  updateMessage: (msg: ChatMessageData) => void;
  updateMessageReactions: (messageId: string, reactions: any[]) => void;
  updateMessagePinStatus: (messageId: string, isPinned: boolean, pinnedBy: any, pinnedAt: string | null) => void;
  setOnlineUsers: (userIds: string[]) => void;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  markConversationRead: (conversationId: string) => void;
  updateConversationLastMessage: (conversationId: string, msg: ChatMessageData) => void;
  setShowNewChat: (show: boolean) => void;
  setEditingMessage: (id: string | null) => void;
  setReplyingTo: (msg: ChatMessageData | null) => void;
  setShowSearch: (show: boolean) => void;
  setShowPinned: (show: boolean) => void;
  setShowInfo: (show: boolean) => void;
  setForwardingMessage: (msg: ChatMessageData | null) => void;
  removeConversation: (conversationId: string) => void;
  updateConversationName: (conversationId: string, name: string) => void;
  toggleConversationMuted: (conversationId: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  activeConversationId: null,
  conversations: [],
  messages: [],
  onlineUsers: new Set<string>(),
  typingUsers: new Map<string, string>(),
  showNewChat: false,
  editingMessageId: null,
  replyingTo: null,
  showSearch: false,
  showPinned: false,
  showInfo: false,
  forwardingMessage: null,

  setActiveConversation: (id) => set({ activeConversationId: id, messages: [], editingMessageId: null, replyingTo: null, showPinned: false, showInfo: false }),
  setConversations: (convos) => set({ conversations: convos }),
  setMessages: (msgs) => set({ messages: msgs }),

  addMessage: (msg) =>
    set((state) => ({
      messages: state.activeConversationId === msg.conversationId
        ? [...state.messages, msg]
        : state.messages,
    })),

  prependMessages: (msgs) =>
    set((state) => ({ messages: [...msgs, ...state.messages] })),

  updateMessage: (msg) =>
    set((state) => ({
      messages: state.messages.map((m) => m.id === msg.id ? msg : m),
    })),

  updateMessageReactions: (messageId, reactions) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      ),
    })),

  updateMessagePinStatus: (messageId, isPinned, pinnedBy, pinnedAt) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, isPinned, pinnedBy, pinnedAt } : m
      ),
    })),

  setOnlineUsers: (userIds) => set({ onlineUsers: new Set(userIds) }),

  setUserOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),

  setUserOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const next = new Map(state.typingUsers);
      if (isTyping) {
        next.set(conversationId, userId);
      } else {
        next.delete(conversationId);
      }
      return { typingUsers: next };
    }),

  markConversationRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, hasUnread: false, unreadCount: 0 } : c
      ),
    })),

  updateConversationLastMessage: (conversationId, msg) =>
    set((state) => {
      const updated = state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: {
                id: msg.id,
                content: msg.content,
                senderId: msg.senderId,
                senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
                createdAt: msg.createdAt,
              },
              lastMessageAt: msg.createdAt,
              hasUnread: state.activeConversationId !== conversationId,
              unreadCount: state.activeConversationId !== conversationId
                ? (c.unreadCount || 0) + 1
                : 0,
            }
          : c
      );
      // Sort by lastMessageAt descending
      updated.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });
      return { conversations: updated };
    }),

  setShowNewChat: (show) => set({ showNewChat: show }),
  setEditingMessage: (id) => set({ editingMessageId: id }),
  setReplyingTo: (msg) => set({ replyingTo: msg }),
  setShowSearch: (show) => set({ showSearch: show, showPinned: show ? false : undefined, showInfo: show ? false : undefined }),
  setShowPinned: (show) => set({ showPinned: show, showSearch: show ? false : undefined, showInfo: show ? false : undefined }),
  setShowInfo: (show) => set({ showInfo: show, showSearch: show ? false : undefined, showPinned: show ? false : undefined }),
  setForwardingMessage: (msg) => set({ forwardingMessage: msg }),

  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
    })),

  updateConversationName: (conversationId, name) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, name } : c
      ),
    })),

  toggleConversationMuted: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isMuted: !c.isMuted } : c
      ),
    })),

  reset: () =>
    set({
      activeConversationId: null,
      conversations: [],
      messages: [],
      onlineUsers: new Set(),
      typingUsers: new Map(),
      showNewChat: false,
      editingMessageId: null,
      replyingTo: null,
      showSearch: false,
      showPinned: false,
      showInfo: false,
      forwardingMessage: null,
    }),
}));
