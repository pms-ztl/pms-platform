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

// ── Shared UI Utilities ─────────────────────────────────────

/** Well-known display names for special agent types. */
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  coordinator: 'Swarm Coordinator',
  excel_validation: 'Excel AI',
  nlp_query: 'Data Query',
  performance_signal: 'Performance Signal',
  goal_intelligence: 'Goal Intelligence',
  one_on_one_advisor: '1:1 Advisor',
  compensation_promotion: 'Comp & Promo',
  review_drafter: 'Review Drafter',
  burnout_interceptor: 'Burnout Guard',
  skill_gap_forecaster: 'Skill Forecast',
  knowledge_broker: 'Knowledge Broker',
  credential_ledger: 'Credentials',
  linguistic_refiner: 'Linguistic Refiner',
  curiosity_scout: 'Curiosity Scout',
  logic_validator: 'Logic Check',
  cross_training: 'Cross-Train',
  career_sim: 'Career Sim',
  shadow_learning: 'Shadow Learn',
  micro_learning: 'Micro Learn',
  ar_mentor: 'AR Mentor',
  sparring_partner: 'Sparring Partner',
  task_bidder: 'Task Bidder',
  gig_sourcer: 'Gig Sourcer',
  nano_payment: 'Nano Pay',
  market_value: 'Market Value',
  tax_optimizer: 'Tax Optimizer',
  equity_realizer: 'Equity',
  pension_guard: 'Pension Guard',
  relocation_bot: 'Relocation',
  vendor_negotiator: 'Vendor',
  succession_sentry: 'Succession',
  culture_weaver: 'Culture Weaver',
  bias_neutralizer: 'Bias Neutralizer',
  gratitude_sentinel: 'Gratitude',
  conflict_mediator: 'Mediator',
  inclusion_monitor: 'Inclusion',
  empathy_coach: 'Empathy Coach',
  social_bonding: 'Social Bonding',
  legacy_archivist: 'Legacy',
  mood_radiator: 'Mood Radiator',
  posh_sentinel: 'POSH',
  labor_compliance: 'Labor Law',
  policy_translator: 'Policy',
  data_privacy: 'Privacy',
  audit_trail: 'Audit',
  conflict_of_interest: 'COI',
  leave_optimizer: 'Leave',
  onboarding_orchestrator: 'Onboarding',
  environment_ctrl: 'Environment',
  hydration_nutrition: 'Hydration & Nutrition',
  vocal_tone: 'Vocal Tone',
  cortisol_monitor: 'Cortisol Monitor',
  micro_break: 'Micro Break',
  circadian_sync: 'Circadian Sync',
  neuro_focus: 'Neuro Focus',
  conflict_resolution: 'Conflict Resolution',
  talent_marketplace: 'Talent Market',
  strategic_alignment: 'Strategy',
};

/**
 * Convert a raw agentType key into a human-friendly display name.
 * Checks the well-known map first, then falls back to title-casing.
 */
export function formatAgentDisplayName(agentType: string): string {
  if (AGENT_DISPLAY_NAMES[agentType]) return AGENT_DISPLAY_NAMES[agentType];
  return agentType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Convert a terse technical error string into a warm, conversational message.
 */
export function getFriendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('429'))
    return 'Hmm, our AI agents are a bit busy right now. Give it a moment and try again \u2014 they\u2019ll be ready shortly!';
  if (lower.includes('unavailable') || lower.includes('503') || lower.includes('busy'))
    return 'The AI service is taking a quick breather. It usually comes back within a few seconds.';
  if (lower.includes('timeout') || lower.includes('etimedout'))
    return 'That request was a big one! Try breaking it into a shorter question.';
  if (lower.includes('not configured'))
    return 'The AI service isn\u2019t set up for your organization yet. Please contact your administrator.';
  if (lower.includes('exhausted') || lower.includes('quota'))
    return 'We\u2019ve hit today\u2019s usage limit. The quota resets soon \u2014 try again in a little while!';
  if (raw) return raw;
  return 'Something didn\u2019t go as planned. Let\u2019s try that again!';
}

/**
 * Format a Date as a relative time string: "just now", "2m ago", "1h ago", etc.
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
