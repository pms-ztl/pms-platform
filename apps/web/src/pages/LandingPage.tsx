import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  FlagIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  EyeIcon,
  LockClosedIcon,
  SignalIcon,
  ScaleIcon,
  BeakerIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

// ── Scroll-triggered visibility hook ─────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ── Cursor glow — frosted spotlight following the mouse ─────────────────────
function CursorGlow({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    const glow = glowRef.current;
    if (!container || !glow) return;
    let raf = 0;
    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top + container.scrollTop;
        glow.style.opacity = '1';
        glow.style.transform = `translate(${x - 350}px, ${y - 350}px)`;
      });
    };
    const handleLeave = () => { glow.style.opacity = '0'; };
    container.addEventListener('mousemove', handleMove);
    container.addEventListener('mouseleave', handleLeave);
    return () => {
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('mouseleave', handleLeave);
      cancelAnimationFrame(raf);
    };
  }, [containerRef]);
  return (
    <div
      ref={glowRef}
      className="absolute w-[700px] h-[700px] rounded-full pointer-events-none opacity-0 transition-opacity duration-300 z-[3]"
      style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(148,210,255,0.04) 30%, transparent 55%)',
        filter: 'blur(40px)',
      }}
    />
  );
}

// ── Typewriter text with blinking cursor ─────────────────────────────────────
function TypewriterText({ text, delay = 1000 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 28);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <>
      {displayed}
      {started && displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-white/60 ml-0.5 animate-pulse" />
      )}
    </>
  );
}

// ── Neon code typer — types PMS JSON character by character ───────────────────
const CODE_LINES = [
  `{`,
  `  "employee": "Sarah Chen",`,
  `  "quarter": "Q1 2026",`,
  `  "overallScore": 4.7,`,
  `  "goals": {`,
  `    "completed": 12,`,
  `    "onTrack": 3,`,
  `    "alignment": "96%"`,
  `  },`,
  `  "review": {`,
  `    "status": "calibrated",`,
  `    "managerRating": 4.8,`,
  `    "peerAvg": 4.5,`,
  `    "selfScore": 4.6`,
  `  },`,
  `  "skills": [`,
  `    "Leadership",`,
  `    "Data Analysis",`,
  `    "Team Building"`,
  `  ],`,
  `  "aiInsight": "Top 5% performer",`,
  `  "devPlan": "Senior → Lead",`,
  `  "nextStep": "Promotion ready"`,
  `}`,
];

function NeonCodeTyper() {
  const [lines, setLines] = useState<string[]>([]);
  const preRef = useRef<HTMLPreElement>(null);
  const MAX_VISIBLE = 14;

  useEffect(() => {
    let buffer: string[] = [];
    let lineIdx = 0;
    let charIdx = 0;
    let mounted = true;

    function tick() {
      if (!mounted) return;

      const currentLine = CODE_LINES[lineIdx % CODE_LINES.length];

      if (charIdx === 0) {
        buffer.push('');
      }

      charIdx++;
      buffer[buffer.length - 1] = currentLine.slice(0, charIdx);

      if (buffer.length > MAX_VISIBLE) {
        buffer = buffer.slice(-MAX_VISIBLE);
      }

      setLines([...buffer]);

      if (charIdx >= currentLine.length) {
        charIdx = 0;
        lineIdx++;
        setTimeout(tick, 80);
      } else {
        setTimeout(tick, 12);
      }
    }

    const start = setTimeout(tick, 600);
    return () => { mounted = false; clearTimeout(start); };
  }, []);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/[0.06]"
      style={{
        background: 'rgba(10, 14, 24, 0.88)',
        boxShadow: '0 0 60px rgba(148, 210, 255, 0.05), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
        <div className="w-3 h-3 rounded-full bg-red-500/60" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <div className="w-3 h-3 rounded-full bg-green-500/60" />
        <span className="ml-3 text-xs text-white/30 font-mono">performance-review.json</span>
      </div>
      {/* Code area */}
      <div className="px-5 py-4 min-h-[320px] sm:min-h-[380px]">
        <pre
          ref={preRef}
          className="landing-neon-text font-mono text-xs sm:text-sm leading-relaxed whitespace-pre overflow-hidden"
        >
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i === lines.length - 1 && <span className="landing-code-cursor" />}
              {'\n'}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}

// ── Glass feature card (for USPs — icon + title + description) ───────────────
function GlassFeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ForwardRefExoticComponent<any>;
  title: string;
  description: string;
  delay: number;
}) {
  const { ref, visible } = useInView(0.2);
  return (
    <div
      ref={ref}
      className={`landing-glass-card rounded-2xl p-6 sm:p-8 transition-all duration-700 cursor-default group ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(28px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.2)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        transitionDelay: `${delay}ms`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110"
        style={{
          background: 'rgba(148, 210, 255, 0.08)',
          border: '1px solid rgba(148, 210, 255, 0.12)',
        }}
      >
        <Icon className="w-6 h-6 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
      </div>
      <h3 className="text-white text-xl font-semibold mb-3 font-display">{title}</h3>
      <p className="text-white/50 text-base leading-relaxed">{description}</p>
    </div>
  );
}

// ── Glass category card (for features — icon + title + bullet list) ──────────
function GlassCategoryCard({
  icon: Icon,
  title,
  features,
  delay,
}: {
  icon: React.ForwardRefExoticComponent<any>;
  title: string;
  features: string[];
  delay: number;
}) {
  const { ref, visible } = useInView(0.2);
  return (
    <div
      ref={ref}
      className={`landing-glass-card rounded-2xl p-7 sm:p-9 transition-all duration-700 cursor-default group ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(28px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.2)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        transitionDelay: `${delay}ms`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="w-13 h-13 rounded-xl flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110"
        style={{
          background: 'rgba(148, 210, 255, 0.08)',
          border: '1px solid rgba(148, 210, 255, 0.12)',
        }}
      >
        <Icon className="w-7 h-7 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
      </div>
      <h3 className="text-white text-xl font-semibold mb-4 font-display">{title}</h3>
      <ul className="space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-white/50 text-base leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400/40 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Animated counter — counts up on scroll ───────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView(0.3);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 2000;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease-out cubic for satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target]);

  return <span ref={ref as any}>{count}{suffix}</span>;
}

// ── Scroll-down indicator ────────────────────────────────────────────────────
function ScrollDownIndicator() {
  return (
    <div className="landing-scroll-indicator flex flex-col items-center gap-2">
      <span className="text-white/30 text-xs tracking-[0.2em] uppercase">Scroll</span>
      <ChevronDownIcon className="w-5 h-5 text-white/30" />
    </div>
  );
}

// ── Feature categories data ──────────────────────────────────────────────────
const FEATURE_CATEGORIES = [
  {
    icon: FlagIcon,
    title: 'Core Performance',
    features: [
      'Goals & OKRs with cascading alignment and velocity analytics',
      '360-degree reviews: peer, manager, self-appraisal, calibration',
      'Continuous feedback, recognition wall, kudos & badges',
      'One-on-one meetings with notes and action items',
    ],
  },
  {
    icon: AcademicCapIcon,
    title: 'Growth & Development',
    features: [
      'Skills matrix & gap analysis with competency heatmaps',
      'AI-driven career pathing & individual development plans',
      'Mentorship program matching and progress tracking',
      'Performance improvement plans with milestone tracking',
    ],
  },
  {
    icon: Cog6ToothIcon,
    title: 'Management & Operations',
    features: [
      'Calibration sessions with AI-assisted group alignment',
      'Compensation & rewards proposals, approvals, and equity',
      'AI-explainable promotions engine with nominations',
      'Succession planning with readiness assessment',
    ],
  },
  {
    icon: CpuChipIcon,
    title: 'Analytics & AI',
    features: [
      '11 specialized AI agents for workforce intelligence',
      'Real-time dashboards with anomaly detection & sentiment',
      'Performance simulator for scenario planning & what-if',
      'Bias detection & fairness firewall with transparent AI',
    ],
  },
  {
    icon: ShieldCheckIcon,
    title: 'Enterprise & Security',
    features: [
      'Multi-tenant SaaS with row-level data isolation',
      'RBAC + ABAC access control with time-bound policies',
      'Audit logging & real-time threat detection',
      'Excel bulk upload with AI data quality scoring',
    ],
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'Communication & Engagement',
    features: [
      'Real-time chat & push notifications via WebSocket',
      'Pulse surveys for engagement, culture & sentiment',
      'Company-wide announcements & news feed',
      'Calendar scheduling & meeting coordination',
    ],
  },
];

// ── USP data ─────────────────────────────────────────────────────────────────
const USPS = [
  {
    icon: BoltIcon,
    title: 'AI-Powered Everything',
    description: '11 specialized agents covering workforce intelligence, NLP queries, talent marketplace, and predictive analytics.',
  },
  {
    icon: EyeIcon,
    title: 'Explainable AI',
    description: 'Bias detection, proof engine, and full transparency into every AI-driven decision and recommendation.',
  },
  {
    icon: LockClosedIcon,
    title: 'Enterprise-Grade Security',
    description: 'ABAC policies, end-to-end encryption, and real-time threat detection with cross-tenant blocking.',
  },
  {
    icon: SignalIcon,
    title: 'Real-Time Collaboration',
    description: 'WebSocket-powered live indicators, instant notifications, and concurrent editing across the platform.',
  },
  {
    icon: ScaleIcon,
    title: 'Comprehensive Compliance',
    description: 'Union contract enforcement, immutable audit trails, and regulatory-ready reporting built in.',
  },
  {
    icon: BeakerIcon,
    title: 'Performance Simulator',
    description: 'Scenario planning and what-if analysis to model organizational changes before they happen.',
  },
  {
    icon: HeartIcon,
    title: 'Cultural Intelligence',
    description: 'Friction index analysis, burnout detection, and team health scoring for proactive intervention.',
  },
];


// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN LANDING PAGE ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useInView(0.1);
  const codeRef = useInView(0.15);

  // Video — slow playback for cinematic feel
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.6;
  }, []);

  return (
    <div ref={pageRef} className="landing-page relative min-h-screen bg-[rgb(10,13,26)] text-white overflow-x-hidden">

      {/* ═══ FIXED BACKGROUND — Video ════════════════════════════════════ */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          onLoadedData={handleVideoLoaded}
        >
          <source src="/bg-vid.webm" type="video/webm" />
        </video>
        {/* Darken slightly so text is readable */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <CursorGlow containerRef={pageRef} />

      {/* ═══ SCROLLABLE CONTENT ═══════════════════════════════════════════ */}
      <div className="relative z-10">

        {/* ── SECTION 1: HERO — Full viewport ────────────────────────────── */}
        <section
          ref={heroRef.ref}
          className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-10 text-center relative"
        >
          {/* Logo */}
          <div
            className={`flex items-center gap-4 mb-10 transition-all duration-1000 ${
              heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'
            }`}
          >
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              }}
            >
              <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-4xl sm:text-5xl font-display font-bold text-white tracking-wide"
                style={{ textShadow: '0 2px 20px rgba(148,210,255,0.15)' }}
              >
                PMS
              </span>
              <span className="text-2xl sm:text-3xl font-display font-light text-white/60">Suite</span>
            </div>
          </div>

          {/* Headline */}
          <h1
            className={`font-display font-black text-white leading-[1.05] tracking-tighter max-w-4xl mb-8 transition-all duration-1000 delay-200 ${
              heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{
              fontSize: 'clamp(3.2rem, 9vw, 7.5rem)',
              textShadow: '0 4px 30px rgba(0,0,0,0.6), 0 0 80px rgba(148,210,255,0.1)',
            }}
          >
            Track impact,{' '}
            <br className="hidden sm:block" />
            not just activity.
          </h1>

          {/* Shimmer underline */}
          <div
            className={`relative h-1 w-48 sm:w-64 rounded-full mb-8 transition-all duration-1000 delay-300 ${
              heroRef.visible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
            }`}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, rgba(148,210,255,0.5), rgba(120,200,255,0.3), rgba(148,210,255,0.5))',
                backgroundSize: '200% 100%',
                animation: 'gradientFlow 4s ease infinite',
              }}
            />
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div
                className="w-full h-full animate-shimmer"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
          </div>

          {/* Typewriter subtitle */}
          <p
            className={`text-white/80 text-xl sm:text-2xl lg:text-3xl leading-relaxed max-w-2xl mb-10 min-h-[3em] transition-all duration-1000 delay-500 ${
              heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
          >
            <TypewriterText
              text="Next-generation performance intelligence. Where ambition meets data-driven growth."
              delay={1200}
            />
          </p>

          {/* CTA Button */}
          <div
            className={`transition-all duration-1000 delay-700 ${
              heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-500 hover:scale-105 hover:shadow-[0_8px_40px_rgba(148,210,255,0.25)]"
              style={{
                background: 'linear-gradient(135deg, rgba(148,210,255,0.45), rgba(120,200,255,0.3))',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 4px 20px rgba(148,210,255,0.15), inset 0 1px 0 rgba(255,255,255,0.12)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              Enter Platform
              <ArrowRightIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Trust line */}
          <p
            className={`text-white/25 text-sm mt-8 tracking-wide transition-all duration-1000 delay-1000 ${
              heroRef.visible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Trusted by forward-thinking organizations worldwide
          </p>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <ScrollDownIndicator />
          </div>
        </section>

        {/* ── SECTION 2: CODE TYPING + DESCRIPTION ───────────────────────── */}
        <section
          ref={codeRef.ref}
          className="min-h-screen flex items-center py-20 sm:py-32 px-6 sm:px-10"
        >
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Code typer */}
            <div
              className={`transition-all duration-1000 ${
                codeRef.visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
              }`}
            >
              <NeonCodeTyper />
            </div>

            {/* Right — Description */}
            <div
              className={`transition-all duration-1000 delay-300 ${
                codeRef.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
              }`}
            >
              <div
                className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6"
                style={{
                  background: 'rgba(148, 210, 255, 0.08)',
                  border: '1px solid rgba(148, 210, 255, 0.12)',
                  color: 'rgba(148, 210, 255, 0.9)',
                }}
              >
                Real-time Data
              </div>
              <h2
                className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6"
                style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
              >
                Intelligence,{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #94d2ff, #e0f0ff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Engineered.
                </span>
              </h2>
              <p className="text-white/50 text-lg sm:text-xl leading-relaxed mb-6">
                Real-time performance data flowing through every layer of your organization.
                From individual goals to company-wide analytics &mdash; every metric, every insight,
                continuously computed and instantly accessible.
              </p>
              <p className="text-white/35 text-base leading-relaxed">
                AI-powered calibration. 360-degree reviews. Skill gap analysis. Career pathing.
                All unified in one intelligent platform that evolves with your team.
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: FEATURE CATEGORIES (3x2 grid) ────────────────────── */}
        <section className="py-24 sm:py-36 px-6 sm:px-10">
          <div className="max-w-7xl mx-auto">
            {/* Section header */}
            {(() => {
              const headerRef = useInView(0.2);
              return (
                <div
                  ref={headerRef.ref}
                  className={`text-center mb-16 transition-all duration-1000 ${
                    headerRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                >
                  <div
                    className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6"
                    style={{
                      background: 'rgba(148, 210, 255, 0.08)',
                      border: '1px solid rgba(148, 210, 255, 0.12)',
                      color: 'rgba(148, 210, 255, 0.9)',
                    }}
                  >
                    Platform Capabilities
                  </div>
                  <h2
                    className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-6xl"
                    style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
                  >
                    Everything You Need to{' '}
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #94d2ff, #e0f0ff)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Excel
                    </span>
                  </h2>
                </div>
              );
            })()}

            {/* Feature category cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {FEATURE_CATEGORIES.map((cat, i) => (
                <GlassCategoryCard key={cat.title} {...cat} delay={i * 100} />
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: USPs — What Sets Us Apart ────────────────────────── */}
        <section className="py-24 sm:py-36 px-6 sm:px-10">
          <div className="max-w-7xl mx-auto">
            {/* Section header */}
            {(() => {
              const uspHeaderRef = useInView(0.2);
              return (
                <div
                  ref={uspHeaderRef.ref}
                  className={`text-center mb-16 transition-all duration-1000 ${
                    uspHeaderRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                >
                  <div
                    className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6"
                    style={{
                      background: 'rgba(148, 210, 255, 0.08)',
                      border: '1px solid rgba(148, 210, 255, 0.12)',
                      color: 'rgba(148, 210, 255, 0.9)',
                    }}
                  >
                    Why PMS Suite
                  </div>
                  <h2
                    className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-6xl"
                    style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
                  >
                    What Sets Us{' '}
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #94d2ff, #e0f0ff)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Apart
                    </span>
                  </h2>
                </div>
              );
            })()}

            {/* USP cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {USPS.map((usp, i) => (
                <GlassFeatureCard key={usp.title} icon={usp.icon} title={usp.title} description={usp.description} delay={i * 80} />
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: STATS BAR — Animated counters ────────────────────── */}
        <section className="py-16 sm:py-20 px-6 sm:px-10">
          <div className="max-w-5xl mx-auto">
            <div
              className="rounded-2xl p-8 sm:p-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(24px) saturate(1.2)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <div>
                <div className="text-4xl sm:text-5xl font-display font-bold text-white mb-2">
                  <AnimatedCounter target={129} suffix="+" />
                </div>
                <div className="text-white/40 text-base">Data Models</div>
              </div>
              <div>
                <div className="text-4xl sm:text-5xl font-display font-bold text-white mb-2">
                  <AnimatedCounter target={44} suffix="+" />
                </div>
                <div className="text-white/40 text-base">API Modules</div>
              </div>
              <div>
                <div className="text-4xl sm:text-5xl font-display font-bold text-white mb-2">
                  <AnimatedCounter target={11} />
                </div>
                <div className="text-white/40 text-base">AI Agents</div>
              </div>
              <div>
                <div className="text-4xl sm:text-5xl font-display font-bold text-white mb-2">
                  <AnimatedCounter target={360} suffix="&#176;" />
                </div>
                <div className="text-white/40 text-base">Review Coverage</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: FOOTER CTA ──────────────────────────────────────── */}
        <section className="py-20 sm:py-32 px-6 sm:px-10">
          {(() => {
            const footerRef = useInView(0.2);
            return (
              <div
                ref={footerRef.ref}
                className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${
                  footerRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              >
                <h2
                  className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-5xl mb-6"
                  style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
                >
                  Ready to transform{' '}
                  <br className="hidden sm:block" />
                  performance management?
                </h2>
                <p className="text-white/40 text-lg sm:text-xl mb-10">
                  Join organizations that have moved beyond spreadsheets and annual reviews.
                </p>
                <Link
                  to="/login"
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-500 hover:scale-105 hover:shadow-[0_8px_40px_rgba(148,210,255,0.25)]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(148,210,255,0.45), rgba(120,200,255,0.3))',
                    border: '1px solid rgba(255,255,255,0.18)',
                    boxShadow: '0 4px 20px rgba(148,210,255,0.15), inset 0 1px 0 rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                >
                  Get Started
                  <ArrowRightIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            );
          })()}

          {/* Footer line */}
          <div className="mt-20 text-center">
            <div className="h-px w-32 mx-auto mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(148,210,255,0.2), transparent)' }} />
            <p className="text-white/20 text-xs sm:text-sm tracking-wide">
              PMS Suite v2.4.0 &middot; Next-Gen Performance Intelligence &middot; &copy; 2026
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
