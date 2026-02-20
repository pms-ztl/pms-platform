import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'deep-dark' | 'system';

interface ThemeState {
  theme: Theme;
  compactMode: boolean;
  animationsEnabled: boolean;
  setTheme: (theme: Theme) => void;
  setCompactMode: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
}

const getSystemTheme = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

  if (effectiveTheme === 'dark' || effectiveTheme === 'deep-dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // deep-dark adds an extra class for pure-black backgrounds
  if (effectiveTheme === 'deep-dark') {
    root.classList.add('deep-dark');
  } else {
    root.classList.remove('deep-dark');
  }
};

const applyCompactMode = (enabled: boolean) => {
  const root = document.documentElement;
  if (enabled) {
    root.classList.add('compact');
  } else {
    root.classList.remove('compact');
  }
};

const applyAnimations = (enabled: boolean) => {
  const root = document.documentElement;
  if (!enabled) {
    root.classList.add('no-animations');
  } else {
    root.classList.remove('no-animations');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      compactMode: false,
      animationsEnabled: true,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setCompactMode: (enabled) => {
        applyCompactMode(enabled);
        set({ compactMode: enabled });
      },
      setAnimationsEnabled: (enabled) => {
        applyAnimations(enabled);
        set({ animationsEnabled: enabled });
      },
    }),
    {
      name: 'pms-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyCompactMode(state.compactMode);
          applyAnimations(state.animationsEnabled);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme(theme);
    }
  });
}
