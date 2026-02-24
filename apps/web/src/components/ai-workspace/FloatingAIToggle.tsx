/**
 * FloatingAIToggle — Small floating pill at the bottom-right of the screen.
 *
 * This component is ONLY rendered inside the AI Workspace (AIWorkspaceLayout).
 * It shows a theme picker (Light / Dark / Abyss) + Exit AI button.
 *
 * In PMS mode, the DashboardLayout shows a separate simple entry button.
 */

import { useState, useRef, useEffect } from 'react';
import {
  SunIcon,
  MoonIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAIWorkspaceStore, type AITheme } from '@/store/ai-workspace';

// ── Theme display config ─────────────────────────────────────

const THEME_META: Record<AITheme, { label: string; icon: typeof SunIcon; color: string; activeBg: string; dotColor: string }> = {
  light: {
    label: 'Light',
    icon: SunIcon,
    color: 'text-amber-500',
    activeBg: 'bg-amber-500/15',
    dotColor: 'bg-amber-400',
  },
  dark: {
    label: 'Dark',
    icon: MoonIcon,
    color: 'text-purple-400',
    activeBg: 'bg-purple-500/15',
    dotColor: 'bg-purple-400',
  },
  'deep-dark': {
    label: 'Abyss',
    icon: MoonIcon,
    color: 'text-cyan-400',
    activeBg: 'bg-cyan-500/15',
    dotColor: 'bg-cyan-400',
  },
};

// ── Component ────────────────────────────────────────────────

export function FloatingAIToggle() {
  const { theme, setTheme, aiTransitionPhase, setAiTransitionPhase } = useAIWorkspaceStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  const meta = THEME_META[theme];
  const ThemeIcon = meta.icon;

  // Pill styling based on current theme
  const pillClasses =
    theme === 'light'
      ? 'bg-white text-gray-700 ring-1 ring-gray-200 shadow-md'
      : theme === 'dark'
      ? 'bg-gray-800 text-purple-400 ring-1 ring-purple-500/30 shadow-lg shadow-purple-500/20'
      : 'bg-gray-950 text-cyan-400 ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-500/20';

  return (
    <div ref={menuRef} className="fixed bottom-5 right-5 z-50" style={{ fontSize: 16 }}>
      {/* Pop-up menu */}
      {menuOpen && (
        <div className="absolute bottom-full right-0 mb-2 min-w-[140px] rounded-xl bg-gray-900/95 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Theme section label */}
          <div className="px-2 py-1 text-2xs font-semibold tracking-wider text-gray-500">
            Theme
          </div>

          {/* Theme buttons */}
          {(['light', 'dark', 'deep-dark'] as AITheme[]).map((t) => {
            const m = THEME_META[t];
            const Icon = m.icon;
            const isActive = theme === t;
            return (
              <button
                key={t}
                onClick={() => { setTheme(t); }}
                className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? `${m.activeBg} ${m.color}`
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? m.color : ''}`} />
                <span className="flex-1 text-left">{m.label}</span>
                {isActive && <span className={`h-1.5 w-1.5 rounded-full ${m.dotColor}`} />}
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-1.5 border-t border-white/10" />

          {/* Exit AI mode */}
          <button
            onClick={() => {
              if (aiTransitionPhase === 'idle') {
                setAiTransitionPhase('exiting');
                setMenuOpen(false);
              }
            }}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Exit AI Mode</span>
          </button>
        </div>
      )}

      {/* Main toggle pill */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-2 transition-all duration-300 hover:scale-105 active:scale-95 ${pillClasses}`}
        title="Theme & Settings"
      >
        <ThemeIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
