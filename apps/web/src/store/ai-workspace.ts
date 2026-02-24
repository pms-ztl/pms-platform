import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AITheme = 'light' | 'dark' | 'deep-dark';
export type SwarmMode = 'overview' | 'chat' | 'orchestrate' | 'tasks';
export type AITransitionPhase = 'idle' | 'entering' | 'exiting';

interface AIWorkspaceState {
  /** Whether the user is currently in AI Workspace mode */
  isAiMode: boolean;
  /** Current AI workspace theme */
  theme: AITheme;
  /** Current Neural Swarm mode */
  swarmMode: SwarmMode;
  /** Selected agent type for chat mode */
  selectedAgent: string | null;
  /** Active agents in orchestration mode */
  orchestrationAgents: string[];
  /** Whether the agent panel sidebar is open */
  agentPanelOpen: boolean;
  /** Whether the insight panel sidebar is open */
  insightPanelOpen: boolean;
  /** Toggle between PMS mode and AI mode */
  toggleAiMode: () => void;
  /** Explicitly set AI mode */
  setAiMode: (mode: boolean) => void;
  /** Cycle through themes: light -> dark -> deep-dark -> light */
  cycleTheme: () => void;
  /** Set a specific theme */
  setTheme: (theme: AITheme) => void;
  /** Set swarm mode */
  setSwarmMode: (mode: SwarmMode) => void;
  /** Set selected agent */
  setSelectedAgent: (agent: string | null) => void;
  /** Add agent to orchestration */
  addOrchestrationAgent: (agent: string) => void;
  /** Remove agent from orchestration */
  removeOrchestrationAgent: (agent: string) => void;
  /** Clear orchestration agents */
  clearOrchestrationAgents: () => void;
  /** Toggle agent panel */
  toggleAgentPanel: () => void;
  /** Toggle insight panel */
  toggleInsightPanel: () => void;
  /** Cinematic transition phase (NOT persisted) */
  aiTransitionPhase: AITransitionPhase;
  /** Set the cinematic transition phase */
  setAiTransitionPhase: (phase: AITransitionPhase) => void;
}

const THEME_ORDER: AITheme[] = ['light', 'dark', 'deep-dark'];

export const useAIWorkspaceStore = create<AIWorkspaceState>()(
  persist(
    (set) => ({
      isAiMode: false,
      theme: 'dark',
      swarmMode: 'overview' as SwarmMode,
      selectedAgent: null,
      orchestrationAgents: [] as string[],
      agentPanelOpen: true,
      insightPanelOpen: true,
      aiTransitionPhase: 'idle' as AITransitionPhase,

      toggleAiMode: () =>
        set((state) => ({ isAiMode: !state.isAiMode })),

      setAiMode: (mode: boolean) =>
        set({ isAiMode: mode }),

      cycleTheme: () =>
        set((state) => {
          const idx = THEME_ORDER.indexOf(state.theme);
          const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
          return { theme: next };
        }),

      setTheme: (theme: AITheme) =>
        set({ theme }),

      setSwarmMode: (mode: SwarmMode) =>
        set({ swarmMode: mode }),

      setSelectedAgent: (agent: string | null) =>
        set({ selectedAgent: agent }),

      addOrchestrationAgent: (agent: string) =>
        set((state) => ({
          orchestrationAgents: state.orchestrationAgents.includes(agent)
            ? state.orchestrationAgents
            : [...state.orchestrationAgents, agent].slice(0, 5), // max 5 agents
        })),

      removeOrchestrationAgent: (agent: string) =>
        set((state) => ({
          orchestrationAgents: state.orchestrationAgents.filter((a) => a !== agent),
        })),

      clearOrchestrationAgents: () =>
        set({ orchestrationAgents: [] }),

      toggleAgentPanel: () =>
        set((state) => ({ agentPanelOpen: !state.agentPanelOpen })),

      toggleInsightPanel: () =>
        set((state) => ({ insightPanelOpen: !state.insightPanelOpen })),

      setAiTransitionPhase: (phase: AITransitionPhase) =>
        set({ aiTransitionPhase: phase }),
    }),
    {
      name: 'pms-ai-workspace',
      // Exclude transient UI state from persistence
      partialize: (state) => ({
        isAiMode: state.isAiMode,
        theme: state.theme,
        // swarmMode excluded — always starts at 'overview' on fresh page load;
        // in-session mode switches are preserved in memory
        selectedAgent: state.selectedAgent,
        orchestrationAgents: state.orchestrationAgents,
        agentPanelOpen: state.agentPanelOpen,
        insightPanelOpen: state.insightPanelOpen,
      }),
    },
  ),
);
