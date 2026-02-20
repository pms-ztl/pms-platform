import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface AuthLayoutProps {
  children: ReactNode;
}

// ── Butterfly hover hook — 3D tilt + symmetric flip around cursor ──────────
function useButterflyHover(intensity = 18) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      const rotY = nx * intensity;
      const rotX = -ny * intensity * 0.6;
      const scaleX = 1 + Math.abs(nx) * 0.04;
      const scaleY = 1 + Math.abs(ny) * 0.03;
      const glowX = 50 + nx * 35;
      const glowY = 50 + ny * 35;
      el.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${scaleX}, ${scaleY}, 1)`;
      el.style.setProperty('--glow-x', `${glowX}%`);
      el.style.setProperty('--glow-y', `${glowY}%`);
    });
  }, [intensity]);

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    el.style.setProperty('--glow-x', '50%');
    el.style.setProperty('--glow-y', '50%');
  }, []);

  return { ref, handleMouseMove, handleMouseLeave };
}

// ── #1: Typewriter effect for description text ─────────────────────────────
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
    }, 22);
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


// ── #2: Cursor glow + spotlight beam ────────────────────────────────────────
function CursorGlow({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const glowRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    const glow = glowRef.current;
    const spot = spotRef.current;
    if (!container || !glow) return;
    let raf = 0;
    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        glow.style.opacity = '1';
        glow.style.transform = `translate(${x - 300}px, ${y - 300}px)`;
        // Spotlight beam follows cursor on left panel
        if (spot && x < rect.width * 0.55) {
          spot.style.opacity = '0.08';
          spot.style.background = `radial-gradient(ellipse 200px 600px at ${x}px ${y}px, rgba(255,255,255,0.06) 0%, transparent 70%)`;
        } else if (spot) {
          spot.style.opacity = '0';
        }
      });
    };
    const handleLeave = () => {
      glow.style.opacity = '0';
      if (spot) spot.style.opacity = '0';
    };
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
        ref={glowRef}
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none opacity-0 transition-opacity duration-500 z-[1]"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(200,210,230,0.04) 35%, transparent 60%)', filter: 'blur(10px)' }}
      />
      {/* #3: Spotlight beam on left panel */}
      <div
        ref={spotRef}
        className="absolute inset-0 pointer-events-none z-[1] transition-opacity duration-700"
        style={{ opacity: 0 }}
      />
    </>
  );
}


// ── Orbiting ring ───────────────────────────────────────────────────────────
function OrbitRing({ size, duration, delay, dotCount, color }: {
  size: number; duration: number; delay: number; dotCount: number; color: string;
}) {
  return (
    <div
      className="absolute rounded-full border pointer-events-none"
      style={{
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        borderColor: `rgba(255,255,255,0.04)`,
        animation: `spin ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      {Array.from({ length: dotCount }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 10px 3px ${color}`,
            top: '50%',
            left: '50%',
            transform: `rotate(${(360 / dotCount) * i}deg) translateX(${size / 2}px) translate(-50%, -50%)`,
          }}
        />
      ))}
    </div>
  );
}



// ── Butterfly card wrapper — gentle 3D tilt for the login card ───────────────
function ButterflyCard({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const { ref, handleMouseMove, handleMouseLeave } = useButterflyHover(8);
  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transition: 'transform 0.25s ease-out, box-shadow 0.3s ease-out',
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Main layout ─────────────────────────────────────────────────────────────
export function AuthLayout({ children }: AuthLayoutProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const activeVideo = useRef<'A' | 'B'>('A');
  const lastMousePos = useRef({ x: 0, y: 0, time: Date.now() });
  const currentRate = useRef(0.6);
  const targetRate = useRef(0.6);
  const decayRaf = useRef(0);

  // Get whichever video element is currently "on top"
  const getActiveVideo = useCallback(() => {
    return activeVideo.current === 'A' ? videoARef.current : videoBRef.current;
  }, []);

  // Apply playback rate to BOTH videos so they stay in sync speed-wise
  const applyRate = useCallback((rate: number) => {
    const clamped = Math.max(0.4, Math.min(rate, 8));
    if (videoARef.current) videoARef.current.playbackRate = clamped;
    if (videoBRef.current) videoBRef.current.playbackRate = clamped;
  }, []);

  // Seamless loop: crossfade from active to standby video before end
  useEffect(() => {
    const vidA = videoARef.current;
    const vidB = videoBRef.current;
    if (!vidA || !vidB) return;

    // Both start at slow speed
    vidA.playbackRate = 0.6;
    vidB.playbackRate = 0.6;

    // Preload video B at the start, paused and ready at t=0
    vidB.currentTime = 0;
    vidB.pause();

    const CROSSFADE_OFFSET = 0.5; // Start crossfade 0.5s before end

    const handleTimeUpdate = () => {
      const active = getActiveVideo();
      if (!active || !active.duration || active.duration === Infinity) return;

      const timeLeft = active.duration - active.currentTime;

      if (timeLeft <= CROSSFADE_OFFSET && timeLeft > 0) {
        // Determine which is standby
        const standby = activeVideo.current === 'A' ? vidB : vidA;
        const activeEl = activeVideo.current === 'A' ? vidA : vidB;

        // Start standby from beginning if it's paused / near-end
        if (standby.paused || standby.currentTime > 0.1) {
          standby.currentTime = 0;
          standby.play().catch(() => {});
        }

        // Crossfade opacity: active fades out, standby fades in
        const progress = 1 - (timeLeft / CROSSFADE_OFFSET);
        activeEl.style.opacity = String(1 - progress);
        standby.style.opacity = String(progress);

        // When active finishes, fully switch
        if (timeLeft <= 0.05) {
          activeEl.style.opacity = '0';
          standby.style.opacity = '1';
          activeEl.pause();
          activeEl.currentTime = 0;
          activeVideo.current = activeVideo.current === 'A' ? 'B' : 'A';
        }
      }
    };

    vidA.addEventListener('timeupdate', handleTimeUpdate);
    vidB.addEventListener('timeupdate', handleTimeUpdate);

    // Also handle the 'ended' event as a safety net
    const handleEnded = () => {
      const standby = activeVideo.current === 'A' ? vidB : vidA;
      const activeEl = activeVideo.current === 'A' ? vidA : vidB;
      activeEl.style.opacity = '0';
      standby.style.opacity = '1';
      standby.currentTime = 0;
      standby.play().catch(() => {});
      activeEl.pause();
      activeEl.currentTime = 0;
      activeVideo.current = activeVideo.current === 'A' ? 'B' : 'A';
    };

    vidA.addEventListener('ended', handleEnded);
    vidB.addEventListener('ended', handleEnded);

    return () => {
      vidA.removeEventListener('timeupdate', handleTimeUpdate);
      vidB.removeEventListener('timeupdate', handleTimeUpdate);
      vidA.removeEventListener('ended', handleEnded);
      vidB.removeEventListener('ended', handleEnded);
    };
  }, [getActiveVideo]);

  // Smooth RAF-based decay + rate application (no setInterval)
  useEffect(() => {
    let running = true;
    const BASE_RATE = 0.6;
    const DECAY_LERP = 0.03; // Gentle decay back to base
    const SPEED_LERP = 0.3; // Snappy acceleration toward target

    const tick = () => {
      if (!running) return;

      // Lerp toward target, then decay target toward base
      currentRate.current += (targetRate.current - currentRate.current) * SPEED_LERP;
      targetRate.current += (BASE_RATE - targetRate.current) * DECAY_LERP;

      applyRate(currentRate.current);
      decayRaf.current = requestAnimationFrame(tick);
    };

    decayRaf.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(decayRaf.current);
    };
  }, [applyRate]);

  // Cursor-reactive video speed: faster cursor = faster video
  useEffect(() => {
    const container = screenRef.current;
    if (!container) return;

    const handleMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - lastMousePos.current.time;
      if (dt < 16) return; // throttle to ~60fps
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = dist / Math.max(dt, 1); // px per ms

      lastMousePos.current = { x: e.clientX, y: e.clientY, time: now };

      // Map cursor speed to playback rate: idle=0.6x, moderate=3x, fast=8x
      targetRate.current = Math.min(0.6 + speed * 12, 8);
    };

    container.addEventListener('mousemove', handleMove);
    return () => {
      container.removeEventListener('mousemove', handleMove);
    };
  }, []);

  return (
    <div ref={screenRef} className="h-screen relative overflow-hidden">
      {/* ── BG Video — dual-element seamless loop + cursor-reactive speed ── */}
      <video
        ref={videoARef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 1, transition: 'none' }}
        onLoadedData={() => { if (videoARef.current) videoARef.current.playbackRate = 0.6; }}
      >
        <source src="/bg-vid.mp4" type="video/mp4" />
      </video>
      <video
        ref={videoBRef}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0, transition: 'none' }}
        onLoadedData={() => { if (videoBRef.current) videoBRef.current.playbackRate = 0.6; }}
      >
        <source src="/bg-vid.mp4" type="video/mp4" />
      </video>

      {/* 35% darken overlay */}
      <div className="absolute inset-0 bg-black/[0.35] pointer-events-none" />

      {/* Subtle vignette for text readability */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)' }} />

      <CursorGlow containerRef={screenRef} />

      {/* ── MAIN CONTENT — 55/45 split, full height ─────────────────── */}
      <div className="relative z-10 h-full flex">

        {/* ── LEFT COLUMN — fills 55%, uses ALL vertical space ──────── */}
        <div className="hidden lg:flex lg:flex-col lg:w-[48%] xl:w-[50%] h-full px-10 xl:px-14 py-6 justify-between">

          {/* TOP: Logo — #9: slide in + glitch hover on PMS */}
          <div className="flex items-center gap-5 animate-slide-right-fade" style={{ animationDelay: '0.2s' }}>
            <div className="group relative w-20 h-20 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] flex items-center justify-center hover:bg-white/[0.18] hover:border-white/[0.3] hover:shadow-[0_0_40px_rgba(255,255,255,0.12)] transition-all duration-600 cursor-pointer">
              {/* Pulse ring on hover */}
              <div className="absolute inset-0 rounded-2xl border border-white/[0.15] opacity-0 group-hover:animate-pulse-ring" />
              <SparklesIcon className="w-10 h-10 text-white group-hover:scale-125 group-hover:rotate-[20deg] transition-all duration-500" />
            </div>
            <div className="flex items-baseline gap-3">
              {/* #10: PMS text with breathing glow + glitch on hover */}
              <span className="text-5xl font-display font-bold text-white tracking-wide animate-text-glow cursor-default hover:animate-glitch transition-all" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>PMS</span>
              <span className="text-3xl font-display font-light text-white/70 animate-text-reveal" style={{ animationDelay: '0.5s', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>Suite</span>
            </div>
          </div>

          {/* MIDDLE: Headline + Feature Cards */}
          <div className="flex-1 flex flex-col justify-center">
            {/* #11: HEADLINE — MASSIVE + staggered word reveal with blur */}
            <div className="animate-slide-up-fade" style={{ animationDelay: '0.4s' }}>
              {/* Headline with glow */}
              <div className="relative">
                <h1
                  className="font-display font-black tracking-tighter text-white"
                  style={{
                    fontSize: 'clamp(4.5rem, 8vw, 8rem)',
                    lineHeight: 1.05,
                    paddingBottom: '0.1em',
                    textShadow: '0 2px 16px rgba(0,0,0,0.7), 0 4px 40px rgba(0,0,0,0.5)',
                  }}
                >
                  {/* #12: Each line has its own delayed text-reveal */}
                  <span className="inline-block animate-text-reveal" style={{ animationDelay: '0.5s' }}>Outgrow</span><br />
                  <span className="inline-block animate-text-reveal" style={{ animationDelay: '0.7s' }}>Yesterday.</span><br />
                  <span className="inline-block animate-text-reveal" style={{ animationDelay: '0.9s' }}>Own Tomorrow.</span>
                </h1>
              </div>
              {/* Clean white underline with shimmer */}
              <div className="relative mt-5">
                <div
                  className="h-1.5 w-64 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(200,210,230,0.4), rgba(255,255,255,0.6))',
                    backgroundSize: '200% 100%',
                    animation: 'gradientFlow 4s ease infinite',
                  }}
                />
                <div className="absolute inset-0 w-64 h-1.5 rounded-full overflow-hidden">
                  <div className="w-full h-full animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
                </div>
              </div>
            </div>

            {/* #14: Typewriter description text */}
            <p
              className="text-white/90 text-2xl xl:text-3xl leading-[1.5] mt-8 mb-7 max-w-[700px] min-h-[3.2em]"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4)' }}
            >
              <TypewriterText
                text="Where ambition meets intelligence. One unified suite powering growth at every level of your organization."
                delay={1200}
              />
            </p>


          </div>

          {/* BOTTOM: info line */}
          <div className="animate-slide-up-fade" style={{ animationDelay: '1.5s' }}>
            <div className="flex items-center gap-3 text-white/50 text-sm mt-1" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
              <span>Trusted by forward-thinking organizations worldwide</span>
              <span className="text-white/15">·</span>
              <span>v2.4.0</span>
              <span className="text-white/15">·</span>
              <span>© 2026 PMS Suite</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN — Glass card, fills 48% ───────────────────── */}
        <div className="flex-1 lg:w-[52%] xl:w-[50%] flex items-center justify-center px-4 sm:px-6 lg:px-6 xl:px-8 py-4 relative">
          {/* Orbiting rings behind card */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.18]">
            <OrbitRing size={700} duration={30} delay={0} dotCount={5} color="rgba(180,190,220,0.4)" />
            <OrbitRing size={560} duration={25} delay={2} dotCount={3} color="rgba(160,175,210,0.35)" />
            <OrbitRing size={420} duration={20} delay={4} dotCount={2} color="rgba(140,160,200,0.3)" />
          </div>

          {/* Card glow behind */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[850px] rounded-full pointer-events-none animate-nebula-pulse" style={{
            background: 'radial-gradient(ellipse, rgba(150,165,200,0.08) 0%, rgba(120,140,180,0.04) 40%, transparent 70%)',
            filter: 'blur(50px)',
          }} />

          <ButterflyCard className="w-full max-w-[640px] relative z-10 animate-scale-up-fade" style={{ animationDelay: '0.3s' }}>
            <div className="relative rounded-[28px] overflow-hidden">
              {/* Animated gradient border */}
              <div className="absolute -inset-[1px] rounded-[28px] pointer-events-none overflow-hidden">
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.04) 70%, rgba(255,255,255,0.15) 100%)',
                }} />
                {/* #18: Rotating border highlight — now dual color */}
                <div className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2 animate-spin-slow" style={{
                  animationDuration: '8s',
                  background: 'conic-gradient(from 0deg, transparent 0%, rgba(180,190,210,0.4) 8%, rgba(140,160,200,0.25) 16%, transparent 24%, transparent 50%, rgba(160,170,200,0.35) 58%, rgba(130,150,190,0.2) 66%, transparent 74%)',
                }} />
              </div>

              {/* Glass card */}
              <div
                className="relative rounded-[28px] border border-white/[0.1]"
                style={{
                  background: 'rgba(15, 20, 35, 0.55)',
                  backdropFilter: 'blur(60px) saturate(1.4) brightness(0.95)',
                  WebkitBackdropFilter: 'blur(60px) saturate(1.4) brightness(0.95)',
                  boxShadow: '0 40px 100px -20px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.15)',
                }}
              >
                {/* Top highlight */}
                <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.35] to-transparent" />
                {/* Depth gradient */}
                <div className="absolute inset-0 rounded-[28px] pointer-events-none" style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)',
                }} />

                <div className="relative px-12 py-12 sm:px-16 sm:py-14">
                  {/* Mobile logo */}
                  <div className="lg:hidden mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/[0.1] backdrop-blur-md rounded-xl flex items-center justify-center border border-white/[0.12]">
                        <SparklesIcon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-lg font-display font-bold text-white">PMS Suite</span>
                    </div>
                  </div>

                  {children}
                </div>
              </div>
            </div>
          </ButterflyCard>
        </div>
      </div>

      {/* #20: Bottom bar with text glow */}
      <div className="absolute bottom-2.5 inset-x-0 z-10 flex items-center justify-center pointer-events-none animate-slide-up-fade" style={{ animationDelay: '2s' }}>
        <span className="text-sm text-white/35 font-medium tracking-[0.2em] uppercase animate-text-glow" style={{ animationDuration: '5s' }}>PMS Suite · Next-Gen Performance Intelligence</span>
      </div>
    </div>
  );
}
