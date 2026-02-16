import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AIWorkspaceState {
  /** Whether the user is currently in AI Workspace mode */
  isAiMode: boolean;
  /** Toggle between PMS mode and AI mode */
  toggleAiMode: () => void;
  /** Explicitly set AI mode */
  setAiMode: (mode: boolean) => void;
}

export const useAIWorkspaceStore = create<AIWorkspaceState>()(
  persist(
    (set) => ({
      isAiMode: false,

      toggleAiMode: () =>
        set((state) => ({ isAiMode: !state.isAiMode })),

      setAiMode: (mode: boolean) =>
        set({ isAiMode: mode }),
    }),
    {
      name: 'pms-ai-workspace',
    },
  ),
);
