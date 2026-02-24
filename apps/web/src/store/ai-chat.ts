/**
 * AI Chat Widget State — Zustand store with persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AIChatState {
  isOpen: boolean;
  activeConversationId: string | null;
  agentType: string | null;
  historyOpen: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setConversation: (id: string | null) => void;
  setAgentType: (type: string | null) => void;
  setHistoryOpen: (open: boolean) => void;
  reset: () => void;
}

export const useAIChatStore = create<AIChatState>()(
  persist(
    (set) => ({
      isOpen: false,
      activeConversationId: null,
      agentType: null,
      historyOpen: false,
      setOpen: (open) => set({ isOpen: open }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setConversation: (id) => set({ activeConversationId: id }),
      setAgentType: (type) => set({ agentType: type }),
      setHistoryOpen: (open) => set({ historyOpen: open }),
      reset: () =>
        set({
          isOpen: false,
          activeConversationId: null,
          agentType: null,
          historyOpen: false,
        }),
    }),
    {
      name: 'pms-ai-chat',
      partialize: (state) => ({
        activeConversationId: state.activeConversationId,
        agentType: state.agentType,
      }),
    },
  ),
);
