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

  // Split on \n to render line breaks with spacing
  const parts = displayed.split('\n');
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="block mt-3" />}
          {part}
        </span>
      ))}
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



// ── Floating particles — tiny glowing dots drifting upward ──────────────────
function FloatingParticles() {
  const particles = [
    { size: 3, x: 8, delay: 0, dur: 18, opacity: 0.6 },
    { size: 2, x: 15, delay: 3, dur: 22, opacity: 0.4 },
    { size: 4, x: 25, delay: 7, dur: 16, opacity: 0.5 },
    { size: 2, x: 35, delay: 1, dur: 24, opacity: 0.3 },
    { size: 3, x: 45, delay: 5, dur: 20, opacity: 0.5 },
    { size: 2, x: 55, delay: 9, dur: 19, opacity: 0.4 },
    { size: 4, x: 65, delay: 2, dur: 17, opacity: 0.6 },
    { size: 2, x: 72, delay: 6, dur: 23, opacity: 0.3 },
    { size: 3, x: 80, delay: 4, dur: 21, opacity: 0.5 },
    { size: 2, x: 88, delay: 8, dur: 18, opacity: 0.4 },
    { size: 3, x: 93, delay: 11, dur: 20, opacity: 0.35 },
    { size: 2, x: 20, delay: 13, dur: 25, opacity: 0.3 },
    { size: 4, x: 50, delay: 10, dur: 15, opacity: 0.55 },
    { size: 2, x: 60, delay: 14, dur: 22, opacity: 0.35 },
    { size: 3, x: 78, delay: 12, dur: 19, opacity: 0.45 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            bottom: '-5%',
            background: `rgba(255,255,255,${p.opacity})`,
            boxShadow: `0 0 ${p.size * 3}px ${p.size}px rgba(255,255,255,${p.opacity * 0.5})`,
            animation: `auth-float-up ${p.dur}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Aurora wave bands — subtle flowing light ────────────────────────────────
function AuroraWaves() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2] opacity-[0.12]">
      {/* Wave 1 — wide sweep */}
      <div
        className="absolute w-[200%] h-[40%] -left-1/2 top-[15%]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 25%, rgba(200,220,255,0.1) 50%, rgba(255,255,255,0.15) 75%, transparent 100%)',
          filter: 'blur(60px)',
          animation: 'auth-aurora-drift 12s ease-in-out infinite alternate',
          transform: 'rotate(-5deg)',
        }}
      />
      {/* Wave 2 — thinner, faster */}
      <div
        className="absolute w-[200%] h-[25%] -left-1/2 top-[55%]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 30%, rgba(220,230,255,0.08) 50%, rgba(255,255,255,0.1) 70%, transparent 100%)',
          filter: 'blur(50px)',
          animation: 'auth-aurora-drift 9s ease-in-out infinite alternate-reverse',
          transform: 'rotate(3deg)',
        }}
      />
      {/* Wave 3 — bottom glow */}
      <div
        className="absolute w-[200%] h-[20%] -left-1/2 bottom-[5%]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 40%, rgba(210,220,240,0.06) 60%, transparent 100%)',
          filter: 'blur(40px)',
          animation: 'auth-aurora-drift 15s ease-in-out infinite alternate',
          transform: 'rotate(-2deg)',
        }}
      />
    </div>
  );
}

// ── Floating light orbs — soft luminous spheres ─────────────────────────────
function FloatingOrbs() {
  const orbs = [
    { size: 180, x: 10, y: 20, delay: 0, dur: 25, opacity: 0.04 },
    { size: 250, x: 75, y: 60, delay: 5, dur: 30, opacity: 0.035 },
    { size: 120, x: 40, y: 80, delay: 8, dur: 20, opacity: 0.05 },
    { size: 200, x: 85, y: 15, delay: 12, dur: 28, opacity: 0.03 },
    { size: 150, x: 55, y: 40, delay: 3, dur: 22, opacity: 0.04 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]">
      {orbs.map((o, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: o.size,
            height: o.size,
            left: `${o.x}%`,
            top: `${o.y}%`,
            background: `radial-gradient(circle, rgba(255,255,255,${o.opacity}) 0%, transparent 70%)`,
            filter: 'blur(30px)',
            animation: `auth-orb-float ${o.dur}s ease-in-out infinite alternate`,
            animationDelay: `${o.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Light streaks — diagonal sweeping lines ─────────────────────────────────
function LightStreaks() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2] opacity-[0.08]">
      {/* Streak 1 */}
      <div
        className="absolute"
        style={{
          width: '1px',
          height: '200%',
          top: '-50%',
          left: '30%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,0.8) 55%, transparent 100%)',
          transform: 'rotate(25deg)',
          animation: 'auth-streak-sweep 8s ease-in-out infinite',
          animationDelay: '0s',
        }}
      />
      {/* Streak 2 */}
      <div
        className="absolute"
        style={{
          width: '1px',
          height: '200%',
          top: '-50%',
          left: '65%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0.6) 55%, transparent 100%)',
          transform: 'rotate(25deg)',
          animation: 'auth-streak-sweep 10s ease-in-out infinite',
          animationDelay: '3s',
        }}
      />
      {/* Streak 3 — wider glow */}
      <div
        className="absolute"
        style={{
          width: '2px',
          height: '200%',
          top: '-50%',
          left: '48%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.5) 40%, rgba(255,255,255,0.5) 60%, transparent 100%)',
          filter: 'blur(2px)',
          transform: 'rotate(25deg)',
          animation: 'auth-streak-sweep 12s ease-in-out infinite',
          animationDelay: '6s',
        }}
      />
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
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const activeVideo = useRef<'A' | 'B'>('A');
  const lastMousePos = useRef({ x: 0, y: 0, time: Date.now() });
  const decayRaf = useRef(0);

  // Position-based state (for 3D parallax — where cursor IS)
  const cursorNX = useRef(0);    // normalized cursor X: -1 (left) to +1 (right)
  const cursorNY = useRef(0);    // normalized cursor Y: -1 (top) to +1 (bottom)
  // Velocity-based state (for video speed — how fast cursor moves)
  const velX = useRef(0);
  const targetVelX = useRef(0);

  // Get whichever video element is currently "on top"
  const getActiveVideo = useCallback(() => {
    return activeVideo.current === 'A' ? videoARef.current : videoBRef.current;
  }, []);

  // Seamless loop: crossfade from active to standby video before end
  useEffect(() => {
    const vidA = videoARef.current;
    const vidB = videoBRef.current;
    if (!vidA || !vidB) return;

    vidA.playbackRate = 0.5;
    vidB.playbackRate = 0.5;
    vidB.currentTime = 0;
    vidB.pause();

    const CROSSFADE_OFFSET = 0.5;

    const handleTimeUpdate = () => {
      const active = getActiveVideo();
      if (!active || !active.duration || active.duration === Infinity) return;
      const timeLeft = active.duration - active.currentTime;

      if (timeLeft <= CROSSFADE_OFFSET && timeLeft > 0) {
        const standby = activeVideo.current === 'A' ? vidB : vidA;
        const activeEl = activeVideo.current === 'A' ? vidA : vidB;
        if (standby.paused || standby.currentTime > 0.1) {
          standby.currentTime = 0;
          standby.play().catch(() => {});
        }
        const progress = 1 - (timeLeft / CROSSFADE_OFFSET);
        activeEl.style.opacity = String(1 - progress);
        standby.style.opacity = String(progress);
        if (timeLeft <= 0.05) {
          activeEl.style.opacity = '0';
          standby.style.opacity = '1';
          activeEl.pause();
          activeEl.currentTime = 0;
          activeVideo.current = activeVideo.current === 'A' ? 'B' : 'A';
        }
      }
    };

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

    vidA.addEventListener('timeupdate', handleTimeUpdate);
    vidB.addEventListener('timeupdate', handleTimeUpdate);
    vidA.addEventListener('ended', handleEnded);
    vidB.addEventListener('ended', handleEnded);
    return () => {
      vidA.removeEventListener('timeupdate', handleTimeUpdate);
      vidB.removeEventListener('timeupdate', handleTimeUpdate);
      vidA.removeEventListener('ended', handleEnded);
      vidB.removeEventListener('ended', handleEnded);
    };
  }, [getActiveVideo]);

  // ── MAIN RAF LOOP — position-based 3D parallax + velocity-based video speed ──
  useEffect(() => {
    let running = true;
    const BASE_RATE = 0.5;
    const VEL_LERP = 0.08;     // gentle velocity smoothing
    const VEL_DECAY = 0.02;    // slow velocity decay
    const POS_LERP = 0.035;    // silky position interpolation (lower = smoother)
    const TRANSFORM_LERP = 0.04; // double-smooth for transform output

    // Smoothed cursor position (approaches cursorNX/NY gently)
    const smoothCX = { current: 0 };
    const smoothCY = { current: 0 };
    // Smoothed transform output values (double-buffered for silk)
    const smoothRotY = { current: 0 };
    const smoothRotX = { current: 0 };
    const smoothScale = { current: 1 };
    const smoothTX = { current: 0 };
    const smoothTY = { current: 0 };
    const smoothRate = { current: BASE_RATE };

    const tick = () => {
      if (!running) return;

      // ── POSITION smoothing: gently approach cursor position ──
      smoothCX.current += (cursorNX.current - smoothCX.current) * POS_LERP;
      smoothCY.current += (cursorNY.current - smoothCY.current) * POS_LERP;

      // ── VELOCITY smoothing: for video speed ──
      velX.current += (targetVelX.current - velX.current) * VEL_LERP;
      targetVelX.current *= (1 - VEL_DECAY);

      const absVX = Math.abs(velX.current);

      // ── VIDEO SPEED: horizontal velocity drives playback ──
      let targetPlayRate = BASE_RATE;
      const vid = getActiveVideo();
      if (vid && vid.duration && vid.duration !== Infinity) {
        if (velX.current > 0.03) {
          // Moving RIGHT → play forward faster
          targetPlayRate = BASE_RATE + absVX * 4;
        } else if (velX.current < -0.03) {
          // Moving LEFT → gently rewind (seek backward)
          const rewindAmount = absVX * 0.06;
          vid.currentTime = Math.max(0, vid.currentTime - rewindAmount);
          targetPlayRate = 0.15;
        }
        targetPlayRate = Math.max(0.15, Math.min(targetPlayRate, 3));
      }

      // Smooth the playback rate
      smoothRate.current += (targetPlayRate - smoothRate.current) * 0.06;
      if (videoARef.current) videoARef.current.playbackRate = smoothRate.current;
      if (videoBRef.current) videoBRef.current.playbackRate = smoothRate.current;

      // ── 3D TRANSFORMS — driven by cursor POSITION (where it IS on screen) ──
      // Target values: cursor center = neutral, edges = max tilt/shift
      const cx = smoothCX.current;  // -1 to +1
      const cy = smoothCY.current;  // -1 to +1
      const dist = Math.sqrt(cx * cx + cy * cy); // distance from center (0 to ~1.4)

      const tRotY = cx * 4;            // left/right tilt ±4°
      const tRotX = -cy * 2.5;         // up/down tilt ±2.5°
      const tScale = 1 + dist * 0.025; // subtle zoom toward edges (up to 1.035)
      const tTX = cx * 20;             // horizontal shift ±20px
      const tTY = cy * 12;             // vertical shift ±12px

      // Double-smooth: lerp toward target transforms
      smoothRotY.current += (tRotY - smoothRotY.current) * TRANSFORM_LERP;
      smoothRotX.current += (tRotX - smoothRotX.current) * TRANSFORM_LERP;
      smoothScale.current += (tScale - smoothScale.current) * TRANSFORM_LERP;
      smoothTX.current += (tTX - smoothTX.current) * TRANSFORM_LERP;
      smoothTY.current += (tTY - smoothTY.current) * TRANSFORM_LERP;

      const wrap = videoWrapRef.current;
      if (wrap) {
        wrap.style.transform = `perspective(1200px) rotateY(${smoothRotY.current}deg) rotateX(${smoothRotX.current}deg) scale(${smoothScale.current}) translate(${smoothTX.current}px, ${smoothTY.current}px)`;
      }

      decayRaf.current = requestAnimationFrame(tick);
    };

    decayRaf.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(decayRaf.current); };
  }, [getActiveVideo]);

  // ── CURSOR TRACKING — position + horizontal velocity ──
  useEffect(() => {
    const container = screenRef.current;
    if (!container) return;

    const handleMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const now = Date.now();
      const dt = now - lastMousePos.current.time;

      // ── Position: normalized -1 to +1 based on where cursor IS on screen ──
      cursorNX.current = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      cursorNY.current = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      // ── Horizontal velocity: for video speed control (throttled to ~60fps) ──
      if (dt >= 16) {
        const dx = e.clientX - lastMousePos.current.x;
        const timeFactor = Math.max(dt, 1);
        const rawVX = (dx / timeFactor) * 0.8;
        targetVelX.current = Math.max(-1, Math.min(rawVX, 1));
        lastMousePos.current = { x: e.clientX, y: e.clientY, time: now };
      }
    };

    const handleLeave = () => {
      // Smoothly return to center (refs decay via RAF loop lerp)
      cursorNX.current = 0;
      cursorNY.current = 0;
      targetVelX.current = 0;
    };

    container.addEventListener('mousemove', handleMove);
    container.addEventListener('mouseleave', handleLeave);
    return () => {
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return (
    <div ref={screenRef} className="auth-page h-screen relative overflow-hidden">
      {/* ── BG Video — 3D reactive wrapper ── */}
      <div
        ref={videoWrapRef}
        className="video-wrap-bg absolute -inset-[5%] z-0"
        style={{ willChange: 'transform, filter', transition: 'filter 0.3s ease-out' }}
      >
        <video
          ref={videoARef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 1, transition: 'none' }}
          onLoadedData={() => { if (videoARef.current) videoARef.current.playbackRate = 0.5; }}
        >
          <source src="/black-hole-30s.mp4" type="video/mp4" />
        </video>
        <video
          ref={videoBRef}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0, transition: 'none' }}
          onLoadedData={() => { if (videoBRef.current) videoBRef.current.playbackRate = 0.5; }}
        >
          <source src="/black-hole-30s.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Heavy darken overlay for text readability over black hole video */}
      <div className="absolute inset-0 bg-black/[0.55] pointer-events-none" />

      {/* Strong vignette — darkens edges heavily, keeps center slightly brighter */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.7) 100%)' }} />

      {/* Additional top/bottom gradient for text areas */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%)' }} />

      <CursorGlow containerRef={screenRef} />

      {/* ── Premium floating animations ─────────────────────────────── */}
      <FloatingParticles />
      <AuroraWaves />
      <FloatingOrbs />
      <LightStreaks />

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
                  {/* #12: Clean Playfair headline — two lines */}
                  <span className="auth-word-line1">Outgrow </span>
                  <span className="auth-word-line1-dim">Yesterday.</span>
                  <br />
                  <span className="auth-word-line2">Own </span>
                  <span className="auth-word-tomorrow">Tomorrow!</span>
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

            {/* #14: Typewriter description text — Ranade font, Title Case */}
            <p
              className="text-white/90 text-2xl xl:text-3xl leading-[1.7] mt-8 mb-7 max-w-[700px] min-h-[4em]"
              style={{ fontFamily: "'Ranade', sans-serif", textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4)' }}
            >
              <TypewriterText
                text={"Where Ambition Meets Intelligence.\nOne Unified Suite Powering Growth at Every Level of Your Organization."}
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
            <OrbitRing size={700} duration={30} delay={0} dotCount={5} color="rgba(210,210,210,0.35)" />
            <OrbitRing size={560} duration={25} delay={2} dotCount={3} color="rgba(195,195,195,0.3)" />
            <OrbitRing size={420} duration={20} delay={4} dotCount={2} color="rgba(180,180,180,0.25)" />
          </div>

          {/* Card glow behind */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[850px] rounded-full pointer-events-none animate-nebula-pulse" style={{
            background: 'radial-gradient(ellipse, rgba(200,200,200,0.06) 0%, rgba(180,180,180,0.03) 40%, transparent 70%)',
            filter: 'blur(50px)',
          }} />

          <ButterflyCard className="w-full max-w-[640px] relative z-10 animate-scale-up-fade" style={{ animationDelay: '0.3s' }}>
            <div className="relative rounded-2xl sm:rounded-[28px] overflow-hidden">
              {/* Animated gradient border */}
              <div className="absolute -inset-[1px] rounded-2xl sm:rounded-[28px] pointer-events-none overflow-hidden">
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.04) 70%, rgba(255,255,255,0.15) 100%)',
                }} />
                {/* #18: Rotating border highlight — now dual color */}
                <div className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2 animate-spin-slow" style={{
                  animationDuration: '8s',
                  background: 'conic-gradient(from 0deg, transparent 0%, rgba(210,210,210,0.4) 8%, rgba(180,180,180,0.25) 16%, transparent 24%, transparent 50%, rgba(200,200,200,0.35) 58%, rgba(170,170,170,0.2) 66%, transparent 74%)',
                }} />
              </div>

              {/* Glass card */}
              <div
                className="relative rounded-2xl sm:rounded-[28px] border border-white/[0.1]"
                style={{
                  background: 'rgba(20, 20, 20, 0.55)',
                  backdropFilter: 'blur(60px) saturate(1.4) brightness(0.95)',
                  WebkitBackdropFilter: 'blur(60px) saturate(1.4) brightness(0.95)',
                  boxShadow: '0 40px 100px -20px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.15)',
                }}
              >
                {/* Top highlight */}
                <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.35] to-transparent" />
                {/* Depth gradient */}
                <div className="absolute inset-0 rounded-2xl sm:rounded-[28px] pointer-events-none" style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)',
                }} />

                <div className="relative px-5 py-6 sm:px-12 sm:py-12 lg:px-16 lg:py-14">
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
        <span className="text-xs sm:text-sm text-white/35 font-medium tracking-[0.1em] sm:tracking-[0.2em] animate-text-glow whitespace-nowrap" style={{ animationDuration: '5s' }}>PMS Suite · Next-Gen Performance Intelligence</span>
      </div>
    </div>
  );
}
