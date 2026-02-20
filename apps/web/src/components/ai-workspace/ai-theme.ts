/**
 * AI Workspace Theme Utilities
 *
 * Three themes:
 * - light: White/gray backgrounds, dark text, blue accents
 * - dark: Gray-950 backgrounds, white text, purple→cyan accents (original)
 * - deep-dark: Pure black backgrounds, cyan/emerald accents, no purple
 */

import type { AITheme } from '@/store/ai-workspace';

// ── Base surface classes ─────────────────────────────────────

export function bg(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'bg-gray-50';
    case 'dark':
      return 'bg-gray-950';
    case 'deep-dark':
      return 'bg-black';
  }
}

export function surface(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'bg-white border-gray-200';
    case 'dark':
      return 'bg-white/5 backdrop-blur-xl border-white/10';
    case 'deep-dark':
      return 'bg-white/[0.03] backdrop-blur-xl border-white/[0.06]';
  }
}

export function surfaceHover(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'hover:bg-gray-50';
    case 'dark':
      return 'hover:bg-white/10';
    case 'deep-dark':
      return 'hover:bg-white/[0.06]';
  }
}

// ── Text colors ──────────────────────────────────────────────

export function textPrimary(theme: AITheme) {
  return theme === 'light' ? 'text-gray-900' : 'text-white';
}

export function textSecondary(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'text-gray-500';
    case 'dark':
      return 'text-gray-400';
    case 'deep-dark':
      return 'text-gray-500';
  }
}

export function textMuted(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'text-gray-400';
    case 'dark':
      return 'text-gray-500';
    case 'deep-dark':
      return 'text-gray-600';
  }
}

// ── Border colors ────────────────────────────────────────────

export function border(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'border-gray-200';
    case 'dark':
      return 'border-white/10';
    case 'deep-dark':
      return 'border-white/[0.06]';
  }
}

export function borderLight(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'border-gray-100';
    case 'dark':
      return 'border-white/5';
    case 'deep-dark':
      return 'border-white/[0.03]';
  }
}

// ── Accent colors (gradients, glows) ─────────────────────────

export function accentGradient(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'from-blue-600 to-indigo-600';
    case 'dark':
      return 'from-purple-600 to-blue-600';
    case 'deep-dark':
      return 'from-cyan-500 to-emerald-500';
  }
}

export function accentGlow(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'shadow-blue-500/25';
    case 'dark':
      return 'shadow-purple-500/25';
    case 'deep-dark':
      return 'shadow-cyan-500/25';
  }
}

export function accentText(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'text-blue-600';
    case 'dark':
      return 'text-purple-400';
    case 'deep-dark':
      return 'text-cyan-400';
  }
}

export function accentBg(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'bg-blue-500/10';
    case 'dark':
      return 'bg-purple-500/20';
    case 'deep-dark':
      return 'bg-cyan-500/10';
  }
}

// ── User message bubble ──────────────────────────────────────

export function userBubble(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'bg-blue-600 text-white';
    case 'dark':
      return 'bg-gradient-to-br from-purple-600/80 to-blue-600/80 text-white';
    case 'deep-dark':
      return 'bg-gradient-to-br from-cyan-600/80 to-emerald-600/80 text-white';
  }
}

// ── Assistant message bubble ─────────────────────────────────

export function assistantBubble(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'bg-gray-100 border border-gray-200 text-gray-800';
    case 'dark':
      return 'bg-white/[0.07] backdrop-blur-sm border border-white/10 text-gray-200';
    case 'deep-dark':
      return 'bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] text-gray-300';
  }
}

// ── Input field ──────────────────────────────────────────────

export function inputField(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/30';
    case 'dark':
      return 'border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-purple-500/50 focus:bg-white/[0.07] focus:ring-purple-500/30';
    case 'deep-dark':
      return 'border-white/[0.06] bg-white/[0.03] text-white placeholder-gray-600 focus:border-cyan-500/50 focus:bg-white/[0.05] focus:ring-cyan-500/30';
  }
}

// ── Send button ──────────────────────────────────────────────

export function sendButton(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40';
    case 'dark':
      return 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40';
    case 'deep-dark':
      return 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40';
  }
}

// ── Typing indicator dots ────────────────────────────────────

export function typingDotColors(theme: AITheme): [string, string, string] {
  switch (theme) {
    case 'light':
      return ['bg-blue-400', 'bg-indigo-400', 'bg-violet-400'];
    case 'dark':
      return ['bg-purple-400', 'bg-blue-400', 'bg-cyan-400'];
    case 'deep-dark':
      return ['bg-cyan-400', 'bg-emerald-400', 'bg-teal-400'];
  }
}

// ── Particle colors ──────────────────────────────────────────

export function particleColors(theme: AITheme): string[] {
  switch (theme) {
    case 'light':
      return ['#93c5fd', '#a5b4fc', '#c4b5fd', '#6ee7b7'];
    case 'dark':
      return ['#a78bfa', '#818cf8', '#67e8f9', '#c084fc', '#7dd3fc'];
    case 'deep-dark':
      return ['#22d3ee', '#34d399', '#2dd4bf', '#38bdf8', '#a3e635'];
  }
}

// ── Mobile overlay backdrop ──────────────────────────────────

export function overlayBackdrop(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'bg-black/30 backdrop-blur-sm';
    case 'dark':
      return 'bg-black/50 backdrop-blur-sm';
    case 'deep-dark':
      return 'bg-black/60 backdrop-blur-sm';
  }
}

export function mobileDrawer(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'bg-white border-gray-200';
    case 'dark':
      return 'bg-gray-950/95 backdrop-blur-xl border-white/10';
    case 'deep-dark':
      return 'bg-black/95 backdrop-blur-xl border-white/[0.06]';
  }
}

// ── Scrollbar ────────────────────────────────────────────────

export function scrollbar(theme: AITheme) {
  return theme === 'light'
    ? 'scrollbar-thin scrollbar-thumb-gray-300'
    : 'scrollbar-thin scrollbar-thumb-white/10';
}

// ── Selected agent card ──────────────────────────────────────

export function selectedRing(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'ring-1 ring-blue-300';
    case 'dark':
      return 'ring-1 ring-white/20';
    case 'deep-dark':
      return 'ring-1 ring-cyan-500/30';
  }
}

// ── Selected indicator bar ───────────────────────────────────

export function selectedBar(theme: AITheme) {
  switch (theme) {
    case 'light':
      return 'bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500';
    case 'dark':
      return 'bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500';
    case 'deep-dark':
      return 'bg-gradient-to-r from-cyan-500 via-emerald-500 to-teal-500';
  }
}
