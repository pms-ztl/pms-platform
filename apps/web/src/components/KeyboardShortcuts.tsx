import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { useThemeStore } from '@/store/theme';

// ── Shortcut Data ────────────────────────────────────────────────────────────

const SHORTCUT_GROUPS = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl/⌘', 'K'], description: 'Open command palette' },
      { keys: ['G', '→', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', '→', 'G'], description: 'Go to Goals' },
      { keys: ['G', '→', 'R'], description: 'Go to Reviews' },
      { keys: ['G', '→', 'F'], description: 'Go to Feedback' },
      { keys: ['G', '→', 'S'], description: 'Go to Settings' },
    ],
  },
  {
    label: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close dialog / Cancel' },
    ],
  },
  {
    label: 'Theme',
    shortcuts: [
      { keys: ['Ctrl/⌘', 'Shift', 'L'], description: 'Toggle light / dark mode' },
    ],
  },
];

// Go-to mapping: second key → path
const GO_TO_MAP: Record<string, string> = {
  d: '/dashboard',
  g: '/goals',
  r: '/reviews',
  f: '/feedback',
  s: '/settings',
};

// ── Component ────────────────────────────────────────────────────────────────

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const lastKeyRef = useRef<string | null>(null);
  const lastKeyTimeRef = useRef(0);

  const isInputFocused = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if ((el as HTMLElement).isContentEditable) return true;
    return false;
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if in input
      if (isInputFocused()) return;

      // ? → Show shortcuts (Shift + / on most keyboards)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Ctrl/Cmd + Shift + L → Toggle theme
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        return;
      }

      // Two-key "G then X" sequences
      const now = Date.now();
      const key = e.key.toLowerCase();

      if (key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        lastKeyRef.current = 'g';
        lastKeyTimeRef.current = now;
        return;
      }

      if (
        lastKeyRef.current === 'g' &&
        now - lastKeyTimeRef.current < 1000 &&
        GO_TO_MAP[key]
      ) {
        e.preventDefault();
        navigate(GO_TO_MAP[key]);
        lastKeyRef.current = null;
        return;
      }

      // Reset if timeout or different key
      lastKeyRef.current = null;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isInputFocused, navigate, theme, setTheme]);

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Keyboard Shortcuts" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.label}>
            <h3 className="text-xs font-bold tracking-widest text-secondary-500 dark:text-secondary-400 mb-3">
              {group.label}
            </h3>
            <ul className="space-y-2">
              {group.shortcuts.map((shortcut, idx) => (
                <li key={idx} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-secondary-700 dark:text-secondary-300">
                    {shortcut.description}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {shortcut.keys.map((key, i) => (
                      <span key={i}>
                        {key === '→' ? (
                          <span className="text-[11px] text-secondary-400 mx-0.5">then</span>
                        ) : (
                          <kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-600">
                            {key}
                          </kbd>
                        )}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-secondary-100 dark:border-secondary-700">
        <p className="text-xs text-secondary-400 dark:text-secondary-500 text-center">
          Press <kbd className="px-1 py-0.5 text-[10px] font-mono rounded bg-secondary-100 dark:bg-secondary-700 border border-secondary-200 dark:border-secondary-600">?</kbd> anywhere to toggle this overlay
        </p>
      </div>
    </Modal>
  );
}
