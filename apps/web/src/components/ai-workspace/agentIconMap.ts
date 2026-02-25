/**
 * Shared agent icon mapping for all AI workspace components.
 * Maps agent type strings → Heroicon components.
 * Centralised here to avoid duplication across AgentPanel, ConversationBar,
 * InsightFeed, SwarmOrchestration, SwarmOverview and AIChatWidget.
 */

import {
  SparklesIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  FlagIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  KeyIcon,
  LockClosedIcon,
  ScaleIcon,
  BriefcaseIcon,
  HandRaisedIcon,
  BellIcon,
  DocumentTextIcon,
  CpuChipIcon,
  MoonIcon,
  ClockIcon,
  ArrowTrendingDownIcon,
  ShieldCheckIcon,
  CloudIcon,
  ComputerDesktopIcon,
  BeakerIcon,
  SpeakerWaveIcon,
  SunIcon,
  BookOpenIcon,
  BoltIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  LightBulbIcon,
  PencilSquareIcon,
  PuzzlePieceIcon,
  UserGroupIcon,
  StarIcon,
  ArrowsRightLeftIcon,
  ArchiveBoxIcon,
  TrophyIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  BuildingLibraryIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  HeartIcon,
  FaceSmileIcon,
  MegaphoneIcon,
  ExclamationTriangleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

export type AgentIconComponent = React.FC<React.SVGProps<SVGSVGElement>>;

/** Maps every agent type string → a heroicon component. */
export const AGENT_ICON_MAP: Record<string, AgentIconComponent> = {
  // Core PMS
  performance:             ChartBarIcon,
  nlp_query:               MagnifyingGlassIcon,
  coaching:                AcademicCapIcon,
  career:                  RocketLaunchIcon,
  strategic_alignment:     FlagIcon,
  workforce_intel:         UsersIcon,
  report:                  ClipboardDocumentListIcon,
  license:                 KeyIcon,
  security:                LockClosedIcon,
  governance:              ScaleIcon,
  talent_marketplace:      BriefcaseIcon,
  conflict_resolution:     HandRaisedIcon,
  onboarding:              AcademicCapIcon,
  notification:            BellIcon,
  excel_validation:        DocumentTextIcon,
  // Bio-Performance
  neuro_focus:             CpuChipIcon,
  circadian_sync:          MoonIcon,
  micro_break:             ClockIcon,
  cortisol_monitor:        ArrowTrendingDownIcon,
  burnout_interceptor:     ShieldCheckIcon,
  sleep_optimizer:         CloudIcon,
  ergonomics:              ComputerDesktopIcon,
  hydration_nutrition:     BeakerIcon,
  vocal_tone:              SpeakerWaveIcon,
  environment_ctrl:        SunIcon,
  // Hyper-Learning
  micro_learning:          BookOpenIcon,
  sparring_partner:        BoltIcon,
  skill_gap_forecaster:    EyeIcon,
  career_sim:              CursorArrowRaysIcon,
  knowledge_broker:        LightBulbIcon,
  linguistic_refiner:      PencilSquareIcon,
  curiosity_scout:         MagnifyingGlassIcon,
  logic_validator:         PuzzlePieceIcon,
  shadow_learning:         UserGroupIcon,
  ar_mentor:               SparklesIcon,
  credential_ledger:       StarIcon,
  cross_training:          ArrowsRightLeftIcon,
  // Liquid Workforce
  market_value:            ChartBarIcon,
  task_bidder:             ArchiveBoxIcon,
  gig_sourcer:             BriefcaseIcon,
  nano_payment:            StarIcon,
  succession_sentry:       TrophyIcon,
  tax_optimizer:           BanknotesIcon,
  equity_realizer:         ArrowTrendingUpIcon,
  pension_guard:           BuildingLibraryIcon,
  relocation_bot:          PaperAirplaneIcon,
  vendor_negotiator:       MagnifyingGlassIcon,
  // Culture & Empathy
  empathy_coach:           ChatBubbleLeftRightIcon,
  culture_weaver:          GlobeAltIcon,
  mood_radiator:           HeartIcon,
  bias_neutralizer:        ScaleIcon,
  conflict_mediator:       HandRaisedIcon,
  inclusion_monitor:       FaceSmileIcon,
  gratitude_sentinel:      HeartIcon,
  social_bonding:          UserGroupIcon,
  legacy_archivist:        DocumentTextIcon,
  whistleblower:           MegaphoneIcon,
  // Governance & Logic
  posh_sentinel:           ShieldCheckIcon,
  labor_compliance:        DocumentTextIcon,
  policy_translator:       BookOpenIcon,
  data_privacy:            LockClosedIcon,
  audit_trail:             MagnifyingGlassIcon,
  conflict_of_interest:    ExclamationTriangleIcon,
  leave_optimizer:         SunIcon,
  onboarding_orchestrator: PlayIcon,
  // Primary Agents
  goal_intelligence:       FlagIcon,
  performance_signal:      ArrowTrendingUpIcon,
  review_drafter:          PencilSquareIcon,
  compensation_promotion:  BanknotesIcon,
  one_on_one_advisor:      ChatBubbleLeftRightIcon,
  // Orchestration
  coordinator:             BoltIcon,
  // Extra types used by ConversationBar/InsightFeed
  analytics:               ChartBarIcon,
  feedback:                ChatBubbleLeftRightIcon,
  hr:                      UsersIcon,
  goals:                   FlagIcon,
};

/** Default icon when agent type is unknown. */
export const DEFAULT_AGENT_ICON: AgentIconComponent = SparklesIcon;

/** Returns the heroicon for an agent type, or the default if not mapped. */
export function getAgentIcon(type: string | null | undefined): AgentIconComponent {
  if (!type) return DEFAULT_AGENT_ICON;
  return AGENT_ICON_MAP[type] ?? DEFAULT_AGENT_ICON;
}
