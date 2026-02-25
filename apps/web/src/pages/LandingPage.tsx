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
  GlobeAltIcon,
} from '@heroicons/react/24/outline';


// ═══════════════════════════════════════════════════════════════════════════════
// ── HOOKS ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ── Scroll-triggered visibility ──────────────────────────────────────────────
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

// ── 3D perspective tilt on hover ─────────────────────────────────────────────
function useTilt(intensity = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      el.style.transform = `perspective(800px) rotateX(${-ny * intensity * 0.6}deg) rotateY(${nx * intensity}deg) scale3d(1.02,1.02,1)`;
    });
  }, [intensity]);
  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (ref.current) ref.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  }, []);
  return { ref, onMouseMove, onMouseLeave };
}

// ── Scroll parallax offset ───────────────────────────────────────────────────
function useParallax(speed = 0.3) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let raf = 0;
    const handle = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setOffset(window.scrollY * speed)); };
    window.addEventListener('scroll', handle, { passive: true });
    return () => { window.removeEventListener('scroll', handle); cancelAnimationFrame(raf); };
  }, [speed]);
  return offset;
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── AMBIENT BACKGROUND COMPONENTS ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function FilmGrainOverlay() {
  return <div className="landing-film-grain" />;
}

function FloatingParticles() {
  const dots = [
    { size: 2, x: 8, delay: '0s' }, { size: 3, x: 18, delay: '2s' },
    { size: 2, x: 32, delay: '5s' }, { size: 4, x: 48, delay: '1s' },
    { size: 2, x: 58, delay: '7s' }, { size: 3, x: 72, delay: '3s' },
    { size: 2, x: 82, delay: '9s' }, { size: 3, x: 28, delay: '6s' },
    { size: 2, x: 65, delay: '4s' }, { size: 3, x: 92, delay: '8s' },
  ];
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/20 animate-particle-rise"
          style={{
            width: d.size, height: d.size,
            left: `${d.x}%`, bottom: '-2%',
            animationDelay: d.delay, animationDuration: `${8 + i * 1.5}s`,
          }}
        />
      ))}
    </div>
  );
}

function AuroraGlowSpots() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-aurora-sway"
        style={{ top: '10%', left: '-5%', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', filter: 'blur(80px)' }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-celestial-drift"
        style={{ top: '50%', right: '-8%', background: 'radial-gradient(circle, rgba(148,210,255,0.03) 0%, transparent 70%)', filter: 'blur(80px)' }}
      />
      <div
        className="absolute w-[550px] h-[550px] rounded-full animate-nebula-pulse"
        style={{ top: '75%', left: '20%', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)', filter: 'blur(80px)' }}
      />
    </div>
  );
}

function StarTwinkle() {
  const stars = [
    { x: 12, y: 8, d: '0s' }, { x: 88, y: 15, d: '0.5s' },
    { x: 45, y: 25, d: '1s' }, { x: 72, y: 40, d: '1.5s' },
    { x: 20, y: 55, d: '2s' }, { x: 90, y: 62, d: '0.8s' },
    { x: 35, y: 78, d: '1.8s' }, { x: 60, y: 90, d: '2.5s' },
  ];
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none">
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute w-[2px] h-[2px] rounded-full bg-white/30 animate-star-twinkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: s.d }}
        />
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── CURSOR GLOW — Dual-layer frosted spotlight ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function CursorGlow({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!container || !outer || !inner) return;
    let raf = 0;
    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top + container.scrollTop;
        outer.style.opacity = '1';
        outer.style.transform = `translate(${x - 400}px, ${y - 400}px)`;
        inner.style.opacity = '1';
        inner.style.transform = `translate(${x - 120}px, ${y - 120}px)`;
      });
    };
    const handleLeave = () => { outer.style.opacity = '0'; inner.style.opacity = '0'; };
    container.addEventListener('mousemove', handleMove);
    container.addEventListener('mouseleave', handleLeave);
    return () => {
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('mouseleave', handleLeave);
      cancelAnimationFrame(raf);
    };
  }, [containerRef]);
  return (
    <>
      <div
        ref={outerRef}
        className="absolute w-[800px] h-[800px] rounded-full pointer-events-none opacity-0 transition-opacity duration-300 z-[3]"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 30%, transparent 50%)', filter: 'blur(40px)' }}
      />
      <div
        ref={innerRef}
        className="absolute w-[240px] h-[240px] rounded-full pointer-events-none opacity-0 transition-opacity duration-200 z-[3]"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)', filter: 'blur(15px)' }}
      />
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── TEXT EFFECT COMPONENTS ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function TypewriterText({ text, delay = 1000 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setStarted(true), delay); return () => clearTimeout(t); }, [delay]);
  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => { setDisplayed(text.slice(0, i + 1)); i++; if (i >= text.length) clearInterval(interval); }, 28);
    return () => clearInterval(interval);
  }, [started, text]);
  return <>{displayed}{started && displayed.length < text.length && <span className="inline-block w-[2px] h-[1em] bg-white/60 ml-0.5 animate-pulse" />}</>;
}

function WordRevealHeading({ text, visible, baseDelay = 0 }: { text: string; visible: boolean; baseDelay?: number }) {
  const words = text.split(' ');
  return (
    <span className={visible ? 'landing-word-reveal' : ''}>
      {words.map((word, i) => (
        <span key={i} style={visible ? { animationDelay: `${baseDelay + i * 0.12}s` } : { opacity: 0 }}>
          {word}{i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── NEON CODE TYPER ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const CODE_LINES = [
  `{`, `  "employee": "Sarah Chen",`, `  "quarter": "Q1 2026",`, `  "overallScore": 4.7,`,
  `  "goals": {`, `    "completed": 12,`, `    "onTrack": 3,`, `    "alignment": "96%"`, `  },`,
  `  "review": {`, `    "status": "calibrated",`, `    "managerRating": 4.8,`,
  `    "peerAvg": 4.5,`, `    "selfScore": 4.6`, `  },`,
  `  "skills": [`, `    "Leadership",`, `    "Data Analysis",`, `    "Team Building"`, `  ],`,
  `  "aiInsight": "Top 5% performer",`, `  "devPlan": "Senior → Lead",`, `  "nextStep": "Promotion ready"`, `}`,
];

function NeonCodeTyper() {
  const [lines, setLines] = useState<string[]>([]);
  const preRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    let buffer: string[] = []; let lineIdx = 0; let charIdx = 0; let mounted = true;
    function tick() {
      if (!mounted) return;
      const currentLine = CODE_LINES[lineIdx % CODE_LINES.length];
      if (charIdx === 0) buffer.push('');
      charIdx++;
      buffer[buffer.length - 1] = currentLine.slice(0, charIdx);
      if (buffer.length > 14) buffer = buffer.slice(-14);
      setLines([...buffer]);
      if (charIdx >= currentLine.length) { charIdx = 0; lineIdx++; setTimeout(tick, 80); }
      else setTimeout(tick, 12);
    }
    const start = setTimeout(tick, 600);
    return () => { mounted = false; clearTimeout(start); };
  }, []);
  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/[0.08] landing-tilt-card"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(28px) saturate(1.2)', WebkitBackdropFilter: 'blur(28px) saturate(1.2)',
      }}
    >
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
        <div className="w-3 h-3 rounded-full bg-red-500/60" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <div className="w-3 h-3 rounded-full bg-green-500/60" />
        <span className="ml-3 text-xs text-white/30 font-mono">performance-review.json</span>
      </div>
      <div className="px-6 py-5 min-h-[360px] sm:min-h-[420px]">
        <pre ref={preRef} className="landing-neon-text font-mono text-sm sm:text-base leading-relaxed whitespace-pre overflow-hidden">
          {lines.map((line, i) => (
            <span key={i}>{line}{i === lines.length - 1 && <span className="landing-code-cursor" />}{'\n'}</span>
          ))}
        </pre>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── CARD COMPONENTS ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function GlassFeatureCard({ icon: Icon, title, description, delay }: {
  icon: React.ForwardRefExoticComponent<any>; title: string; description: string; delay: number;
}) {
  const { ref: viewRef, visible } = useInView(0.2);
  const tilt = useTilt(8);
  return (
    <div ref={viewRef} className="h-full">
      <div
        ref={tilt.ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        className={`landing-glass-card landing-tilt-card rounded-2xl p-6 sm:p-7 h-full transition-all duration-700 cursor-default group ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{
          background: 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(28px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.2)', border: '1px solid rgba(255, 255, 255, 0.08)',
          transitionDelay: `${delay}ms`, boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 animate-icon-glow-pulse"
          style={{ background: 'rgba(148, 210, 255, 0.08)', border: '1px solid rgba(148, 210, 255, 0.12)' }}>
          <Icon className="w-7 h-7 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
        </div>
        <h3 className="text-white text-2xl font-semibold mb-3 font-display">{title}</h3>
        <p className="text-white/50 text-lg leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function GlassCategoryCard({ icon: Icon, title, features, delay }: {
  icon: React.ForwardRefExoticComponent<any>; title: string; features: string[]; delay: number;
}) {
  const { ref: viewRef, visible } = useInView(0.2);
  const tilt = useTilt(8);
  return (
    <div ref={viewRef} className="h-full">
      <div
        ref={tilt.ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        className={`landing-glass-card landing-tilt-card rounded-2xl p-6 sm:p-7 h-full transition-all duration-700 cursor-default group ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{
          background: 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(28px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.2)', border: '1px solid rgba(255, 255, 255, 0.08)',
          transitionDelay: `${delay}ms`, boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 animate-icon-glow-pulse"
          style={{ background: 'rgba(148, 210, 255, 0.08)', border: '1px solid rgba(148, 210, 255, 0.12)' }}>
          <Icon className="w-8 h-8 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
        </div>
        <h3 className="text-white text-2xl font-semibold mb-5 font-display">{title}</h3>
        <ul className="space-y-3">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-white/50 text-lg leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400/40 flex-shrink-0" />{f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const { ref, visible } = useInView(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 2000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * target));
      if (p < 1) requestAnimationFrame(step); else setDone(true);
    };
    requestAnimationFrame(step);
  }, [visible, target]);
  return <span ref={ref as any} className={done ? 'animate-number-shimmer' : ''}>{count}{suffix}</span>;
}

function ScrollDownIndicator() {
  return (
    <div className="landing-scroll-indicator flex flex-col items-center gap-2">
      <span className="text-white/30 text-xs tracking-[0.2em] uppercase">Scroll</span>
      <ChevronDownIcon className="w-5 h-5 text-white/30" />
    </div>
  );
}

function SectionDivider() {
  return <div className="landing-divider max-w-xs mx-auto my-1" />;
}

// ── How It Works — 3-step process strip ─────────────────────────────────────
function HowItWorksStrip() {
  const { ref, visible } = useInView(0.2);
  const steps = [
    { num: '01', title: 'Set Goals & OKRs', desc: 'Cascade objectives from company to individual. AI suggests alignment.' },
    { num: '02', title: 'Continuous Feedback', desc: '360° reviews, peer recognition, 1-on-1s — all in real-time.' },
    { num: '03', title: 'AI-Driven Insights', desc: '70 agents analyze performance, detect bias, predict attrition.' },
  ];
  return (
    <section ref={ref} className="py-10 sm:py-14 px-6 sm:px-12 lg:px-16">
      <div className="max-w-[90rem] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className={`flex gap-4 items-start transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 150}ms` }}>
              <span className="text-3xl sm:text-4xl font-display font-bold text-white/10 flex-shrink-0 leading-none">{s.num}</span>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">{s.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── AI Capabilities Highlight Row ───────────────────────────────────────────
function AICapabilitiesRow() {
  const { ref, visible } = useInView(0.2);
  const capabilities = [
    { label: 'Bias Firewall', desc: 'Detect & prevent rating bias in real-time' },
    { label: 'Attrition Predictor', desc: 'Identify flight risk 90 days early' },
    { label: 'Calibration AI', desc: 'Auto-align ratings across teams & managers' },
    { label: 'Skill Gap Mapper', desc: 'Map competencies to career path requirements' },
    { label: 'Sentiment Engine', desc: 'Analyze feedback tone & engagement signals' },
    { label: 'Proof Engine', desc: 'Explain every AI decision with evidence trails' },
  ];
  return (
    <section ref={ref} className="py-10 sm:py-14 px-6 sm:px-12 lg:px-16">
      <div className="max-w-[90rem] mx-auto">
        <p className={`text-center text-white/25 text-xs tracking-[0.2em] uppercase mb-8 transition-all duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          AI Agent Capabilities
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {capabilities.map((c, i) => (
            <div key={c.label}
              className={`rounded-xl p-4 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', transitionDelay: `${i * 80}ms` }}>
              <div className="text-white/70 text-sm font-semibold mb-1">{c.label}</div>
              <div className="text-white/25 text-xs leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Integration / Workflow Row ──────────────────────────────────────────────
function WorkflowRow() {
  const { ref, visible } = useInView(0.2);
  const items = [
    'Goal Setting → OKR Cascade → Alignment Check',
    'Review Cycle → Peer Feedback → Calibration → Final Rating',
    'Skill Assessment → Gap Analysis → Development Plan → Mentorship',
    'Pulse Survey → Sentiment AI → Culture Score → Action Items',
  ];
  return (
    <section ref={ref} className="py-8 sm:py-10 px-6 sm:px-12 lg:px-16">
      <div className="max-w-[90rem] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-lg px-5 py-3 transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', transitionDelay: `${i * 100}ms` }}>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 flex-shrink-0" />
            <span className="text-white/35 text-xs sm:text-sm font-mono tracking-wide">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Animated horizontal metric bar ──────────────────────────────────────────
function MetricBar({ label, value, width, delay }: { label: string; value: string; width: string; delay: number }) {
  const { ref, visible } = useInView(0.3);
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/50 text-sm font-mono tracking-wide">{label}</span>
        <span className="text-white/70 text-sm font-semibold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className={`h-full rounded-full transition-all duration-[2000ms] ease-out ${visible ? '' : '!w-0'}`}
          style={{ width: visible ? width : '0%', background: 'linear-gradient(90deg, rgba(148,210,255,0.3), rgba(148,210,255,0.6))', transitionDelay: `${delay + 200}ms` }} />
      </div>
    </div>
  );
}

// ── Scrolling feature badges ────────────────────────────────────────────────
function ScrollingBadges() {
  const badges = [
    'Goal Cascading', 'OKR Tracking', 'Peer Reviews', 'Self-Appraisal', 'Calibration Sessions',
    'AI Recommendations', 'Bias Detection', 'Career Pathing', 'Skills Matrix', 'Mentorship',
    'Pulse Surveys', 'Recognition', 'Succession Plans', 'PIP Tracking', 'Compensation',
    'Audit Logs', 'RBAC + ABAC', 'Real-time Chat', 'Analytics', 'Data Export',
  ];
  return (
    <div className="py-6 overflow-hidden">
      <div className="landing-marquee flex gap-3">
        {[...badges, ...badges].map((b, i) => (
          <span key={i} className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium text-white/40 whitespace-nowrap border border-white/[0.06]"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── DATA ARRAYS ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const MARQUEE_ITEMS = [
  'Goals & OKRs', '360-Degree Reviews', 'AI Analytics', 'Career Pathing',
  'Succession Planning', 'Calibration', 'Skills Matrix', 'Real-time Chat',
  '70 AI Agents', 'Bias Firewall', 'Performance Simulator', 'Pulse Surveys',
  'Competency Heatmaps', 'Development Plans', 'Recognition Wall', 'Mentorship',
];

const FEATURE_CATEGORIES = [
  { icon: FlagIcon, title: 'Core Performance', features: [
    'Goals & OKRs with cascading alignment and velocity analytics',
    '360-degree reviews: peer, manager, self-appraisal, calibration',
    'Continuous feedback, recognition wall, kudos & badges',
    'One-on-one meetings with notes and action items',
    'Review cycle automation with configurable workflows',
  ]},
  { icon: AcademicCapIcon, title: 'Growth & Development', features: [
    'Skills matrix & gap analysis with competency heatmaps',
    'AI-driven career pathing & individual development plans',
    'Mentorship program matching and progress tracking',
    'Performance improvement plans with milestone tracking',
    'Learning recommendations based on role & skill gaps',
  ]},
  { icon: Cog6ToothIcon, title: 'Management & Operations', features: [
    'Calibration sessions with AI-assisted group alignment',
    'Compensation & rewards proposals, approvals, and equity',
    'AI-explainable promotions engine with nominations',
    'Succession planning with readiness assessment',
    'Org chart visualization with reporting hierarchy',
  ]},
  { icon: CpuChipIcon, title: 'Analytics & AI', features: [
    '70 specialized AI agents for workforce intelligence',
    'Real-time dashboards with anomaly detection & sentiment',
    'Performance simulator for scenario planning & what-if',
    'Bias detection & fairness firewall with transparent AI',
    'Predictive attrition modeling with 90-day early warning',
  ]},
  { icon: ShieldCheckIcon, title: 'Enterprise & Security', features: [
    'Multi-tenant SaaS with row-level data isolation',
    'RBAC + ABAC access control with time-bound policies',
    'Audit logging & real-time threat detection',
    'Excel bulk upload with AI data quality scoring',
    'Cross-tenant access blocking with security alerts',
  ]},
  { icon: ChatBubbleLeftRightIcon, title: 'Communication & Engagement', features: [
    'Real-time chat & push notifications via WebSocket',
    'Pulse surveys for engagement, culture & sentiment',
    'Company-wide announcements & news feed',
    'Calendar scheduling & meeting coordination',
    'Email notifications with customizable templates',
  ]},
];

const USPS = [
  { icon: BoltIcon, title: 'AI-Powered Everything', description: '70 specialized agents spanning workforce intelligence, bio-performance, culture-empathy, governance, hyper-learning, and talent marketplace.' },
  { icon: EyeIcon, title: 'Explainable AI', description: 'Bias detection, proof engine, and full transparency into every AI-driven decision and recommendation.' },
  { icon: LockClosedIcon, title: 'Enterprise-Grade Security', description: 'ABAC policies, end-to-end encryption, and real-time threat detection with cross-tenant blocking.' },
  { icon: SignalIcon, title: 'Real-Time Collaboration', description: 'WebSocket-powered live indicators, instant notifications, and concurrent editing across the platform.' },
  { icon: ScaleIcon, title: 'Comprehensive Compliance', description: 'Union contract enforcement, immutable audit trails, and regulatory-ready reporting built in.' },
  { icon: BeakerIcon, title: 'Performance Simulator', description: 'Scenario planning and what-if analysis to model organizational changes before they happen.' },
  { icon: HeartIcon, title: 'Cultural Intelligence', description: 'Friction index analysis, burnout detection, and team health scoring for proactive intervention.' },
  { icon: GlobeAltIcon, title: 'Seamless Integrations', description: 'Connect with HRIS, payroll, Slack, Teams, and 50+ third-party tools via REST APIs and webhooks.' },
];

const BENTO_ITEMS = [
  { title: '70 AI Agents', subtitle: 'Workforce Intelligence', size: 'large' as const,
    desc: 'Bio-performance · Culture-empathy · Governance · Hyper-learning · Talent marketplace' },
  { title: 'Real-time Analytics', subtitle: 'Live Dashboards', size: 'medium' as const,
    desc: 'Anomaly detection, sentiment analysis, and predictive modeling.' },
  { title: 'Enterprise Security', subtitle: 'Zero Trust', size: 'medium' as const,
    desc: 'RBAC + ABAC, row-level isolation, encryption.' },
  { title: '99.9%', subtitle: 'Uptime SLA', size: 'small' as const, desc: '' },
  { title: 'SOC 2', subtitle: 'Ready', size: 'small' as const, desc: '' },
  { title: '360°', subtitle: 'Reviews', size: 'small' as const, desc: '' },
  { title: '129+', subtitle: 'Models', size: 'small' as const, desc: '' },
];

const TECH_LOGOS = [
  { name: 'React', icon: '⚛' }, { name: 'Node.js', icon: '⬡' },
  { name: 'PostgreSQL', icon: '🐘' }, { name: 'Redis', icon: '◆' },
  { name: 'Prisma', icon: '▲' }, { name: 'Socket.io', icon: '⚡' },
  { name: 'TypeScript', icon: 'TS' }, { name: 'Vite', icon: '⚡' },
];

const TESTIMONIALS = [
  { quote: 'PMS Suite eliminated our spreadsheet chaos. Calibration sessions that took days now take hours with AI-assisted alignment.',
    name: 'Alexandra Novak', role: 'VP of People Operations', company: 'TechForward Inc.' },
  { quote: 'The AI bias detection gave us confidence that every promotion decision is fair, transparent, and defensible.',
    name: 'Marcus Wei', role: 'Chief HR Officer', company: 'NovaCorp' },
  { quote: '70 AI agents analyzing performance data in real-time fundamentally changed how we think about talent development.',
    name: 'Priya Sharma', role: 'Head of Talent', company: 'Meridian Systems' },
];


// ═══════════════════════════════════════════════════════════════════════════════
// ── SECTION COMPONENTS ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function MarqueeStrip() {
  const row = MARQUEE_ITEMS.map(item => (
    <span key={item} className="text-white/30 text-sm tracking-wider uppercase font-mono whitespace-nowrap">
      {item}<span className="mx-4 text-white/15">·</span>
    </span>
  ));
  return (
    <section className="py-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="landing-marquee flex">{row}{row}</div>
      <div className="landing-marquee-reverse flex mt-3">{row}{row}</div>
    </section>
  );
}

function BentoGrid() {
  const { ref, visible } = useInView(0.15);
  const glassStyle = {
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(28px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(28px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
  };
  return (
    <section ref={ref} className="py-10 sm:py-16 px-6 sm:px-12 lg:px-16">
      <div className="max-w-[90rem] mx-auto">
        {/* Header */}
        <div className={`text-center mb-10 transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-block px-5 py-2 rounded-full text-sm font-semibold tracking-wider uppercase mb-5 animate-badge-float"
            style={{ background: 'rgba(148, 210, 255, 0.08)', border: '1px solid rgba(148, 210, 255, 0.12)', color: 'rgba(148, 210, 255, 0.9)' }}>
            Platform at a Glance
          </div>
          <h2 className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-6xl" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>
            Built for{' '}
            <span className="animate-text-shimmer" style={{ background: 'linear-gradient(135deg, #94d2ff, #e0f0ff, #94d2ff)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scale</span>
          </h2>
        </div>

        {/* Bento — clean 4-col layout, uniform cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
          {[
            { title: '70', subtitle: 'AI Agents', desc: 'Workforce intelligence across 6 domains', icon: CpuChipIcon, accent: true },
            { title: 'Real-time', subtitle: 'Analytics', desc: 'Anomaly detection & sentiment analysis', icon: SignalIcon, accent: false },
            { title: 'Enterprise', subtitle: 'Security', desc: 'RBAC + ABAC, row-level isolation', icon: ShieldCheckIcon, accent: false },
            { title: 'Simulator', subtitle: 'What-If', desc: 'Scenario planning & org modeling', icon: BeakerIcon, accent: false },
            { title: '99.9%', subtitle: 'Uptime SLA', desc: '', icon: null, accent: false },
            { title: 'SOC 2', subtitle: 'Compliance Ready', desc: '', icon: null, accent: false },
            { title: '360°', subtitle: 'Review Coverage', desc: '', icon: null, accent: false },
            { title: '129+', subtitle: 'Data Models', desc: '', icon: null, accent: false },
          ].map((item, i) => {
            const tilt = useTilt(6);
            return (
              <div key={item.title} ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}
                className={`col-span-1 landing-glass-card landing-tilt-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden
                  transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ ...glassStyle, transitionDelay: `${i * 80}ms` }}>
                {item.accent && (
                  <div className="absolute inset-0 animate-neural-pulse" style={{ background: 'radial-gradient(circle at 30% 40%, rgba(148,210,255,0.05) 0%, transparent 60%)', pointerEvents: 'none' }} />
                )}
                <div className="relative z-10">
                  {item.icon && (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 animate-icon-glow-pulse"
                      style={{ background: 'rgba(148,210,255,0.08)', border: '1px solid rgba(148,210,255,0.1)' }}>
                      <item.icon className="w-5 h-5 text-cyan-300/60" />
                    </div>
                  )}
                  {!item.icon && <div className="h-0.5 w-8 rounded-full mb-4 animate-pulse" style={{ background: 'rgba(148,210,255,0.2)' }} />}
                  <div className="font-display font-bold text-white text-3xl sm:text-4xl mb-0.5">{item.title}</div>
                  <div className="text-white/40 text-sm">{item.subtitle}</div>
                  {item.desc && <p className="text-white/25 text-xs mt-2 leading-relaxed">{item.desc}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TechLogosStrip() {
  const { ref, visible } = useInView(0.3);
  return (
    <section ref={ref} className="py-8 sm:py-10 px-6 sm:px-12 lg:px-16">
      <div className="max-w-[80rem] mx-auto">
        <p className={`text-center text-white/25 text-sm tracking-wider uppercase mb-10 transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          Powered by modern technology
        </p>
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
          {TECH_LOGOS.map((t, i) => (
            <div
              key={t.name}
              className={`flex flex-col items-center gap-2 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl animate-float"
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  animationDelay: `${i * 0.4}s`, animationDuration: `${5 + i * 0.5}s`,
                }}
              >
                <span className="text-white/50 font-mono">{t.icon}</span>
              </div>
              <span className="text-white/30 text-xs">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  return (
    <section className="py-10 sm:py-14 px-6 sm:px-12 lg:px-16">
      <div className="max-w-[90rem] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {TESTIMONIALS.map((t, i) => {
            const { ref, visible } = useInView(0.2);
            const tilt = useTilt(6);
            return (
              <div key={t.name} ref={ref}>
                <div
                  ref={tilt.ref}
                  onMouseMove={tilt.onMouseMove}
                  onMouseLeave={tilt.onMouseLeave}
                  className={`landing-glass-card landing-tilt-card rounded-2xl p-6 sm:p-7 h-full flex flex-col transition-all duration-700
                    ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{
                    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(28px) saturate(1.2)',
                    WebkitBackdropFilter: 'blur(28px) saturate(1.2)', border: '1px solid rgba(255,255,255,0.08)',
                    transitionDelay: `${i * 150}ms`, boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-6xl text-white/8 font-display leading-none select-none">&ldquo;</span>
                  <p className="text-white/60 text-lg leading-relaxed flex-1 -mt-4">{t.quote}</p>
                  <div className="landing-divider my-6" />
                  <div>
                    <div className="text-white font-semibold text-lg">{t.name}</div>
                    <div className="text-white/40 text-sm">{t.role} &middot; {t.company}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN LANDING PAGE ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useInView(0.1);
  const codeRef = useInView(0.15);
  const parallaxOffset = useParallax(0.15);

  const videoRef = useRef<HTMLVideoElement>(null);
  const handleVideoLoaded = useCallback(() => { if (videoRef.current) videoRef.current.playbackRate = 0.6; }, []);

  return (
    <div ref={pageRef} className="landing-page relative min-h-screen bg-[rgb(10,13,26)] text-white overflow-x-hidden">

      {/* ═══ FIXED BACKGROUND LAYERS ═════════════════════════════════════ */}
      <div className="fixed inset-0 z-0">
        <video ref={videoRef} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" onLoadedData={handleVideoLoaded}>
          <source src="/bg-vid.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <FilmGrainOverlay />
      <FloatingParticles />
      <AuroraGlowSpots />
      <StarTwinkle />
      <CursorGlow containerRef={pageRef} />

      {/* ═══ SCROLLABLE CONTENT ═══════════════════════════════════════════ */}
      <div className="relative z-10">

        {/* Parallax decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute right-[6%] top-[12%] w-24 h-24 rounded-full border border-white/[0.03]" style={{ transform: `translateY(${parallaxOffset * 0.8}px)` }} />
          <div className="absolute left-[4%] top-[35%] w-2 h-2 rounded-full bg-white/10" style={{ transform: `translateY(${parallaxOffset * 1.5}px)` }} />
          <div className="absolute right-[12%] top-[55%] w-3 h-3 rounded-full border border-white/[0.05]" style={{ transform: `translateY(${parallaxOffset * 1.2}px)` }} />
          <div className="absolute left-[8%] top-[72%] w-16 h-16 rounded-full border border-white/[0.02]" style={{ transform: `translateY(${parallaxOffset * 0.6}px)` }} />
          <div className="absolute right-[3%] top-[88%] w-1.5 h-1.5 rounded-full bg-white/8" style={{ transform: `translateY(${parallaxOffset * 2}px)` }} />
        </div>

        {/* ── SECTION 1: HERO ──────────────────────────────────────────── */}
        <section ref={heroRef.ref} className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-10 text-center relative">
          {/* Logo with pulse ring */}
          <div className={`flex items-center gap-4 mb-10 transition-all duration-1000 ${heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
                <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="absolute inset-0 rounded-2xl animate-pulse-ring border border-white/10" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-display font-bold text-white tracking-wide animate-text-glow"
                style={{ textShadow: '0 2px 20px rgba(148,210,255,0.15)' }}>PMS</span>
              <span className="text-2xl sm:text-3xl font-display font-light text-white/60">Suite</span>
            </div>
          </div>

          {/* Headline with word-by-word reveal */}
          <h1
            className={`font-display font-black text-white leading-[1.05] tracking-tighter max-w-4xl mb-8 transition-opacity duration-500 ${heroRef.visible ? 'opacity-100' : 'opacity-0'}`}
            style={{ fontSize: 'clamp(3.2rem, 9vw, 7.5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.6), 0 0 80px rgba(148,210,255,0.1)' }}
          >
            <WordRevealHeading text="Track impact, not just activity." visible={heroRef.visible} baseDelay={0.3} />
          </h1>

          {/* Shimmer underline */}
          <div className={`relative h-1 w-48 sm:w-64 rounded-full mb-8 transition-all duration-1000 delay-700 ${heroRef.visible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}>
            <div className="absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(90deg, rgba(148,210,255,0.5), rgba(120,200,255,0.3), rgba(148,210,255,0.5))', backgroundSize: '200% 100%', animation: 'gradientFlow 4s ease infinite' }} />
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="w-full h-full animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
            </div>
          </div>

          {/* Typewriter subtitle */}
          <p className={`text-white/80 text-xl sm:text-2xl lg:text-3xl leading-relaxed max-w-2xl mb-10 min-h-[3em] transition-all duration-1000 delay-1000 ${heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            <TypewriterText text="Next-generation performance intelligence. Where ambition meets data-driven growth." delay={1800} />
          </p>

          {/* CTA with spotlight sweep */}
          <div className={`transition-all duration-1000 delay-[1200ms] ${heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <Link to="/login"
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-500 hover:scale-105 hover:shadow-[0_8px_40px_rgba(148,210,255,0.25)] overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(148,210,255,0.45), rgba(120,200,255,0.3))', border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 4px 20px rgba(148,210,255,0.15), inset 0 1px 0 rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
              <span className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <span className="absolute inset-0 animate-spotlight-sweep" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)' }} />
              </span>
              <span className="relative">Enter Platform</span>
              <ArrowRightIcon className="w-5 h-5 relative transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Trust line */}
          <p className={`text-white/25 text-sm mt-8 tracking-wide transition-all duration-1000 delay-[1500ms] ${heroRef.visible ? 'opacity-100' : 'opacity-0'}`}>
            Trusted by forward-thinking organizations worldwide
          </p>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2"><ScrollDownIndicator /></div>
        </section>

        {/* ── SECTION 2: MARQUEE STRIP ─────────────────────────────────── */}
        <MarqueeStrip />

        {/* ── QUICK METRICS BAR ────────────────────────────────────────── */}
        <section className="py-8 sm:py-10 px-6 sm:px-12 lg:px-16">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-4">
            <MetricBar label="EMPLOYEE ENGAGEMENT" value="94%" width="94%" delay={0} />
            <MetricBar label="REVIEW COMPLETION" value="97%" width="97%" delay={100} />
            <MetricBar label="GOAL ALIGNMENT" value="91%" width="91%" delay={200} />
            <MetricBar label="AI ACCURACY" value="98%" width="98%" delay={300} />
          </div>
        </section>
        <SectionDivider />

        {/* ── SECTION 3: CODE TYPING + DESCRIPTION ─────────────────────── */}
        <section ref={codeRef.ref} className="py-10 sm:py-16 px-6 sm:px-12 lg:px-16">
          <div className="max-w-[90rem] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className={`transition-all duration-1000 ${codeRef.visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <NeonCodeTyper />
            </div>
            <div className={`transition-all duration-1000 delay-300 ${codeRef.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              <div className="inline-block px-5 py-2 rounded-full text-sm font-semibold tracking-wider uppercase mb-6 animate-badge-float"
                style={{ background: 'rgba(148, 210, 255, 0.08)', border: '1px solid rgba(148, 210, 255, 0.12)', color: 'rgba(148, 210, 255, 0.9)' }}>
                Real-time Data
              </div>
              <h2 className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>
                Intelligence,{' '}
                <span className="animate-text-shimmer" style={{ background: 'linear-gradient(135deg, #94d2ff, #e0f0ff, #94d2ff)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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

        {/* ── HOW IT WORKS — 3-step process ────────────────────────────── */}
        <HowItWorksStrip />
        <SectionDivider />

        {/* ── SECTION 4: BENTO GRID ────────────────────────────────────── */}
        <BentoGrid />
        <SectionDivider />

        {/* ── AI CAPABILITIES ROW ──────────────────────────────────────── */}
        <AICapabilitiesRow />
        <SectionDivider />

        {/* ── SECTION 5: FEATURE CATEGORIES (3×2) ──────────────────────── */}
        <section className="py-10 sm:py-16 px-6 sm:px-12 lg:px-16">
          <div className="max-w-[90rem] mx-auto">
            {(() => {
              const headerRef = useInView(0.2);
              return (
                <div ref={headerRef.ref} className={`text-center mb-10 transition-all duration-1000 ${headerRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <div className="inline-block px-5 py-2 rounded-full text-sm font-semibold tracking-wider uppercase mb-5 animate-badge-float"
                    style={{ background: 'rgba(148, 210, 255, 0.08)', border: '1px solid rgba(148, 210, 255, 0.12)', color: 'rgba(148, 210, 255, 0.9)' }}>
                    Platform Capabilities
                  </div>
                  <h2 className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-6xl" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>
                    Everything You Need to{' '}
                    <span className="animate-text-shimmer" style={{ background: 'linear-gradient(135deg, #94d2ff, #e0f0ff, #94d2ff)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Excel</span>
                  </h2>
                </div>
              );
            })()}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              {FEATURE_CATEGORIES.map((cat, i) => (<GlassCategoryCard key={cat.title} {...cat} delay={i * 100} />))}
            </div>
          </div>
        </section>

        {/* ── WORKFLOW PIPELINES ────────────────────────────────────────── */}
        <WorkflowRow />

        {/* ── Scrolling feature badges ─────────────────────────────────── */}
        <ScrollingBadges />
        <SectionDivider />

        {/* ── SECTION 6: USPs ──────────────────────────────────────────── */}
        <section className="py-10 sm:py-16 px-6 sm:px-12 lg:px-16">
          <div className="max-w-[90rem] mx-auto">
            {(() => {
              const uspHeaderRef = useInView(0.2);
              return (
                <div ref={uspHeaderRef.ref} className={`text-center mb-10 transition-all duration-1000 ${uspHeaderRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <div className="inline-block px-5 py-2 rounded-full text-sm font-semibold tracking-wider uppercase mb-5 animate-badge-float"
                    style={{ background: 'rgba(148, 210, 255, 0.08)', border: '1px solid rgba(148, 210, 255, 0.12)', color: 'rgba(148, 210, 255, 0.9)' }}>
                    Why PMS Suite
                  </div>
                  <h2 className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-6xl" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>
                    What Sets Us{' '}
                    <span className="animate-text-shimmer" style={{ background: 'linear-gradient(135deg, #94d2ff, #e0f0ff, #94d2ff)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Apart</span>
                  </h2>
                </div>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              {USPS.map((usp, i) => (<GlassFeatureCard key={usp.title} icon={usp.icon} title={usp.title} description={usp.description} delay={i * 80} />))}
            </div>
          </div>
        </section>
        <SectionDivider />

        {/* ── SECTION 7: TECH LOGOS ─────────────────────────────────────── */}
        <TechLogosStrip />

        {/* ── SECTION 8: STATS BAR ─────────────────────────────────────── */}
        <section className="py-10 sm:py-14 px-6 sm:px-12 lg:px-16">
          <div className="max-w-[80rem] mx-auto">
            <div className="rounded-3xl p-10 sm:p-14 grid grid-cols-2 sm:grid-cols-4 gap-10 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
                border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
              <div>
                <div className="text-5xl sm:text-6xl font-display font-bold text-white mb-3"><AnimatedCounter target={129} suffix="+" /></div>
                <div className="text-white/40 text-lg">Data Models</div>
              </div>
              <div>
                <div className="text-5xl sm:text-6xl font-display font-bold text-white mb-3"><AnimatedCounter target={44} suffix="+" /></div>
                <div className="text-white/40 text-lg">API Modules</div>
              </div>
              <div>
                <div className="text-5xl sm:text-6xl font-display font-bold text-white mb-3"><AnimatedCounter target={70} /></div>
                <div className="text-white/40 text-lg">AI Agents</div>
              </div>
              <div>
                <div className="text-5xl sm:text-6xl font-display font-bold text-white mb-3"><AnimatedCounter target={360} suffix="&#176;" /></div>
                <div className="text-white/40 text-lg">Review Coverage</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 9: TESTIMONIALS ──────────────────────────────────── */}
        <TestimonialSection />

        {/* ── SECTION 10: FOOTER CTA ───────────────────────────────────── */}
        <section className="py-10 sm:py-16 px-6 sm:px-12 lg:px-16">
          {(() => {
            const footerRef = useInView(0.2);
            return (
              <div ref={footerRef.ref} className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${footerRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <h2 className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-5xl mb-6" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>
                  Ready to transform{' '}<br className="hidden sm:block" />performance management?
                </h2>
                <p className="text-white/40 text-lg sm:text-xl mb-10">
                  Join organizations that have moved beyond spreadsheets and annual reviews.
                </p>
                <Link to="/login"
                  className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-500 hover:scale-105 hover:shadow-[0_8px_40px_rgba(148,210,255,0.25)] overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(148,210,255,0.45), rgba(120,200,255,0.3))', border: '1px solid rgba(255,255,255,0.18)',
                    boxShadow: '0 4px 20px rgba(148,210,255,0.15), inset 0 1px 0 rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                  <span className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <span className="absolute inset-0 animate-spotlight-sweep" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)' }} />
                  </span>
                  <span className="relative">Get Started</span>
                  <ArrowRightIcon className="w-5 h-5 relative transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            );
          })()}
          <div className="mt-20 text-center">
            <div className="landing-divider max-w-32 mx-auto mb-6" />
            <p className="text-white/20 text-xs sm:text-sm tracking-wide">
              PMS Suite v2.4.0 &middot; Next-Gen Performance Intelligence &middot; &copy; 2026
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
