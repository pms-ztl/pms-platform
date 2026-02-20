/**
 * SwarmOrchestration - Mode 3: Multi-agent orchestration interface.
 *
 * Broadcasts a single user message to up to 5 selected agents in parallel and
 * renders their independent responses in a multi-column grid.  Full three-theme
 * support (light / dark / deep-dark) using the shared ai-theme helpers.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
  XMarkIcon,
  PlusIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { aiApi, type AIChatResponse } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import type { AITheme } from '@/store/ai-workspace';
import * as T from './ai-theme';

// ============================================================================
// Types
// ============================================================================

interface AgentResponse {
  agentType: string;
  status: 'loading' | 'success' | 'error';
  content: string;
  metadata?: AIChatResponse['metadata'];
  error?: string;
}

interface ConversationTurn {
  id: string;
  userMessage: string;
  timestamp: Date;
  responses: AgentResponse[];
}

// ============================================================================
// Agent Lookup Map (65 agents across 6 clusters)
// ============================================================================

const AGENT_INFO: Record<string, { name: string; icon: string; cluster: string; clusterColor: string }> = {
  // Core (15)
  performance:        { name: 'Performance',   icon: '\uD83C\uDFAF', cluster: 'Core',       clusterColor: 'text-blue-400' },
  nlp_query:          { name: 'Data Query',    icon: '\uD83D\uDD0D', cluster: 'Core',       clusterColor: 'text-blue-400' },
  coaching:           { name: 'Coaching',       icon: '\uD83E\uDDD1\u200D\uD83C\uDFEB', cluster: 'Core', clusterColor: 'text-blue-400' },
  career:             { name: 'Career',         icon: '\uD83D\uDE80', cluster: 'Core',       clusterColor: 'text-blue-400' },
  report:             { name: 'Reports',        icon: '\uD83D\uDCCB', cluster: 'Core',       clusterColor: 'text-blue-400' },
  workforce_intel:    { name: 'Workforce',      icon: '\uD83E\uDDE0', cluster: 'Core',       clusterColor: 'text-blue-400' },
  governance:         { name: 'Governance',     icon: '\u2696\uFE0F', cluster: 'Core',       clusterColor: 'text-blue-400' },
  strategic_alignment:{ name: 'Strategy',       icon: '\uD83C\uDFAF', cluster: 'Core',       clusterColor: 'text-blue-400' },
  talent_marketplace: { name: 'Talent Market',  icon: '\uD83C\uDFEA', cluster: 'Core',       clusterColor: 'text-blue-400' },
  conflict_resolution:{ name: 'Conflict',       icon: '\uD83E\uDD1D', cluster: 'Core',       clusterColor: 'text-blue-400' },
  security:           { name: 'Security',       icon: '\uD83D\uDD12', cluster: 'Core',       clusterColor: 'text-blue-400' },
  notification:       { name: 'Notification',   icon: '\uD83D\uDD14', cluster: 'Core',       clusterColor: 'text-blue-400' },
  onboarding:         { name: 'Onboarding',     icon: '\uD83C\uDF93', cluster: 'Core',       clusterColor: 'text-blue-400' },
  license:            { name: 'License',        icon: '\uD83D\uDD11', cluster: 'Core',       clusterColor: 'text-blue-400' },
  excel_validation:   { name: 'Excel AI',       icon: '\uD83D\uDCC4', cluster: 'Core',       clusterColor: 'text-blue-400' },
  // Bio-Performance (10)
  neuro_focus:        { name: 'Neuro Focus',    icon: '\uD83E\uDDE0', cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  circadian_sync:     { name: 'Circadian',      icon: '\uD83C\uDF19', cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  micro_break:        { name: 'Micro Break',    icon: '\u23F0',       cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  cortisol_monitor:   { name: 'Cortisol',       icon: '\uD83D\uDCC9', cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  ergonomics:         { name: 'Ergonomics',     icon: '\uD83E\uDE91', cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  sleep_optimizer:    { name: 'Sleep',           icon: '\uD83D\uDCA4', cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  hydration_nutrition:{ name: 'Hydration',      icon: '\uD83D\uDCA7', cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  vocal_tone:         { name: 'Vocal Tone',     icon: '\uD83C\uDFA4', cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  environment_ctrl:   { name: 'Environment',    icon: '\uD83C\uDF21\uFE0F', cluster: 'Bio',  clusterColor: 'text-emerald-400' },
  burnout_interceptor:{ name: 'Burnout Guard',  icon: '\uD83D\uDEE1\uFE0F', cluster: 'Bio',  clusterColor: 'text-emerald-400' },
  // Hyper-Learning (12)
  shadow_learning:    { name: 'Shadow Learn',   icon: '\uD83D\uDC65', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  micro_learning:     { name: 'Micro Learn',    icon: '\uD83D\uDCD6', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  ar_mentor:          { name: 'AR Mentor',      icon: '\uD83E\uDD3D', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  sparring_partner:   { name: 'Sparring',       icon: '\uD83E\uDD4A', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  skill_gap_forecaster:{ name: 'Skill Forecast',icon: '\uD83D\uDD2E', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  knowledge_broker:   { name: 'Knowledge',      icon: '\uD83E\uDD1D', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  credential_ledger:  { name: 'Credentials',    icon: '\uD83C\uDF96\uFE0F', cluster: 'Learning', clusterColor: 'text-purple-400' },
  linguistic_refiner: { name: 'Linguistic',     icon: '\u270D\uFE0F', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  curiosity_scout:    { name: 'Curiosity',      icon: '\uD83D\uDD2D', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  logic_validator:    { name: 'Logic Check',    icon: '\uD83E\uDDE9', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  cross_training:     { name: 'Cross-Train',    icon: '\uD83D\uDD00', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  career_sim:         { name: 'Career Sim',     icon: '\uD83C\uDFAE', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  // Liquid Workforce (10)
  task_bidder:        { name: 'Task Bidder',    icon: '\uD83D\uDCE6', cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  gig_sourcer:        { name: 'Gig Sourcer',    icon: '\uD83C\uDFAA', cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  nano_payment:       { name: 'Nano Pay',       icon: '\u2B50',       cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  market_value:       { name: 'Market Value',   icon: '\uD83D\uDCCA', cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  tax_optimizer:      { name: 'Tax Optimize',   icon: '\uD83D\uDCB5', cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  equity_realizer:    { name: 'Equity',          icon: '\uD83D\uDCB9', cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  pension_guard:      { name: 'Pension',         icon: '\uD83C\uDFE6', cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  relocation_bot:     { name: 'Relocation',     icon: '\u2708\uFE0F', cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  vendor_negotiator:  { name: 'Vendor',          icon: '\uD83D\uDD0E', cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  succession_sentry:  { name: 'Succession',     icon: '\uD83D\uDC51', cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  // Culture & Empathy (10)
  culture_weaver:     { name: 'Culture',         icon: '\uD83C\uDF10', cluster: 'Culture',    clusterColor: 'text-pink-400' },
  bias_neutralizer:   { name: 'Bias',            icon: '\u2696\uFE0F', cluster: 'Culture',    clusterColor: 'text-pink-400' },
  gratitude_sentinel: { name: 'Gratitude',      icon: '\uD83D\uDE4F', cluster: 'Culture',    clusterColor: 'text-pink-400' },
  conflict_mediator:  { name: 'Mediator',       icon: '\uD83D\uDD4A\uFE0F', cluster: 'Culture', clusterColor: 'text-pink-400' },
  inclusion_monitor:  { name: 'Inclusion',      icon: '\uD83C\uDF08', cluster: 'Culture',    clusterColor: 'text-pink-400' },
  empathy_coach:      { name: 'Empathy',         icon: '\uD83D\uDCAC', cluster: 'Culture',    clusterColor: 'text-pink-400' },
  social_bonding:     { name: 'Social',          icon: '\uD83C\uDFC6', cluster: 'Culture',    clusterColor: 'text-pink-400' },
  legacy_archivist:   { name: 'Legacy',          icon: '\uD83D\uDCDC', cluster: 'Culture',    clusterColor: 'text-pink-400' },
  whistleblower:      { name: 'Whistleblower',  icon: '\uD83D\uDCE2', cluster: 'Culture',    clusterColor: 'text-pink-400' },
  mood_radiator:      { name: 'Mood',            icon: '\uD83C\uDF21\uFE0F', cluster: 'Culture', clusterColor: 'text-pink-400' },
  // Governance (8)
  posh_sentinel:      { name: 'POSH',            icon: '\uD83D\uDEE1\uFE0F', cluster: 'Governance', clusterColor: 'text-red-400' },
  labor_compliance:   { name: 'Labor Law',      icon: '\uD83D\uDCDC', cluster: 'Governance', clusterColor: 'text-red-400' },
  policy_translator:  { name: 'Policy',          icon: '\uD83D\uDCD6', cluster: 'Governance', clusterColor: 'text-red-400' },
  data_privacy:       { name: 'Privacy',         icon: '\uD83D\uDD10', cluster: 'Governance', clusterColor: 'text-red-400' },
  audit_trail:        { name: 'Audit',           icon: '\uD83D\uDD0D', cluster: 'Governance', clusterColor: 'text-red-400' },
  conflict_of_interest:{ name: 'COI',            icon: '\u26A0\uFE0F', cluster: 'Governance', clusterColor: 'text-red-400' },
  leave_optimizer:    { name: 'Leave',           icon: '\uD83C\uDFD6\uFE0F', cluster: 'Governance', clusterColor: 'text-red-400' },
  onboarding_orchestrator:{ name: 'Onboard',     icon: '\uD83C\uDFAC', cluster: 'Governance', clusterColor: 'text-red-400' },
};

/** Cluster display order */
const CLUSTER_ORDER = ['Core', 'Bio', 'Learning', 'Workforce', 'Culture', 'Governance'];

/** Map cluster name to its Tailwind border-top color class */
const CLUSTER_BORDER_COLOR: Record<string, string> = {
  Core:       'border-t-blue-500',
  Bio:        'border-t-emerald-500',
  Learning:   'border-t-purple-500',
  Workforce:  'border-t-amber-500',
  Culture:    'border-t-pink-500',
  Governance: 'border-t-red-500',
};

const CLUSTER_BG_TINT: Record<string, string> = {
  Core:       'bg-blue-500/5',
  Bio:        'bg-emerald-500/5',
  Learning:   'bg-purple-500/5',
  Workforce:  'bg-amber-500/5',
  Culture:    'bg-pink-500/5',
  Governance: 'bg-red-500/5',
};

// ============================================================================
// Helpers
// ============================================================================

function getAgentInfo(agentType: string) {
  return AGENT_INFO[agentType] ?? { name: agentType, icon: '\uD83E\uDD16', cluster: 'Other', clusterColor: 'text-gray-400' };
}

function renderMarkdown(content: string, isLight: boolean): string {
  const boldClass = isLight ? 'font-semibold text-gray-900' : 'font-semibold text-white';
  const codeClass = isLight
    ? 'rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono text-blue-700'
    : 'rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-cyan-300';
  const headColor = isLight ? 'text-gray-900' : 'text-white';

  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html
    .replace(/^#### (.+)$/gm, `<h4 class="text-sm font-bold ${headColor} mt-3 mb-1">$1</h4>`)
    .replace(/^### (.+)$/gm, `<h3 class="text-base font-bold ${headColor} mt-3 mb-1">$1</h3>`)
    .replace(/^## (.+)$/gm, `<h2 class="text-lg font-bold ${headColor} mt-4 mb-1.5">$1</h2>`)
    .replace(/^# (.+)$/gm, `<h1 class="text-xl font-bold ${headColor} mt-4 mb-2">$1</h1>`);

  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) => {
    const blockClass = isLight
      ? 'rounded-lg bg-gray-100 border border-gray-200 p-3 my-2 text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap'
      : 'rounded-lg bg-black/30 border border-white/10 p-3 my-2 text-xs font-mono text-cyan-200 overflow-x-auto whitespace-pre-wrap';
    return `<pre class="${blockClass}">${code.trim()}</pre>`;
  });

  html = html
    .replace(/\*\*(.*?)\*\*/g, `<strong class="${boldClass}">$1</strong>`)
    .replace(/`([^`]+)`/g, `<code class="${codeClass}">$1</code>`)
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n/g, '<br />');

  html = html.replace(/((?:<li[^>]*>.*?<\/li><br \/>?)+)/g, (m) =>
    `<ul class="my-1.5 space-y-0.5">${m.replace(/<br \/>/g, '')}</ul>`,
  );

  html = html.replace(/(<\/h[1-4]>)<br \/>/g, '$1');
  html = html.replace(/(<\/pre>)<br \/>/g, '$1');
  html = html.replace(/(<\/ul>)<br \/>/g, '$1');

  return html;
}

/** Determine grid column classes based on the number of agents */
function gridCols(count: number): string {
  switch (count) {
    case 1:  return 'grid-cols-1';
    case 2:  return 'grid-cols-1 sm:grid-cols-2';
    case 3:  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    case 4:  return 'grid-cols-1 sm:grid-cols-2';
    case 5:  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    default: return 'grid-cols-1';
  }
}

// ============================================================================
// Sub-components
// ============================================================================

/** Animated typing dots for loading state */
function TypingDots({ theme }: { theme: AITheme }) {
  const dots = T.typingDotColors(theme);
  return (
    <div className="flex items-center gap-1.5 py-2">
      <div className={`h-2 w-2 rounded-full ${dots[0]} animate-bounce`} style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
      <div className={`h-2 w-2 rounded-full ${dots[1]} animate-bounce`} style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
      <div className={`h-2 w-2 rounded-full ${dots[2]} animate-bounce`} style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
    </div>
  );
}

/** Single agent response card */
function AgentResponseCard({
  agentType,
  status,
  content,
  metadata,
  error,
  theme,
}: AgentResponse & { theme: AITheme }) {
  const info = getAgentInfo(agentType);
  const isLight = theme === 'light';
  const clusterBorder = CLUSTER_BORDER_COLOR[info.cluster] ?? 'border-t-gray-500';

  return (
    <div
      className={`flex flex-col rounded-xl border-t-2 ${clusterBorder} border ${T.border(theme)} ${T.surface(theme)} overflow-hidden transition-all duration-300`}
    >
      {/* Card Header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${T.borderLight(theme)}`}>
        <span className="text-lg flex-shrink-0">{info.icon}</span>
        <span className={`text-sm font-semibold truncate ${T.textPrimary(theme)}`}>{info.name}</span>
        <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
          isLight ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-gray-400'
        } ${info.clusterColor}`}>
          {info.cluster}
        </span>
        {/* Status indicator */}
        <span className="flex-shrink-0">
          {status === 'loading' && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
            </span>
          )}
          {status === 'success' && (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          )}
          {status === 'error' && (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
          )}
        </span>
      </div>

      {/* Card Body */}
      <div className={`flex-1 px-4 py-3 text-sm leading-relaxed overflow-y-auto max-h-80 ${T.scrollbar(theme)}`}>
        {status === 'loading' && <TypingDots theme={theme} />}
        {status === 'error' && (
          <p className="text-red-400 text-xs">{error || 'An unexpected error occurred.'}</p>
        )}
        {status === 'success' && (
          <div
            className={isLight ? 'text-gray-700' : 'text-gray-300'}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content, isLight) }}
          />
        )}
      </div>

      {/* Card Footer — metadata */}
      {status === 'success' && metadata && (
        <div className={`flex items-center gap-3 px-4 py-2 border-t ${T.borderLight(theme)} text-[10px] ${T.textMuted(theme)}`}>
          <span>{metadata.model}</span>
          <span className="opacity-40">|</span>
          <span>{metadata.inputTokens + metadata.outputTokens} tokens</span>
          <span className="opacity-40">|</span>
          <span>{metadata.latencyMs}ms</span>
        </div>
      )}
    </div>
  );
}

/** Ready-state card shown when agents are selected but no message has been sent yet */
function AgentReadyCard({ agentType, theme }: { agentType: string; theme: AITheme }) {
  const info = getAgentInfo(agentType);
  const isLight = theme === 'light';
  const clusterBorder = CLUSTER_BORDER_COLOR[info.cluster] ?? 'border-t-gray-500';

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border-t-2 ${clusterBorder} border ${T.border(theme)} ${T.surface(theme)} px-4 py-8 transition-all duration-300`}
    >
      <span className="text-3xl mb-3">{info.icon}</span>
      <p className={`text-sm font-semibold ${T.textPrimary(theme)} mb-1`}>{info.name}</p>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mb-3 ${
        isLight ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-gray-400'
      } ${info.clusterColor}`}>
        {info.cluster}
      </span>
      <p className={`text-xs ${T.textMuted(theme)}`}>Ready to respond</p>
    </div>
  );
}

// ============================================================================
// Agent Picker Dropdown
// ============================================================================

function AgentPickerDropdown({
  theme,
  open,
  onClose,
  selectedAgents,
  onSelect,
}: {
  theme: AITheme;
  open: boolean;
  onClose: () => void;
  selectedAgents: string[];
  onSelect: (agent: string) => void;
}) {
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const isLight = theme === 'light';
  const lowerSearch = search.toLowerCase();

  // Group agents by cluster, filtered by search
  const grouped: Record<string, Array<[string, typeof AGENT_INFO[string]]>> = {};
  for (const [key, info] of Object.entries(AGENT_INFO)) {
    if (lowerSearch && !info.name.toLowerCase().includes(lowerSearch) && !key.toLowerCase().includes(lowerSearch) && !info.cluster.toLowerCase().includes(lowerSearch)) {
      continue;
    }
    if (!grouped[info.cluster]) grouped[info.cluster] = [];
    grouped[info.cluster].push([key, info]);
  }

  const atLimit = selectedAgents.length >= 5;

  return (
    <div
      ref={dropdownRef}
      className={`absolute top-full left-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border shadow-2xl z-50 ${T.border(theme)} ${
        isLight ? 'bg-white' : theme === 'dark' ? 'bg-gray-900/95 backdrop-blur-xl' : 'bg-black/95 backdrop-blur-xl'
      } ${T.scrollbar(theme)}`}
    >
      {/* Search */}
      <div className={`sticky top-0 z-10 p-3 border-b ${T.borderLight(theme)} ${
        isLight ? 'bg-white' : theme === 'dark' ? 'bg-gray-900/95' : 'bg-black/95'
      }`}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents..."
          autoFocus
          className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${T.inputField(theme)}`}
        />
        {atLimit && (
          <p className="text-[10px] text-amber-400 mt-1.5 text-center">Maximum 5 agents reached</p>
        )}
      </div>

      {/* Grouped Agent List */}
      <div className="p-2">
        {CLUSTER_ORDER.map((cluster) => {
          const agents = grouped[cluster];
          if (!agents || agents.length === 0) return null;
          return (
            <div key={cluster} className="mb-2">
              <p className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 ${
                agents[0][1].clusterColor
              }`}>
                {cluster} ({agents.length})
              </p>
              <div className="space-y-0.5">
                {agents.map(([key, info]) => {
                  const isSelected = selectedAgents.includes(key);
                  const isDisabled = atLimit && !isSelected;
                  return (
                    <button
                      key={key}
                      disabled={isDisabled}
                      onClick={() => {
                        if (!isSelected) onSelect(key);
                        if (isSelected) {
                          // Allow deselect from picker too
                          const { removeOrchestrationAgent } = useAIWorkspaceStore.getState();
                          removeOrchestrationAgent(key);
                        }
                      }}
                      className={`flex items-center gap-2.5 w-full text-left rounded-lg px-2.5 py-2 text-xs transition-all duration-150 ${
                        isSelected
                          ? isLight
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                            : 'bg-white/10 text-white ring-1 ring-white/20'
                          : isDisabled
                            ? `opacity-40 cursor-not-allowed ${T.textMuted(theme)}`
                            : `${T.textSecondary(theme)} ${T.surfaceHover(theme)} hover:${isLight ? 'text-gray-900' : 'text-white'}`
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{info.icon}</span>
                      <span className="truncate">{info.name}</span>
                      {isSelected && (
                        <span className={`ml-auto text-[9px] font-semibold ${T.accentText(theme)}`}>
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {Object.keys(grouped).length === 0 && (
          <p className={`text-xs text-center py-6 ${T.textMuted(theme)}`}>No agents match your search</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SwarmOrchestration() {
  const {
    theme,
    orchestrationAgents,
    addOrchestrationAgent,
    removeOrchestrationAgent,
    clearOrchestrationAgents,
    setSwarmMode,
  } = useAIWorkspaceStore();

  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [activeTurn, setActiveTurn] = useState<ConversationTurn | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pickerAnchorRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';

  // ── Auto-scroll on new content ──
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, activeTurn, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Broadcast to all agents ──
  const broadcastMessage = useCallback(async (msg: string) => {
    if (orchestrationAgents.length === 0 || isBroadcasting) return;

    setIsBroadcasting(true);

    const turnId = `turn-${Date.now()}`;
    const initialResponses: AgentResponse[] = orchestrationAgents.map((agentType) => ({
      agentType,
      status: 'loading' as const,
      content: '',
    }));

    const newTurn: ConversationTurn = {
      id: turnId,
      userMessage: msg,
      timestamp: new Date(),
      responses: initialResponses,
    };

    setActiveTurn(newTurn);

    // Fire all API calls in parallel
    const promises = orchestrationAgents.map(async (agentType) => {
      try {
        const data = await aiApi.chat(msg, agentType);
        return {
          agentType,
          status: 'success' as const,
          content: data.message,
          metadata: data.metadata,
        };
      } catch (err) {
        return {
          agentType,
          status: 'error' as const,
          content: '',
          error: err instanceof Error ? err.message : 'Request failed',
        };
      }
    });

    // Update each card as its promise settles
    const settled = await Promise.allSettled(promises);
    const finalResponses: AgentResponse[] = settled.map((result) => {
      if (result.status === 'fulfilled') return result.value;
      return {
        agentType: 'unknown',
        status: 'error' as const,
        content: '',
        error: 'Unexpected failure',
      };
    });

    const completedTurn: ConversationTurn = {
      ...newTurn,
      responses: finalResponses,
    };

    setHistory((prev) => [...prev, completedTurn]);
    setActiveTurn(null);
    setIsBroadcasting(false);
    queryClient.invalidateQueries({ queryKey: ['ai'] });
  }, [orchestrationAgents, isBroadcasting, queryClient]);

  // We want to show per-agent streaming effect, so instead of waiting for all,
  // update the active turn as each promise resolves.
  const broadcastMessageStreaming = useCallback(async (msg: string) => {
    if (orchestrationAgents.length === 0 || isBroadcasting) return;

    setIsBroadcasting(true);

    const turnId = `turn-${Date.now()}`;
    const initialResponses: AgentResponse[] = orchestrationAgents.map((agentType) => ({
      agentType,
      status: 'loading' as const,
      content: '',
    }));

    const turnRef: ConversationTurn = {
      id: turnId,
      userMessage: msg,
      timestamp: new Date(),
      responses: [...initialResponses],
    };

    setActiveTurn({ ...turnRef });

    // Track completed count
    let completedCount = 0;

    const promises = orchestrationAgents.map(async (agentType, idx) => {
      try {
        const data = await aiApi.chat(msg, agentType);
        turnRef.responses[idx] = {
          agentType,
          status: 'success',
          content: data.message,
          metadata: data.metadata,
        };
      } catch (err) {
        turnRef.responses[idx] = {
          agentType,
          status: 'error',
          content: '',
          error: err instanceof Error ? err.message : 'Request failed',
        };
      }
      completedCount++;
      // Update active turn to trigger re-render with partial results
      setActiveTurn({ ...turnRef, responses: [...turnRef.responses] });
    });

    await Promise.all(promises);

    // All done — move to history
    setHistory((prev) => [...prev, { ...turnRef, responses: [...turnRef.responses] }]);
    setActiveTurn(null);
    setIsBroadcasting(false);
    queryClient.invalidateQueries({ queryKey: ['ai'] });
  }, [orchestrationAgents, isBroadcasting, queryClient]);

  // ── Handlers ──
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isBroadcasting || orchestrationAgents.length === 0) return;
    setMessage('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    broadcastMessageStreaming(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const agentCount = orchestrationAgents.length;
  const hasHistory = history.length > 0 || activeTurn !== null;

  return (
    <div className="flex h-full flex-col">
      {/* ================================================================== */}
      {/* TOP BAR                                                            */}
      {/* ================================================================== */}
      <div className={`flex-shrink-0 border-b ${T.border(theme)} px-4 py-3`}>
        {/* Row 1: Title + controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BoltIcon className={`h-5 w-5 ${T.accentText(theme)}`} />
            <h2 className={`text-sm font-bold ${T.textPrimary(theme)}`}>Swarm Orchestration</h2>
            {agentCount > 0 && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${T.accentBg(theme)} ${T.accentText(theme)}`}>
                {agentCount}/5 agents
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {agentCount > 0 && (
              <button
                onClick={clearOrchestrationAgents}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors duration-150 ${T.border(theme)} ${T.textSecondary(theme)} ${T.surfaceHover(theme)}`}
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setSwarmMode('overview')}
              className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors duration-150 ${T.border(theme)} ${T.textSecondary(theme)} ${T.surfaceHover(theme)}`}
            >
              Back to Overview
            </button>
          </div>
        </div>

        {/* Row 2: Agent badges + Add Agent */}
        <div className="flex items-center gap-2 flex-wrap">
          {orchestrationAgents.map((agentType) => {
            const info = getAgentInfo(agentType);
            return (
              <span
                key={agentType}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all duration-150 ${T.border(theme)} ${
                  isLight ? 'bg-gray-50' : 'bg-white/5'
                }`}
              >
                <span className="text-sm">{info.icon}</span>
                <span className={`font-medium ${T.textPrimary(theme)}`}>{info.name}</span>
                <button
                  onClick={() => removeOrchestrationAgent(agentType)}
                  className={`ml-0.5 rounded p-0.5 transition-colors ${T.textMuted(theme)} hover:text-red-400`}
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          {/* Add Agent button */}
          {agentCount < 5 && (
            <div ref={pickerAnchorRef} className="relative">
              <button
                onClick={() => setPickerOpen(!pickerOpen)}
                className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1 text-xs transition-all duration-150 ${T.border(theme)} ${T.textSecondary(theme)} ${T.surfaceHover(theme)}`}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add Agent
              </button>
              <AgentPickerDropdown
                theme={theme}
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                selectedAgents={orchestrationAgents}
                onSelect={(agent) => {
                  addOrchestrationAgent(agent);
                  // Don't close — allow quick multi-select
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* MAIN CONTENT AREA (scrollable)                                     */}
      {/* ================================================================== */}
      <div
        ref={scrollAreaRef}
        className={`flex-1 overflow-y-auto px-4 py-4 ${T.scrollbar(theme)}`}
      >
        {/* EMPTY STATE: No agents selected */}
        {agentCount === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center px-6">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${
              theme === 'deep-dark' ? 'from-cyan-500/20 to-emerald-500/20' : 'from-purple-500/20 to-cyan-500/20'
            } mb-5`}>
              <BoltIcon className={`h-8 w-8 ${T.accentText(theme)}`} />
            </div>
            <h3 className={`text-lg font-semibold ${T.textPrimary(theme)} mb-2`}>
              Multi-Agent Orchestration
            </h3>
            <p className={`text-sm ${T.textSecondary(theme)} mb-4 max-w-md`}>
              Select up to 5 AI agents to broadcast your questions simultaneously. Each agent will provide its own specialized perspective.
            </p>
            <button
              onClick={() => setPickerOpen(true)}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-105 ${T.sendButton(theme)}`}
            >
              <PlusIcon className="h-4 w-4" />
              Add Your First Agent
            </button>
            {/* Floating picker for empty state */}
            {pickerOpen && agentCount === 0 && (
              <div className="relative mt-3 w-80">
                <AgentPickerDropdown
                  theme={theme}
                  open={pickerOpen}
                  onClose={() => setPickerOpen(false)}
                  selectedAgents={orchestrationAgents}
                  onSelect={(agent) => addOrchestrationAgent(agent)}
                />
              </div>
            )}
          </div>
        )}

        {/* READY STATE: Agents selected but no messages yet */}
        {agentCount > 0 && !hasHistory && (
          <div>
            <p className={`text-xs font-medium text-center mb-4 ${T.textMuted(theme)}`}>
              Your swarm is ready. Type a message below to broadcast to all agents.
            </p>
            <div className={`grid gap-4 ${gridCols(agentCount)}`}>
              {orchestrationAgents.map((agentType) => (
                <AgentReadyCard key={agentType} agentType={agentType} theme={theme} />
              ))}
            </div>
          </div>
        )}

        {/* CONVERSATION HISTORY */}
        {hasHistory && (
          <div className="space-y-6">
            {/* Past turns */}
            {history.map((turn) => (
              <div key={turn.id}>
                {/* User message banner */}
                <div className={`rounded-xl px-4 py-3 mb-4 ${T.userBubble(theme)}`}>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-white/70 flex-shrink-0" />
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{turn.userMessage}</p>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">
                    {turn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {/* Agent response grid */}
                <div className={`grid gap-4 ${gridCols(turn.responses.length)}`}>
                  {turn.responses.map((resp) => (
                    <AgentResponseCard key={resp.agentType} {...resp} theme={theme} />
                  ))}
                </div>
              </div>
            ))}

            {/* Active turn (in-progress broadcast) */}
            {activeTurn && (
              <div>
                {/* User message banner */}
                <div className={`rounded-xl px-4 py-3 mb-4 ${T.userBubble(theme)}`}>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-white/70 flex-shrink-0" />
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{activeTurn.userMessage}</p>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">
                    {activeTurn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {/* Agent response grid — each card updates independently */}
                <div className={`grid gap-4 ${gridCols(activeTurn.responses.length)}`}>
                  {activeTurn.responses.map((resp) => (
                    <AgentResponseCard key={resp.agentType} {...resp} theme={theme} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* INPUT AREA (bottom)                                                */}
      {/* ================================================================== */}
      <div className={`flex-shrink-0 border-t ${T.border(theme)} px-4 py-3`}>
        {agentCount === 0 ? (
          <p className={`text-xs text-center py-2 ${T.textMuted(theme)}`}>
            Select agents above, then type a question to broadcast to the swarm
          </p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  placeholder={`Broadcast to ${agentCount} agent${agentCount > 1 ? 's' : ''}...`}
                  disabled={isBroadcasting}
                  rows={1}
                  className={`w-full resize-none rounded-xl border px-4 py-3 pr-12 text-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-1 disabled:opacity-50 ${T.inputField(theme)}`}
                  style={{ maxHeight: '120px' }}
                />
              </div>
              <button
                type="submit"
                disabled={!message.trim() || isBroadcasting || agentCount === 0}
                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100 ${
                  isBroadcasting ? 'neural-pulse' : ''
                } ${T.sendButton(theme)}`}
              >
                <BoltIcon className="h-5 w-5" />
              </button>
            </form>
            <p className={`mt-1.5 text-[10px] ${T.textMuted(theme)} text-center`}>
              Broadcasting to {agentCount} agent{agentCount > 1 ? 's' : ''} &middot; Enter to send, Shift+Enter for new line
            </p>
          </>
        )}
      </div>
    </div>
  );
}
