import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AccentColor, applyAccentColor } from '@/lib/accent-colors';

export type Theme = 'light' | 'deep-dark' | 'system';

interface ThemeState {
  theme: Theme;
  accentColor: AccentColor;
  compactMode: boolean;
  animationsEnabled: boolean;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setCompactMode: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
}

const getSystemTheme = (): 'light' | 'deep-dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'deep-dark' : 'light';
  }
  return 'deep-dark';
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

  if (effectiveTheme === 'deep-dark') {
    root.classList.add('dark', 'deep-dark');
  } else {
    root.classList.remove('dark', 'deep-dark');
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
      theme: 'deep-dark' as Theme,
      accentColor: 'violet' as AccentColor,
      compactMode: false,
      animationsEnabled: true,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setAccentColor: (color) => {
        applyAccentColor(color);
        set({ accentColor: color });
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
          // Migrate legacy 'dark' → 'deep-dark' (removed blueish dark mode)
          if ((state.theme as string) === 'dark') state.theme = 'deep-dark';
          applyTheme(state.theme);
          applyAccentColor(state.accentColor ?? 'violet');
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
