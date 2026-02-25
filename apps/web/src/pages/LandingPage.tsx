import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  FlagIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ArrowRightIcon,
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

// ── Cursor glow — mouse-following radial light ───────────────────────────────
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
        glow.style.transform = `translate(${x - 300}px, ${y - 300}px)`;
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
      className="absolute w-[600px] h-[600px] rounded-full pointer-events-none opacity-0 transition-opacity duration-500 z-[3]"
      style={{
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(102,108,255,0.06) 35%, transparent 60%)',
        filter: 'blur(10px)',
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

      // Keep only last N lines visible
      if (buffer.length > MAX_VISIBLE) {
        buffer = buffer.slice(-MAX_VISIBLE);
      }

      setLines([...buffer]);

      if (charIdx >= currentLine.length) {
        // Finished this line — move to next
        charIdx = 0;
        lineIdx++;
        setTimeout(tick, 80); // Pause between lines
      } else {
        setTimeout(tick, 12); // Character speed
      }
    }

    // Start after a brief delay
    const start = setTimeout(tick, 600);
    return () => { mounted = false; clearTimeout(start); };
  }, []);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/[0.06]"
      style={{
        background: 'rgba(15, 18, 40, 0.85)',
        boxShadow: '0 0 60px rgba(102, 108, 255, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
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

// ── Glass feature card ───────────────────────────────────────────────────────
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
        background: 'rgba(22, 27, 66, 0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.12)',
        transitionDelay: `${delay}ms`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110"
        style={{
          background: 'rgba(139, 92, 246, 0.12)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
      >
        <Icon className="w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
      </div>
      <h3 className="text-white text-lg font-semibold mb-3 font-display">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
    </div>
  );
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
                boxShadow: '0 8px 32px rgba(139,92,246,0.15)',
              }}
            >
              <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl sm:text-4xl font-display font-bold text-white tracking-wide"
                style={{ textShadow: '0 2px 20px rgba(139,92,246,0.4)' }}
              >
                PMS
              </span>
              <span className="text-xl sm:text-2xl font-display font-light text-white/60">Suite</span>
            </div>
          </div>

          {/* Headline */}
          <h1
            className={`font-display font-black text-white leading-[1.05] tracking-tighter max-w-4xl mb-8 transition-all duration-1000 delay-200 ${
              heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{
              fontSize: 'clamp(2.8rem, 8vw, 6.5rem)',
              textShadow: '0 4px 30px rgba(0,0,0,0.6), 0 0 80px rgba(139,92,246,0.2)',
            }}
          >
            Outgrow Yesterday.{' '}
            <br className="hidden sm:block" />
            Own Tomorrow.
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
                background: 'linear-gradient(90deg, rgba(139,92,246,0.6), rgba(102,108,255,0.4), rgba(139,92,246,0.6))',
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
            className={`text-white/80 text-lg sm:text-2xl leading-relaxed max-w-2xl mb-10 min-h-[3em] transition-all duration-1000 delay-500 ${
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
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-500 hover:scale-105 hover:shadow-[0_8px_40px_rgba(139,92,246,0.4)]"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(102,108,255,0.6))',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 4px 20px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
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
                  background: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: 'rgba(167, 139, 250, 0.9)',
                }}
              >
                Real-time Data
              </div>
              <h2
                className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-6"
                style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
              >
                Intelligence,{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #a78bfa, #666cff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Engineered.
                </span>
              </h2>
              <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-6">
                Real-time performance data flowing through every layer of your organization.
                From individual goals to company-wide analytics &mdash; every metric, every insight,
                continuously computed and instantly accessible.
              </p>
              <p className="text-white/35 text-sm leading-relaxed">
                AI-powered calibration. 360-degree reviews. Skill gap analysis. Career pathing.
                All unified in one intelligent platform that evolves with your team.
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: FEATURE CARDS ───────────────────────────────────── */}
        <section className="py-20 sm:py-32 px-6 sm:px-10">
          <div className="max-w-6xl mx-auto">
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
                      background: 'rgba(139, 92, 246, 0.12)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      color: 'rgba(167, 139, 250, 0.9)',
                    }}
                  >
                    Platform Capabilities
                  </div>
                  <h2
                    className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-5xl"
                    style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
                  >
                    Everything You Need to{' '}
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #a78bfa, #666cff)',
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

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <GlassFeatureCard
                icon={FlagIcon}
                title="Goals & OKRs"
                description="Cascade objectives from leadership to individual contributors. Track progress in real-time with intelligent alignment scoring across every level."
                delay={0}
              />
              <GlassFeatureCard
                icon={ClipboardDocumentCheckIcon}
                title="360 Reviews"
                description="Multi-rater feedback calibrated by AI. Fair, transparent, and actionable performance evaluations that drive meaningful growth."
                delay={100}
              />
              <GlassFeatureCard
                icon={SparklesIcon}
                title="AI-Powered Analytics"
                description="Machine learning models that surface hidden patterns, predict attrition risks, and recommend personalized development paths."
                delay={200}
              />
              <GlassFeatureCard
                icon={UserGroupIcon}
                title="Team Intelligence"
                description="Optimize team composition, identify skill gaps, and build high-performing teams with data-driven insights and AI recommendations."
                delay={300}
              />
            </div>
          </div>
        </section>

        {/* ── SECTION 4: FOOTER CTA ──────────────────────────────────────── */}
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
                  className="font-display font-bold text-white text-2xl sm:text-3xl lg:text-4xl mb-6"
                  style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
                >
                  Ready to transform{' '}
                  <br className="hidden sm:block" />
                  performance management?
                </h2>
                <p className="text-white/40 text-base sm:text-lg mb-10">
                  Join organizations that have moved beyond spreadsheets and annual reviews.
                </p>
                <Link
                  to="/login"
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-500 hover:scale-105 hover:shadow-[0_8px_40px_rgba(139,92,246,0.4)]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(102,108,255,0.6))',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 4px 20px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
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
            <div className="h-px w-32 mx-auto mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)' }} />
            <p className="text-white/20 text-xs sm:text-sm tracking-wide">
              PMS Suite v2.4.0 &middot; Next-Gen Performance Intelligence &middot; &copy; 2026
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
