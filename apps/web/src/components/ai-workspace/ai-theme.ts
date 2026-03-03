/**
 * AI Workspace Theme Utilities
 *
 * Two themes:
 * - light: White/gray backgrounds, dark text, accent-adaptive
 * - deep-dark: Pure black backgrounds, accent-adaptive
 *
 * All accent colours now derive from the `primary-*` Tailwind palette
 * which maps to the user's selected accent colour via CSS custom properties.
 */

import type { AITheme } from '@/store/ai-workspace';

// ── Base surface classes ─────────────────────────────────────

export function bg(theme: AITheme) {
  return theme === 'light' ? 'bg-gray-50' : 'bg-black';
}

export function surface(theme: AITheme) {
  return theme === 'light'
    ? 'bg-white border-gray-200'
    : 'bg-white/[0.03] backdrop-blur-xl border-white/[0.06]';
}

export function surfaceHover(theme: AITheme) {
  return theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/[0.06]';
}

// ── Text colors ──────────────────────────────────────────────

export function textPrimary(theme: AITheme) {
  return theme === 'light' ? 'text-gray-900' : 'text-white';
}

export function textSecondary(theme: AITheme) {
  return 'text-gray-500';
}

export function textMuted(theme: AITheme) {
  return theme === 'light' ? 'text-gray-500' : 'text-gray-600';
}

// ── Border colors ────────────────────────────────────────────

export function border(theme: AITheme) {
  return theme === 'light' ? 'border-gray-200' : 'border-white/[0.06]';
}

export function borderLight(theme: AITheme) {
  return theme === 'light' ? 'border-gray-100' : 'border-white/[0.03]';
}

// ── Accent colors (gradients, glows) — accent-adaptive via primary-* ───

export function accentGradient(_theme: AITheme) {
  return 'from-primary-600 to-primary-400';
}

export function accentGlow(_theme: AITheme) {
  return 'shadow-primary-500/25';
}

export function accentText(theme: AITheme) {
  return theme === 'light' ? 'text-primary-600' : 'text-primary-400';
}

export function accentBg(theme: AITheme) {
  return theme === 'light' ? 'bg-primary-500/10' : 'bg-primary-500/15';
}

// ── User message bubble ──────────────────────────────────────

export function userBubble(theme: AITheme) {
  return theme === 'light'
    ? 'bg-primary-600 text-white'
    : 'bg-gradient-to-br from-primary-600/80 to-primary-500/80 text-white';
}

// ── Assistant message bubble ─────────────────────────────────

export function assistantBubble(theme: AITheme) {
  return theme === 'light'
    ? 'bg-gray-100 border border-gray-200 text-gray-800'
    : 'bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] text-gray-300';
}

// ── Input field ──────────────────────────────────────────────

export function inputField(theme: AITheme) {
  return theme === 'light'
    ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/30'
    : 'border-white/[0.06] bg-white/[0.03] text-white placeholder-gray-600 focus:border-primary-500/50 focus:bg-white/[0.05] focus:ring-primary-500/30';
}

// ── Send button ──────────────────────────────────────────────

export function sendButton(_theme: AITheme) {
  return 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40';
}

// ── Typing indicator dots ────────────────────────────────────

export function typingDotColors(_theme: AITheme): [string, string, string] {
  return ['bg-primary-400', 'bg-primary-500', 'bg-primary-300'];
}

// ── Particle colors ──────────────────────────────────────────

/**
 * Particle hex colours derived from the active accent palette via CSS vars.
 * Falls back to a neutral set if CSS vars are unavailable (SSR).
 */
export function particleColors(_theme: AITheme): string[] {
  if (typeof document === 'undefined') return ['#a1a1aa', '#d4d4d8', '#71717a'];
  const style = getComputedStyle(document.documentElement);
  const toHex = (v: string) => {
    const rgb = v.trim().split(/\s+/).map(Number);
    if (rgb.length !== 3 || rgb.some(isNaN)) return '#a1a1aa';
    return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
  };
  return [
    toHex(style.getPropertyValue('--c-primary-300')),
    toHex(style.getPropertyValue('--c-primary-400')),
    toHex(style.getPropertyValue('--c-primary-500')),
    toHex(style.getPropertyValue('--c-primary-200')),
    toHex(style.getPropertyValue('--c-primary-600')),
  ];
}

// ── Mobile overlay backdrop ──────────────────────────────────

export function overlayBackdrop(theme: AITheme) {
  return theme === 'light' ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm';
}

export function mobileDrawer(theme: AITheme) {
  return theme === 'light'
    ? 'bg-white border-gray-200'
    : 'bg-black/95 backdrop-blur-xl border-white/[0.06]';
}

// ── Scrollbar ────────────────────────────────────────────────

export function scrollbar(theme: AITheme) {
  return theme === 'light'
    ? 'scrollbar-thin scrollbar-thumb-gray-300'
    : 'scrollbar-thin scrollbar-thumb-white/10';
}

// ── Selected agent card ──────────────────────────────────────

export function selectedRing(theme: AITheme) {
  return theme === 'light'
    ? 'ring-1 ring-primary-300'
    : 'ring-1 ring-primary-500/30';
}

// ── Selected indicator bar ───────────────────────────────────

export function selectedBar(_theme: AITheme) {
  return 'bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400';
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
    return 'Hmm, our AI agents are a bit busy right now. Give it a moment and try again — they\'ll be ready shortly!';
  if (lower.includes('unavailable') || lower.includes('503') || lower.includes('busy'))
    return 'The AI service is taking a quick breather. It usually comes back within a few seconds.';
  if (lower.includes('timeout') || lower.includes('etimedout'))
    return 'That request was a big one! Try breaking it into a shorter question.';
  if (lower.includes('not configured'))
    return 'The AI service isn\'t set up for your organization yet. Please contact your administrator.';
  if (lower.includes('exhausted') || lower.includes('quota'))
    return 'We\'ve hit today\'s usage limit. The quota resets soon — try again in a little while!';
  if (raw) return raw;
  return 'Something didn\'t go as planned. Let\'s try that again!';
}

/**
 * Format a Date as a relative time string: "just now", "2m ago", "1h ago", etc.
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
