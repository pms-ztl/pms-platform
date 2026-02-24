/**
 * SwarmChat - Mode 2 of the Neural Swarm UI.
 *
 * An enhanced 1:1 chat interface for conversing with any AI agent.
 * Features:
 *   - Collapsible left sidebar with searchable, cluster-grouped agent selector
 *   - Center chat area with markdown rendering, typing indicator, metadata ribbon
 *   - Bottom input area with expanding textarea and suggested quick prompts
 *
 * Reads all state from useAIWorkspaceStore (no props).
 */

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  // Agent & cluster icons
  AcademicCapIcon,
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
  ArrowTrendingUpIcon,
  BeakerIcon,
  BellIcon,
  BoltIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CogIcon,
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FaceSmileIcon,
  FlagIcon,
  FireIcon,
  GlobeAltIcon,
  HandRaisedIcon,
  HeartIcon,
  HomeIcon,
  IdentificationIcon,
  KeyIcon,
  LightBulbIcon,
  LockClosedIcon,
  MegaphoneIcon,
  MicrophoneIcon,
  MoonIcon,
  PencilSquareIcon,
  PresentationChartBarIcon,
  ScaleIcon,
  ShieldCheckIcon,
  StarIcon,
  SunIcon,
  TableCellsIcon,
  TrophyIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { aiApi, type AIChatResponse } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import type { AITheme } from '@/store/ai-workspace';
import * as T from './ai-theme';

// ── Types ──────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: AIChatResponse['metadata'];
  suggestedActions?: AIChatResponse['suggestedActions'];
}

// Icon type — heroicons are ForwardRefExoticComponent; we use 'as IconComponent' to cast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.FC<any>;

interface AgentDef {
  type: string;
  icon: IconComponent;
  name: string;
  desc: string;
}

interface ClusterDef {
  id: string;
  name: string;
  icon: IconComponent;
  gradient: string;
  agents: AgentDef[];
}

// ── Agent Clusters ─────────────────────────────────────────────

const AGENT_CLUSTERS: ClusterDef[] = [
  {
    id: 'core',
    name: 'Core',
    icon: CogIcon,
    gradient: 'from-blue-500 to-indigo-500',
    agents: [
      { type: 'performance', icon: ChartBarIcon, name: 'Performance', desc: 'Reviews & ratings' },
      { type: 'nlp_query', icon: MagnifyingGlassIcon, name: 'Data Query', desc: 'Ask about data' },
      { type: 'coaching', icon: AcademicCapIcon, name: 'Coaching', desc: 'Micro-coaching' },
      { type: 'career', icon: ArrowTrendingUpIcon, name: 'Career', desc: 'Growth paths' },
      { type: 'report', icon: DocumentTextIcon, name: 'Reports', desc: 'Generate reports' },
      { type: 'workforce_intel', icon: UsersIcon, name: 'Workforce', desc: 'Burnout & retention' },
      { type: 'governance', icon: ScaleIcon, name: 'Governance', desc: 'Bias & fairness' },
      { type: 'strategic_alignment', icon: PresentationChartBarIcon, name: 'Strategy', desc: 'OKR alignment' },
      { type: 'talent_marketplace', icon: BriefcaseIcon, name: 'Talent Market', desc: 'Skill matching' },
      { type: 'conflict_resolution', icon: ChatBubbleLeftRightIcon, name: 'Conflict', desc: 'Team mediation' },
      { type: 'security', icon: ShieldCheckIcon, name: 'Security', desc: 'Audits & threats' },
      { type: 'notification', icon: BellIcon, name: 'Notification', desc: 'Smart alerts' },
      { type: 'onboarding', icon: AcademicCapIcon, name: 'Onboarding', desc: 'New hire setup' },
      { type: 'license', icon: KeyIcon, name: 'License', desc: 'Seats & billing' },
      { type: 'excel_validation', icon: TableCellsIcon, name: 'Excel AI', desc: 'Data validation' },
      { type: 'goal_intelligence', icon: FlagIcon, name: 'Goal Intel', desc: 'SMART goals & OKRs' },
      { type: 'performance_signal', icon: ArrowTrendingUpIcon, name: 'Perf Signal', desc: 'Evidence & signals' },
      { type: 'review_drafter', icon: PencilSquareIcon, name: 'Review Drafter', desc: 'Draft reviews' },
      { type: 'compensation_promotion', icon: TrophyIcon, name: 'Comp & Promo', desc: 'Promotion readiness' },
      { type: 'one_on_one_advisor', icon: ChatBubbleLeftRightIcon, name: '1:1 Advisor', desc: 'Meeting intelligence' },
    ],
  },
  {
    id: 'bio',
    name: 'Bio-Performance',
    icon: BeakerIcon,
    gradient: 'from-emerald-500 to-teal-500',
    agents: [
      { type: 'neuro_focus', icon: BoltIcon, name: 'Neuro Focus', desc: 'Deep work' },
      { type: 'circadian_sync', icon: SunIcon, name: 'Circadian', desc: 'Body clock' },
      { type: 'micro_break', icon: ClockIcon, name: 'Micro Break', desc: 'Rest intervals' },
      { type: 'cortisol_monitor', icon: HeartIcon, name: 'Cortisol', desc: 'Stress patterns' },
      { type: 'ergonomics', icon: ComputerDesktopIcon, name: 'Ergonomics', desc: 'Workspace setup' },
      { type: 'sleep_optimizer', icon: MoonIcon, name: 'Sleep', desc: 'Sleep quality' },
      { type: 'hydration_nutrition', icon: BeakerIcon, name: 'Hydration', desc: 'Nutrition' },
      { type: 'vocal_tone', icon: MicrophoneIcon, name: 'Vocal Tone', desc: 'Comm style' },
      { type: 'environment_ctrl', icon: HomeIcon, name: 'Environment', desc: 'Workspace' },
      { type: 'burnout_interceptor', icon: FireIcon, name: 'Burnout Guard', desc: 'Early detect' },
    ],
  },
  {
    id: 'learning',
    name: 'Hyper-Learning',
    icon: BookOpenIcon,
    gradient: 'from-purple-500 to-pink-500',
    agents: [
      { type: 'shadow_learning', icon: EyeIcon, name: 'Shadow Learn', desc: 'Peer observe' },
      { type: 'micro_learning', icon: BookOpenIcon, name: 'Micro Learn', desc: 'Daily lessons' },
      { type: 'ar_mentor', icon: SparklesIcon, name: 'AR Mentor', desc: 'Simulation' },
      { type: 'sparring_partner', icon: ChatBubbleLeftRightIcon, name: 'Sparring', desc: 'Debate' },
      { type: 'skill_gap_forecaster', icon: ChartBarIcon, name: 'Skill Forecast', desc: 'Prediction' },
      { type: 'knowledge_broker', icon: LightBulbIcon, name: 'Knowledge', desc: 'Expert transfer' },
      { type: 'credential_ledger', icon: IdentificationIcon, name: 'Credentials', desc: 'Certificate Tracking' },
      { type: 'linguistic_refiner', icon: PencilSquareIcon, name: 'Linguistic', desc: 'Writing' },
      { type: 'curiosity_scout', icon: LightBulbIcon, name: 'Curiosity', desc: 'Innovation' },
      { type: 'logic_validator', icon: CheckBadgeIcon, name: 'Logic Check', desc: 'Reasoning' },
      { type: 'cross_training', icon: ArrowsRightLeftIcon, name: 'Cross-Train', desc: 'Multi-dept' },
      { type: 'career_sim', icon: ArrowTrendingUpIcon, name: 'Career Sim', desc: 'What-if' },
    ],
  },
  {
    id: 'workforce',
    name: 'Liquid Workforce',
    icon: CurrencyDollarIcon,
    gradient: 'from-amber-500 to-orange-500',
    agents: [
      { type: 'task_bidder', icon: ClipboardDocumentListIcon, name: 'Task Bidder', desc: 'Allocation' },
      { type: 'gig_sourcer', icon: BriefcaseIcon, name: 'Gig Sourcer', desc: 'Internal gigs' },
      { type: 'nano_payment', icon: StarIcon, name: 'Nano Pay', desc: 'Micro-rewards' },
      { type: 'market_value', icon: ChartBarIcon, name: 'Market Value', desc: 'Benchmarking' },
      { type: 'tax_optimizer', icon: DocumentCheckIcon, name: 'Tax Optimize', desc: 'Tax strategy' },
      { type: 'equity_realizer', icon: CurrencyDollarIcon, name: 'Equity', desc: 'Stock options' },
      { type: 'pension_guard', icon: BuildingLibraryIcon, name: 'Pension', desc: 'Retirement' },
      { type: 'relocation_bot', icon: GlobeAltIcon, name: 'Relocation', desc: 'City compare' },
      { type: 'vendor_negotiator', icon: DocumentMagnifyingGlassIcon, name: 'Vendor', desc: 'Contracts' },
      { type: 'succession_sentry', icon: TrophyIcon, name: 'Succession', desc: 'Leadership' },
    ],
  },
  {
    id: 'culture',
    name: 'Culture & Empathy',
    icon: HeartIcon,
    gradient: 'from-pink-500 to-rose-500',
    agents: [
      { type: 'culture_weaver', icon: UserGroupIcon, name: 'Culture', desc: 'Values & diag' },
      { type: 'bias_neutralizer', icon: ScaleIcon, name: 'Bias', desc: 'Fair language' },
      { type: 'gratitude_sentinel', icon: HeartIcon, name: 'Gratitude', desc: 'Appreciation' },
      { type: 'conflict_mediator', icon: HandRaisedIcon, name: 'Mediator', desc: 'Conflict res' },
      { type: 'inclusion_monitor', icon: UserGroupIcon, name: 'Inclusion', desc: 'Diversity' },
      { type: 'empathy_coach', icon: ChatBubbleLeftRightIcon, name: 'Empathy', desc: 'EI training' },
      { type: 'social_bonding', icon: TrophyIcon, name: 'Social', desc: 'Team building' },
      { type: 'legacy_archivist', icon: ArchiveBoxIcon, name: 'Legacy', desc: 'Knowledge' },
      { type: 'whistleblower', icon: MegaphoneIcon, name: 'Whistleblower', desc: 'Ethics' },
      { type: 'mood_radiator', icon: FaceSmileIcon, name: 'Mood', desc: 'Sentiment' },
    ],
  },
  {
    id: 'governance',
    name: 'Governance',
    icon: ScaleIcon,
    gradient: 'from-red-500 to-rose-500',
    agents: [
      { type: 'posh_sentinel', icon: ShieldCheckIcon, name: 'POSH', desc: 'Harassment prev' },
      { type: 'labor_compliance', icon: DocumentCheckIcon, name: 'Labor Law', desc: 'Regulations' },
      { type: 'policy_translator', icon: BookOpenIcon, name: 'Policy', desc: 'Plain language' },
      { type: 'data_privacy', icon: LockClosedIcon, name: 'Privacy', desc: 'GDPR' },
      { type: 'audit_trail', icon: DocumentMagnifyingGlassIcon, name: 'Audit', desc: 'Activity logs' },
      { type: 'conflict_of_interest', icon: ExclamationTriangleIcon, name: 'COI', desc: 'Interest check' },
      { type: 'leave_optimizer', icon: CalendarDaysIcon, name: 'Leave', desc: 'PTO planning' },
      { type: 'onboarding_orchestrator', icon: UsersIcon, name: 'Onboard', desc: 'Coordination' },
    ],
  },
];

// ── Flat lookup helpers ────────────────────────────────────────

function findAgent(type: string): AgentDef | undefined {
  for (const cluster of AGENT_CLUSTERS) {
    const agent = cluster.agents.find((a) => a.type === type);
    if (agent) return agent;
  }
  return undefined;
}

function findClusterForAgent(type: string): ClusterDef | undefined {
  return AGENT_CLUSTERS.find((c) => c.agents.some((a) => a.type === type));
}

// ── Suggested Prompts Per Agent ────────────────────────────────

const AGENT_PROMPTS: Record<string, string[]> = {
  performance: ['How is my team performing this quarter?', 'Who are the top performers?', 'Show me rating distribution'],
  nlp_query: ['How many employees are in engineering?', 'What is the average rating?', 'Show me attrition data'],
  coaching: ['Give me coaching tips for my next 1:1', 'How can I improve my communication?', 'Suggest a development plan'],
  career: ['What career paths are available for me?', 'How can I get promoted?', 'What skills should I develop?'],
  report: ['Generate a quarterly performance report', 'Create a headcount summary', 'Build an engagement report'],
  workforce_intel: ['Are there any burnout risks in my team?', 'Show retention predictions', 'What are turnover trends?'],
  governance: ['Check for bias in recent reviews', 'Are ratings consistent across demographics?', 'Run a fairness audit'],
  strategic_alignment: ['How aligned are team goals with company OKRs?', 'Show me goal cascading gaps', 'OKR progress update'],
  security: ['Run a security audit', 'Show recent access anomalies', 'Who accessed sensitive data recently?'],
  neuro_focus: ['When is my peak focus time?', 'Help me plan a deep work block', 'Analyze my productivity patterns'],
  circadian_sync: ['What is my optimal work schedule?', 'When should I schedule meetings?', 'Adjust my calendar to my rhythms'],
};

const DEFAULT_AGENT_PROMPTS = [
  'What can you help me with?',
  'Show me an overview of my data',
  'Give me recommendations',
  'Run an analysis for my team',
];

// ── Markdown Renderer ──────────────────────────────────────────

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

  // Headings (#### → h4, ### → h3, ## → h2, # → h1) — must run before bold
  html = html
    .replace(/^#### (.+)$/gm, `<h4 class="text-sm font-bold ${headColor} mt-3 mb-1">$1</h4>`)
    .replace(/^### (.+)$/gm, `<h3 class="text-base font-bold ${headColor} mt-3 mb-1">$1</h3>`)
    .replace(/^## (.+)$/gm, `<h2 class="text-lg font-bold ${headColor} mt-4 mb-1.5">$1</h2>`)
    .replace(/^# (.+)$/gm, `<h1 class="text-xl font-bold ${headColor} mt-4 mb-2">$1</h1>`);

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) => {
    const blockClass = isLight
      ? 'rounded-lg bg-gray-100 border border-gray-200 p-3 my-2 text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap'
      : 'rounded-lg bg-black/30 border border-white/10 p-3 my-2 text-xs font-mono text-cyan-200 overflow-x-auto whitespace-pre-wrap';
    return `<pre class="${blockClass}">${code.trim()}</pre>`;
  });

  // Inline styles
  html = html
    .replace(/\*\*(.*?)\*\*/g, `<strong class="${boldClass}">$1</strong>`)
    .replace(/`([^`]+)`/g, `<code class="${codeClass}">$1</code>`)
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n/g, '<br />');

  // Wrap consecutive list items in <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li><br \/>?)+)/g, (m) =>
    `<ul class="my-1.5 space-y-0.5">${m.replace(/<br \/>/g, '')}</ul>`,
  );

  // Clean up double <br /> after block elements
  html = html.replace(/(<\/h[1-4]>)<br \/>/g, '$1');
  html = html.replace(/(<\/pre>)<br \/>/g, '$1');
  html = html.replace(/(<\/ul>)<br \/>/g, '$1');

  return html;
}

// ── AgentSidebar Sub-Component ─────────────────────────────────

function AgentSidebar({
  theme,
  selectedAgent,
  onSelectAgent,
  collapsed,
  onToggleCollapse,
}: {
  theme: AITheme;
  selectedAgent: string | null;
  onSelectAgent: (type: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const [search, setSearch] = useState('');
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(AGENT_CLUSTERS.map((c) => [c.id, true])),
  );

  const toggleCluster = (id: string) => {
    setExpandedClusters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredClusters = AGENT_CLUSTERS.map((cluster) => {
    if (!search.trim()) return cluster;
    const q = search.toLowerCase();
    const filtered = cluster.agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q),
    );
    return { ...cluster, agents: filtered };
  }).filter((c) => c.agents.length > 0);

  if (collapsed) {
    return (
      <div
        className={`flex w-12 flex-shrink-0 flex-col items-center border-r py-3 transition-all duration-300 ${T.surface(theme)} ${T.border(theme)}`}
      >
        <button
          onClick={onToggleCollapse}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${T.surfaceHover(theme)} ${T.textSecondary(theme)}`}
          title="Expand sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="mt-4 flex flex-col items-center gap-2">
          {AGENT_CLUSTERS.map((cluster) => (
            <div
              key={cluster.id}
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              title={cluster.name}
            >
              <cluster.icon className="h-4 w-4 text-current" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex w-[280px] flex-shrink-0 flex-col border-r transition-all duration-300 ${T.surface(theme)} ${T.border(theme)}`}
      style={{ fontSize: 14 }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between border-b px-3 py-2 ${T.borderLight(theme)}`}>
        <h3 className={`text-xs font-semibold ${T.textPrimary(theme)}`}>Agents</h3>
        <button
          onClick={onToggleCollapse}
          className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${T.surfaceHover(theme)} ${T.textSecondary(theme)}`}
          title="Collapse sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5">
        <div className="relative">
          <MagnifyingGlassIcon className={`absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${T.textMuted(theme)}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className={`w-full rounded-lg border py-1 pl-8 pr-3 text-2xs outline-none transition-all ${T.inputField(theme)}`}
          />
        </div>
      </div>

      {/* Agent List */}
      <div className={`flex-1 overflow-y-auto px-2 pb-2 ${T.scrollbar(theme)}`}>
        {filteredClusters.length === 0 && (
          <div className={`py-8 text-center text-xs ${T.textMuted(theme)}`}>No agents match your search</div>
        )}
        {filteredClusters.map((cluster) => (
          <div key={cluster.id} className="mb-1">
            {/* Cluster Header */}
            <button
              onClick={() => toggleCluster(cluster.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${T.surfaceHover(theme)}`}
            >
              <cluster.icon className="h-3.5 w-3.5 flex-shrink-0 text-current" />
              <span className={`flex-1 text-2xs font-medium ${T.textPrimary(theme)}`}>{cluster.name}</span>
              <span className={`text-2xs ${T.textMuted(theme)}`}>{cluster.agents.length}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-3 w-3 transition-transform ${T.textMuted(theme)} ${expandedClusters[cluster.id] ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Agent Items */}
            {expandedClusters[cluster.id] && (
              <div className="ml-1 mt-0.5 space-y-0.5">
                {cluster.agents.map((agent) => {
                  const isSelected = selectedAgent === agent.type;
                  return (
                    <button
                      key={agent.type}
                      onClick={() => onSelectAgent(agent.type)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all duration-200 ${
                        isSelected
                          ? `${T.accentBg(theme)} ${T.selectedRing(theme)}`
                          : T.surfaceHover(theme)
                      }`}
                    >
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md">
                        <agent.icon className="h-3 w-3 text-current" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={`break-words text-2xs font-medium ${isSelected ? T.accentText(theme) : T.textPrimary(theme)}`}>
                          {agent.name}
                        </div>
                        <div className={`break-words text-3xs ${T.textMuted(theme)}`}>{agent.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Metadata Ribbon ────────────────────────────────────────────

function MetadataRibbon({
  metadata,
  theme,
}: {
  metadata: AIChatResponse['metadata'];
  theme: AITheme;
}) {
  return (
    <div
      className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-2xs ${T.borderLight(theme)} ${
        theme === 'light' ? 'bg-gray-50 text-gray-500' : 'bg-white/[0.03] text-gray-500'
      }`}
    >
      <span title="AI Provider">{metadata.provider}</span>
      <span className={`h-2.5 w-px ${theme === 'light' ? 'bg-gray-300' : 'bg-white/10'}`} />
      <span title="Model">{metadata.model}</span>
      <span className={`h-2.5 w-px ${theme === 'light' ? 'bg-gray-300' : 'bg-white/10'}`} />
      <span title="Input tokens">{metadata.inputTokens} in</span>
      <span className={`h-2.5 w-px ${theme === 'light' ? 'bg-gray-300' : 'bg-white/10'}`} />
      <span title="Output tokens">{metadata.outputTokens} out</span>
      <span className={`h-2.5 w-px ${theme === 'light' ? 'bg-gray-300' : 'bg-white/10'}`} />
      <span title="Latency">{metadata.latencyMs}ms</span>
      {metadata.costCents > 0 && (
        <>
          <span className={`h-2.5 w-px ${theme === 'light' ? 'bg-gray-300' : 'bg-white/10'}`} />
          <span title="Cost">${((metadata.costCents ?? 0) / 100).toFixed(4)}</span>
        </>
      )}
    </div>
  );
}

// ── TypingIndicator ────────────────────────────────────────────

function TypingIndicator({ theme }: { theme: AITheme }) {
  const dots = T.typingDotColors(theme);
  return (
    <div className="flex gap-3 justify-start">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
          theme === 'deep-dark' ? 'from-cyan-500/30 to-emerald-500/30' : 'from-purple-500/30 to-cyan-500/30'
        } mt-1`}
      >
        <SparklesIcon className={`h-4 w-4 ${theme === 'deep-dark' ? 'text-cyan-300' : 'text-purple-300'}`} />
      </div>
      <div className={`rounded-2xl px-4 py-3 ${T.assistantBubble(theme)}`}>
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${dots[0]} animate-bounce`} style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
          <div className={`h-2 w-2 rounded-full ${dots[1]} animate-bounce`} style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
          <div className={`h-2 w-2 rounded-full ${dots[2]} animate-bounce`} style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export function SwarmChat() {
  const { theme, selectedAgent, setSelectedAgent, setSwarmMode } = useAIWorkspaceStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Resolve current agent + cluster
  const currentAgent = selectedAgent ? findAgent(selectedAgent) : null;
  const currentCluster = selectedAgent ? findClusterForAgent(selectedAgent) : null;
  const suggestedPrompts =
    selectedAgent && AGENT_PROMPTS[selectedAgent]
      ? AGENT_PROMPTS[selectedAgent]
      : DEFAULT_AGENT_PROMPTS;

  // Load existing conversation when agent changes
  const { data: conversations } = useQuery({
    queryKey: ['ai', 'conversations', selectedAgent],
    queryFn: () => aiApi.getConversations({ agentType: selectedAgent ?? undefined, limit: 1 }),
    enabled: !!selectedAgent,
  });

  // Load messages when we have a conversation
  const { data: conversationData } = useQuery({
    queryKey: ['ai', 'conversation', conversationId],
    queryFn: () => aiApi.getConversation(conversationId!),
    enabled: !!conversationId,
  });

  // Hydrate messages from loaded conversation
  useEffect(() => {
    if (conversationData?.messages) {
      const loaded: ChatMessage[] = conversationData.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.createdAt),
        metadata: (m.metadata as AIChatResponse['metadata']) ?? undefined,
      }));
      setMessages(loaded);
    }
  }, [conversationData]);

  // Reset conversation when agent changes
  useEffect(() => {
    setMessages([]);
    setConversationId(null);
    inputRef.current?.focus();
  }, [selectedAgent]);

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      aiApi.chat(msg, selectedAgent ?? undefined, conversationId ?? undefined),
    onSuccess: (data) => {
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          metadata: data.metadata,
          suggestedActions: data.suggestedActions,
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ['ai'] });
    },
    onError: (error: Error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `I encountered an error: ${error.message}. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatMutation.isPending, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Handlers ───────────────────────────────────────────────

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: trimmed, timestamp: new Date() },
    ]);
    chatMutation.mutate(trimmed);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleAgentSelect = (type: string) => {
    setSelectedAgent(type);
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className={`relative flex h-full overflow-hidden rounded-2xl border ${T.border(theme)} ${
      theme === 'light' ? 'bg-gray-50' : 'bg-black/20'
    }`}>
      {/* Ambient floating background orbs — dark themes only */}
      {theme !== 'light' && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-40 -right-40 h-[30rem] w-[30rem] rounded-full blur-3xl"
            style={{
              background: theme === 'deep-dark'
                ? 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 68%)'
                : 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 68%)',
              animation: 'floatOrb 22s ease-in-out infinite',
            }}
          />
          <div
            className="absolute -bottom-40 -left-40 h-[26rem] w-[26rem] rounded-full blur-3xl"
            style={{
              background: theme === 'deep-dark'
                ? 'radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 68%)'
                : 'radial-gradient(circle, rgba(129,140,248,0.07) 0%, transparent 68%)',
              animation: 'floatOrb 28s ease-in-out infinite reverse',
              animationDelay: '6s',
            }}
          />
        </div>
      )}
      {/* Left Sidebar - Agent Selector */}
      <AgentSidebar
        theme={theme}
        selectedAgent={selectedAgent}
        onSelectAgent={handleAgentSelect}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />

      {/* Center Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Agent Header */}
        <div className={`flex items-center gap-3 border-b px-4 py-3 ${T.border(theme)} ${T.surface(theme)}`}>
          <button
            onClick={() => setSwarmMode('overview')}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${T.surfaceHover(theme)} ${T.textSecondary(theme)}`}
            title="Back to Overview"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>

          {currentAgent ? (
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${
                  currentCluster?.gradient ?? 'from-blue-500 to-indigo-500'
                } shadow-lg`}
              >
                <currentAgent.icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className={`text-sm font-semibold break-words ${T.textPrimary(theme)}`}>
                    {currentAgent.name} Agent
                  </h2>
                  {currentCluster && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium ${
                        theme === 'light'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-white/[0.06] text-gray-400'
                      }`}
                    >
                      <currentCluster.icon className="h-3 w-3" /> {currentCluster.name}
                    </span>
                  )}
                </div>
                <p className={`text-xs break-words ${T.textMuted(theme)}`}>{currentAgent.desc}</p>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <h2 className={`text-sm font-semibold ${T.textPrimary(theme)}`}>Select an Agent</h2>
              <p className={`text-xs ${T.textMuted(theme)}`}>Choose an agent from the sidebar to start chatting</p>
            </div>
          )}

          {/* Conversation indicator */}
          {conversationId && (
            <div className={`ml-auto flex items-center gap-1.5 text-2xs ${T.textMuted(theme)}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${theme === 'light' ? 'bg-green-500' : 'bg-emerald-400'}`} />
              Active session
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 ${T.scrollbar(theme)}`}>
          {/* Empty State */}
          {messages.length === 0 && !chatMutation.isPending && (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              {currentAgent ? (
                <>
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${
                      currentCluster?.gradient ?? 'from-blue-500 to-indigo-500'
                    } mb-5 shadow-xl`}
                  >
                    <currentAgent.icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className={`text-lg font-semibold ${T.textPrimary(theme)} mb-1.5`}>
                    {currentAgent.name} Agent Ready
                  </h3>
                  <p className={`text-sm ${T.textSecondary(theme)} mb-6 max-w-md`}>
                    {currentAgent.desc}. Ask me anything and I will use your organization's data to help.
                  </p>
                </>
              ) : (
                <>
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${T.accentGradient(theme)} mb-5 shadow-xl`}
                  >
                    <SparklesIcon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className={`text-lg font-semibold ${T.textPrimary(theme)} mb-1.5`}>
                    Choose an Agent
                  </h3>
                  <p className={`text-sm ${T.textSecondary(theme)} mb-6 max-w-md`}>
                    Select an agent from the sidebar to begin a 1:1 conversation. Each agent specializes in a different area.
                  </p>
                </>
              )}

              {/* Suggested Prompts Grid */}
              {currentAgent && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handlePromptClick(prompt)}
                      className={`group rounded-xl border px-4 py-3 text-left text-xs transition-all duration-200 ${
                        theme === 'light'
                          ? 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-900'
                          : `border-white/10 bg-white/5 ${T.textSecondary(theme)} hover:bg-white/10 hover:text-white hover:border-white/20`
                      }`}
                    >
                      <currentAgent.icon className="inline-block h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity mr-1 align-text-bottom" />
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message List */}
          {messages.map((msg) => (
            <div key={msg.id}>
              <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {/* Assistant Avatar */}
                {msg.role === 'assistant' && (
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
                      currentCluster?.gradient ??
                      (theme === 'deep-dark' ? 'from-cyan-500/30 to-emerald-500/30' : 'from-purple-500/30 to-cyan-500/30')
                    } mt-1`}
                  >
                    {currentAgent
                      ? <currentAgent.icon className="h-4 w-4 text-white" />
                      : <SparklesIcon className={`h-4 w-4 ${theme === 'deep-dark' ? 'text-cyan-300' : 'text-purple-300'}`} />
                    }
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' ? T.userBubble(theme) : T.assistantBubble(theme)
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      className="text-sm leading-relaxed break-words"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(msg.content, theme === 'light'),
                      }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  )}
                  <p
                    className={`mt-1.5 text-2xs ${
                      msg.role === 'user' ? 'text-white/50' : T.textMuted(theme)
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
                      theme === 'light' ? 'from-blue-500/20 to-indigo-500/20' : 'from-blue-500/30 to-indigo-500/30'
                    } mt-1`}
                  >
                    <UserIcon className={`h-4 w-4 ${theme === 'light' ? 'text-blue-600' : 'text-blue-300'}`} />
                  </div>
                )}
              </div>

              {/* Metadata Ribbon for assistant messages */}
              {msg.role === 'assistant' && msg.metadata && (
                <div className="ml-11">
                  <MetadataRibbon metadata={msg.metadata} theme={theme} />
                </div>
              )}

              {/* Suggested Actions */}
              {msg.role === 'assistant' && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="ml-11 mt-2 flex flex-wrap gap-2">
                  {msg.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (action.action) {
                          handlePromptClick(action.action);
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        theme === 'light'
                          ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : `border-white/10 bg-white/5 ${T.accentText(theme)} hover:bg-white/10`
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {chatMutation.isPending && <TypingIndicator theme={theme} />}

          {/* Error State */}
          {chatMutation.isError && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className={`text-sm font-semibold ${T.textPrimary(theme)} mb-1`}>Connection Error</h3>
              <p className={`text-xs ${T.textMuted(theme)}`}>
                Unable to reach the AI service. Please try again.
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompt Pills (above input, when conversation is active) */}
        {currentAgent && messages.length > 0 && !chatMutation.isPending && (
          <div className={`border-t px-4 pt-2 pb-0 ${T.borderLight(theme)}`}>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {suggestedPrompts.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs transition-all duration-200 ${
                    theme === 'light'
                      ? 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      : `border-white/10 bg-white/[0.03] ${T.textMuted(theme)} hover:bg-white/[0.06] hover:text-white`
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className={`border-t px-4 py-3 ${T.border(theme)}`}>
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentAgent
                    ? `Ask the ${currentAgent.name} agent...`
                    : 'Select an agent to start chatting...'
                }
                disabled={chatMutation.isPending || !selectedAgent}
                rows={1}
                className={`w-full resize-none rounded-xl border px-4 py-3 pr-12 text-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-1 disabled:opacity-50 ${T.inputField(theme)}`}
                style={{ maxHeight: '140px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending || !selectedAgent}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100 ${
                chatMutation.isPending ? 'neural-pulse' : ''
              } ${T.sendButton(theme)}`}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </form>
          <p className={`mt-1.5 text-2xs ${T.textMuted(theme)} text-center`}>
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
