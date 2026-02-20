import { create } from 'zustand';

interface LoadingState {
  isLoading: boolean;
  progress: number;
  startLoading: () => void;
  stopLoading: () => void;
}

let trickleInterval: ReturnType<typeof setInterval> | null = null;

export const useLoadingStore = create<LoadingState>((set, get) => ({
  isLoading: false,
  progress: 0,

  startLoading: () => {
    if (trickleInterval) clearInterval(trickleInterval);

    set({ isLoading: true, progress: 10 });

    // Trickle progress: gradually slow down as it approaches 90%
    trickleInterval = setInterval(() => {
      const { progress } = get();
      if (progress >= 90) {
        if (trickleInterval) clearInterval(trickleInterval);
        return;
      }
      const increment = progress < 30 ? 10 : progress < 60 ? 5 : 2;
      set({ progress: Math.min(progress + increment, 90) });
    }, 200);
  },

  stopLoading: () => {
    if (trickleInterval) {
      clearInterval(trickleInterval);
      trickleInterval = null;
    }

    set({ progress: 100 });

    // After animation completes, reset
    setTimeout(() => {
      set({ isLoading: false, progress: 0 });
    }, 300);
  },
}));
