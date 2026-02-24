/**
 * AI Tasks Store — state management for agentic task tracking + approvals.
 */

import { create } from 'zustand';
import { aiApi, type AgentTask, type AgentTaskAction } from '@/lib/api/ai';

interface AITasksState {
  /** All user tasks */
  tasks: AgentTask[];
  /** Actions awaiting user approval */
  pendingApprovals: AgentTaskAction[];
  /** Currently selected task for detail view */
  selectedTaskId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  // Actions
  fetchTasks: (status?: string) => Promise<void>;
  fetchTask: (id: string) => Promise<AgentTask | null>;
  fetchPendingApprovals: () => Promise<void>;
  setSelectedTask: (id: string | null) => void;
  cancelTask: (id: string) => Promise<void>;
  approveAction: (id: string) => Promise<void>;
  rejectAction: (id: string, reason: string) => Promise<void>;
  /** Auto-refresh: poll for task updates */
  refreshActiveTasks: () => Promise<void>;
}

export const useAITasksStore = create<AITasksState>((set, get) => ({
  tasks: [],
  pendingApprovals: [],
  selectedTaskId: null,
  isLoading: false,
  error: null,

  fetchTasks: async (status?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await aiApi.getTasks({ status, limit: 50 });
      const tasks = (res as any).data?.data ?? (res as any).data ?? [];
      set({ tasks, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchTask: async (id: string) => {
    try {
      const res = await aiApi.getTask(id);
      const task = (res as any).data?.data ?? (res as any).data ?? null;
      if (task) {
        // Update in tasks list
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? task : t)),
        }));
      }
      return task;
    } catch {
      return null;
    }
  },

  fetchPendingApprovals: async () => {
    try {
      const res = await aiApi.getPendingApprovals();
      const approvals = (res as any).data?.data ?? (res as any).data ?? [];
      set({ pendingApprovals: approvals });
    } catch (err) {
      console.error('Failed to fetch pending approvals', err);
    }
  },

  setSelectedTask: (id: string | null) => set({ selectedTaskId: id }),

  cancelTask: async (id: string) => {
    try {
      await aiApi.cancelTask(id);
      // Refresh
      get().fetchTasks();
      get().fetchPendingApprovals();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  approveAction: async (id: string) => {
    try {
      await aiApi.approveAction(id);
      // Refresh both tasks and approvals
      get().fetchTasks();
      get().fetchPendingApprovals();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  rejectAction: async (id: string, reason: string) => {
    try {
      await aiApi.rejectAction(id, reason);
      get().fetchTasks();
      get().fetchPendingApprovals();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  refreshActiveTasks: async () => {
    const { tasks } = get();
    const activeTasks = tasks.filter((t) =>
      ['planning', 'executing', 'awaiting_approval'].includes(t.status),
    );

    for (const task of activeTasks) {
      await get().fetchTask(task.id);
    }
    await get().fetchPendingApprovals();
  },
}));
