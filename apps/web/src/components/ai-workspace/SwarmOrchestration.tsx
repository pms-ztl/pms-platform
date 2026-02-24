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
import { getAgentIcon } from './agentIconMap';

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
// Agent Lookup Map (70 agents across 6 clusters)
// ============================================================================

const AGENT_INFO: Record<string, { name: string; cluster: string; clusterColor: string }> = {
  // Core (20)
  performance:        { name: 'Performance',   cluster: 'Core',       clusterColor: 'text-blue-400' },
  nlp_query:          { name: 'Data Query',    cluster: 'Core',       clusterColor: 'text-blue-400' },
  coaching:           { name: 'Coaching',       cluster: 'Core',       clusterColor: 'text-blue-400' },
  career:             { name: 'Career',         cluster: 'Core',       clusterColor: 'text-blue-400' },
  report:             { name: 'Reports',        cluster: 'Core',       clusterColor: 'text-blue-400' },
  workforce_intel:    { name: 'Workforce',      cluster: 'Core',       clusterColor: 'text-blue-400' },
  governance:         { name: 'Governance',     cluster: 'Core',       clusterColor: 'text-blue-400' },
  strategic_alignment:{ name: 'Strategy',       cluster: 'Core',       clusterColor: 'text-blue-400' },
  talent_marketplace: { name: 'Talent Market',  cluster: 'Core',       clusterColor: 'text-blue-400' },
  conflict_resolution:{ name: 'Conflict',       cluster: 'Core',       clusterColor: 'text-blue-400' },
  security:           { name: 'Security',       cluster: 'Core',       clusterColor: 'text-blue-400' },
  notification:       { name: 'Notification',   cluster: 'Core',       clusterColor: 'text-blue-400' },
  onboarding:         { name: 'Onboarding',     cluster: 'Core',       clusterColor: 'text-blue-400' },
  license:            { name: 'License',        cluster: 'Core',       clusterColor: 'text-blue-400' },
  excel_validation:   { name: 'Excel AI',       cluster: 'Core',       clusterColor: 'text-blue-400' },
  goal_intelligence:  { name: 'Goal Intel',     cluster: 'Core',       clusterColor: 'text-blue-400' },
  performance_signal: { name: 'Perf Signal',    cluster: 'Core',       clusterColor: 'text-blue-400' },
  review_drafter:     { name: 'Review Drafter', cluster: 'Core',       clusterColor: 'text-blue-400' },
  compensation_promotion:{ name: 'Comp & Promo', cluster: 'Core',      clusterColor: 'text-blue-400' },
  one_on_one_advisor: { name: '1:1 Advisor',    cluster: 'Core',       clusterColor: 'text-blue-400' },
  // Bio-Performance (10)
  neuro_focus:        { name: 'Neuro Focus',    cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  circadian_sync:     { name: 'Circadian',      cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  micro_break:        { name: 'Micro Break',    cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  cortisol_monitor:   { name: 'Cortisol',       cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  ergonomics:         { name: 'Ergonomics',     cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  sleep_optimizer:    { name: 'Sleep',           cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  hydration_nutrition:{ name: 'Hydration',      cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  vocal_tone:         { name: 'Vocal Tone',     cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  environment_ctrl:   { name: 'Environment',    cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  burnout_interceptor:{ name: 'Burnout Guard',  cluster: 'Bio',        clusterColor: 'text-emerald-400' },
  // Hyper-Learning (12)
  shadow_learning:    { name: 'Shadow Learn',   cluster: 'Learning',   clusterColor: 'text-purple-400' },
  micro_learning:     { name: 'Micro Learn',    cluster: 'Learning',   clusterColor: 'text-purple-400' },
  ar_mentor:          { name: 'AR Mentor',      cluster: 'Learning',   clusterColor: 'text-purple-400' },
  sparring_partner:   { name: 'Sparring',       cluster: 'Learning',   clusterColor: 'text-purple-400' },
  skill_gap_forecaster:{ name: 'Skill Forecast', cluster: 'Learning',   clusterColor: 'text-purple-400' },
  knowledge_broker:   { name: 'Knowledge',      cluster: 'Learning',   clusterColor: 'text-purple-400' },
  credential_ledger:  { name: 'Credentials',    cluster: 'Learning',   clusterColor: 'text-purple-400' },
  linguistic_refiner: { name: 'Linguistic',     cluster: 'Learning',   clusterColor: 'text-purple-400' },
  curiosity_scout:    { name: 'Curiosity',      cluster: 'Learning',   clusterColor: 'text-purple-400' },
  logic_validator:    { name: 'Logic Check',    cluster: 'Learning',   clusterColor: 'text-purple-400' },
  cross_training:     { name: 'Cross-Train',    cluster: 'Learning',   clusterColor: 'text-purple-400' },
  career_sim:         { name: 'Career Sim',     cluster: 'Learning',   clusterColor: 'text-purple-400' },
  // Liquid Workforce (10)
  task_bidder:        { name: 'Task Bidder',    cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  gig_sourcer:        { name: 'Gig Sourcer',    cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  nano_payment:       { name: 'Nano Pay',       cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  market_value:       { name: 'Market Value',   cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  tax_optimizer:      { name: 'Tax Optimize',   cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  equity_realizer:    { name: 'Equity',          cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  pension_guard:      { name: 'Pension',         cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  relocation_bot:     { name: 'Relocation',     cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  vendor_negotiator:  { name: 'Vendor',          cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  succession_sentry:  { name: 'Succession',     cluster: 'Workforce',  clusterColor: 'text-amber-400' },
  // Culture & Empathy (10)
  culture_weaver:     { name: 'Culture',         cluster: 'Culture',    clusterColor: 'text-pink-400' },
  bias_neutralizer:   { name: 'Bias',            cluster: 'Culture',    clusterColor: 'text-pink-400' },
  gratitude_sentinel: { name: 'Gratitude',      cluster: 'Culture',    clusterColor: 'text-pink-400' },
  conflict_mediator:  { name: 'Mediator',       cluster: 'Culture',    clusterColor: 'text-pink-400' },
  inclusion_monitor:  { name: 'Inclusion',      cluster: 'Culture',    clusterColor: 'text-pink-400' },
  empathy_coach:      { name: 'Empathy',         cluster: 'Culture',    clusterColor: 'text-pink-400' },
  social_bonding:     { name: 'Social',          cluster: 'Culture',    clusterColor: 'text-pink-400' },
  legacy_archivist:   { name: 'Legacy',          cluster: 'Culture',    clusterColor: 'text-pink-400' },
  whistleblower:      { name: 'Whistleblower',  cluster: 'Culture',    clusterColor: 'text-pink-400' },
  mood_radiator:      { name: 'Mood',            cluster: 'Culture',    clusterColor: 'text-pink-400' },
  // Governance (8)
  posh_sentinel:      { name: 'POSH',            cluster: 'Governance', clusterColor: 'text-red-400' },
  labor_compliance:   { name: 'Labor Law',      cluster: 'Governance', clusterColor: 'text-red-400' },
  policy_translator:  { name: 'Policy',          cluster: 'Governance', clusterColor: 'text-red-400' },
  data_privacy:       { name: 'Privacy',         cluster: 'Governance', clusterColor: 'text-red-400' },
  audit_trail:        { name: 'Audit',           cluster: 'Governance', clusterColor: 'text-red-400' },
  conflict_of_interest:{ name: 'COI',            cluster: 'Governance', clusterColor: 'text-red-400' },
  leave_optimizer:    { name: 'Leave',           cluster: 'Governance', clusterColor: 'text-red-400' },
  onboarding_orchestrator:{ name: 'Onboard',     cluster: 'Governance', clusterColor: 'text-red-400' },
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
  return AGENT_INFO[agentType] ?? { name: agentType, cluster: 'Other', clusterColor: 'text-gray-400' };
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
  const AgentIcon = getAgentIcon(agentType);
  const isLight = theme === 'light';
  const clusterBorder = CLUSTER_BORDER_COLOR[info.cluster] ?? 'border-t-gray-500';

  return (
    <div
      className={`flex flex-col rounded-xl border-t-2 ${clusterBorder} border ${T.border(theme)} ${T.surface(theme)} overflow-hidden transition-all duration-300`}
    >
      {/* Card Header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${T.borderLight(theme)}`}>
        <AgentIcon className={`h-5 w-5 flex-shrink-0 ${info.clusterColor}`} />
        <span className={`text-sm font-semibold break-words ${T.textPrimary(theme)}`}>{info.name}</span>
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
  const AgentIcon = getAgentIcon(agentType);
  const isLight = theme === 'light';
  const clusterBorder = CLUSTER_BORDER_COLOR[info.cluster] ?? 'border-t-gray-500';

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border-t-2 ${clusterBorder} border ${T.border(theme)} ${T.surface(theme)} px-4 py-8 transition-all duration-300`}
    >
      <AgentIcon className={`h-10 w-10 mb-3 ${info.clusterColor}`} />
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
  const grouped: Record<string, Array<[string, (typeof AGENT_INFO)[string]]>> = {};
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
              <p className={`text-[10px] font-bold tracking-wider px-2 py-1.5 ${
                agents[0][1].clusterColor
              }`}>
                {cluster} ({agents.length})
              </p>
              <div className="space-y-0.5">
                {agents.map(([key, info]) => {
                  const isSelected = selectedAgents.includes(key);
                  const isDisabled = atLimit && !isSelected;
                  const PickerAgentIcon = getAgentIcon(key);
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
                      <PickerAgentIcon className={`h-4 w-4 flex-shrink-0 ${info.clusterColor}`} />
                      <span className="break-words">{info.name}</span>
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
  const [orchestrationMode, setOrchestrationMode] = useState<'coordinate' | 'broadcast'>('coordinate');

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

  // ── Coordinated multi-agent execution ──
  const coordinateMessage = useCallback(async (msg: string) => {
    if (orchestrationAgents.length < 2 || isBroadcasting) return;

    setIsBroadcasting(true);

    const turnId = `turn-${Date.now()}`;
    const coordinatingResponse: AgentResponse = {
      agentType: 'coordinator',
      status: 'loading',
      content: '',
    };

    setActiveTurn({
      id: turnId,
      userMessage: msg,
      timestamp: new Date(),
      responses: [coordinatingResponse],
    });

    try {
      const data = await aiApi.coordinateChat(msg, orchestrationAgents);

      const coordResponse: AgentResponse = {
        agentType: 'coordinator',
        status: 'success',
        content: data.message,
        metadata: data.metadata,
      };

      const completedTurn: ConversationTurn = {
        id: turnId,
        userMessage: msg,
        timestamp: new Date(),
        responses: [coordResponse],
      };

      setHistory((prev) => [...prev, completedTurn]);
    } catch (err) {
      const errorTurn: ConversationTurn = {
        id: turnId,
        userMessage: msg,
        timestamp: new Date(),
        responses: [{
          agentType: 'coordinator',
          status: 'error',
          content: '',
          error: err instanceof Error ? err.message : 'Coordination failed',
        }],
      };

      setHistory((prev) => [...prev, errorTurn]);
    }

    setActiveTurn(null);
    setIsBroadcasting(false);
    queryClient.invalidateQueries({ queryKey: ['ai'] });
  }, [orchestrationAgents, isBroadcasting, queryClient]);

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
    if (orchestrationMode === 'coordinate') {
      coordinateMessage(trimmed);
    } else {
      broadcastMessageStreaming(trimmed);
    }
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
    <div className={`flex h-full flex-col ${
      theme === 'deep-dark' ? 'bg-black/50' :
      theme === 'dark'      ? 'bg-black/35' : ''
    }`}>
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
            {/* Mode toggle: Coordinate vs Broadcast */}
            {agentCount >= 2 && (
              <div className={`flex items-center rounded-lg p-0.5 text-[10px] font-semibold ${theme === 'light' ? 'bg-gray-100' : 'bg-white/5'}`}>
                <button
                  onClick={() => setOrchestrationMode('coordinate')}
                  className={`px-2.5 py-1 rounded-md transition-all duration-200 ${
                    orchestrationMode === 'coordinate'
                      ? `${T.accentBg(theme)} text-white shadow-sm`
                      : `${T.textMuted(theme)} hover:${T.textSecondary(theme)}`
                  }`}
                  title="Agents collaborate on one task — coordinator decomposes goal into sub-tasks"
                >
                  Coordinate
                </button>
                <button
                  onClick={() => setOrchestrationMode('broadcast')}
                  className={`px-2.5 py-1 rounded-md transition-all duration-200 ${
                    orchestrationMode === 'broadcast'
                      ? `${T.accentBg(theme)} text-white shadow-sm`
                      : `${T.textMuted(theme)} hover:${T.textSecondary(theme)}`
                  }`}
                  title="Same message sent to all agents independently"
                >
                  Broadcast
                </button>
              </div>
            )}
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
            const BadgeIcon = getAgentIcon(agentType);
            return (
              <span
                key={agentType}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all duration-150 ${T.border(theme)} ${
                  isLight ? 'bg-gray-50' : 'bg-white/5'
                }`}
              >
                <BadgeIcon className={`h-3.5 w-3.5 flex-shrink-0 ${info.clusterColor}`} />
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
