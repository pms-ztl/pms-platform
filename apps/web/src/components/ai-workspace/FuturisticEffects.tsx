/**
 * FuturisticEffects — 6 React animation components for the AI Workspace.
 *
 * These complement the pure-CSS effects in index.css with interactive,
 * state-driven, or dynamically-rendered animations.
 *
 * Components:
 *   1. ParticleReconstitution — particles scatter → converge into shape
 *   2. NodeConnection — SVG animated dashed lines between elements
 *   3. TimeLapseGrowth — spring-physics growth wrapper for charts/stats
 *   4. ProactivePopout — spring-entry card from edge (left/right/bottom)
 *   5. PredictionGhost — blurred "ghost" preview of predicted content
 *   6. HandshakeConfirmation — checkmark draw + particle burst on success
 *
 * All animations respect the .no-animations kill-switch via CSS inheritance.
 */

import {
  type ReactNode,
  type RefObject,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 1. Particle Reconstitution
// ═══════════════════════════════════════════════════════════════════════════

interface ParticleReconstitutionProps {
  /** When true, particles converge; when false, they scatter out */
  active: boolean;
  /** Number of particles (default 12) */
  particleCount?: number;
  /** Container size in px (default 100) */
  size?: number;
  /** CSS class for the container */
  className?: string;
  /** Color of particles — CSS color value */
  color?: string;
}

export function ParticleReconstitution({
  active,
  particleCount = 12,
  size = 100,
  className = '',
  color,
}: ParticleReconstitutionProps) {
  const particles = useMemo(() => {
    const items: Array<{
      id: number;
      targetX: number;
      targetY: number;
      scatterX: number;
      scatterY: number;
      delay: number;
      size: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      // Target positions form a circle
      const angle = (Math.PI * 2 * i) / particleCount;
      const radius = size * 0.3;
      items.push({
        id: i,
        targetX: Math.cos(angle) * radius,
        targetY: Math.sin(angle) * radius,
        scatterX: (Math.random() - 0.5) * size * 2,
        scatterY: (Math.random() - 0.5) * size * 2,
        delay: i * 0.04,
        size: 2 + Math.random() * 3,
      });
    }
    return items;
  }, [particleCount, size]);

  return (
    <div
      className={`relative pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: color || 'rgb(var(--c-primary-500))',
            left: '50%',
            top: '50%',
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            transform: active
              ? `translate(${p.targetX}px, ${p.targetY}px) scale(1)`
              : `translate(${p.scatterX}px, ${p.scatterY}px) scale(0.5)`,
            opacity: active ? 0.8 : 0,
            transition: `all 0.8s cubic-bezier(0.23, 1, 0.32, 1) ${p.delay}s`,
            willChange: 'transform, opacity',
            boxShadow: active
              ? `0 0 6px ${color || 'rgb(var(--c-primary-500) / 0.4)'}`
              : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Node Connection
// ═══════════════════════════════════════════════════════════════════════════

interface NodeConnectionProps {
  /** Ref to the source element */
  fromRef: RefObject<HTMLElement | null>;
  /** Ref to the target element */
  toRef: RefObject<HTMLElement | null>;
  /** Whether connection is active/visible */
  active: boolean;
  /** Container ref for computing relative positions */
  containerRef?: RefObject<HTMLElement | null>;
  /** Stroke color */
  color?: string;
  /** Dash animation enabled (default true) */
  animated?: boolean;
}

export function NodeConnection({
  fromRef,
  toRef,
  active,
  containerRef,
  color = 'rgba(139, 92, 246, 0.3)',
  animated = true,
}: NodeConnectionProps) {
  const [coords, setCoords] = useState<{
    x1: number; y1: number; x2: number; y2: number;
  } | null>(null);

  useEffect(() => {
    if (!active || !fromRef.current || !toRef.current) {
      setCoords(null);
      return;
    }

    const update = () => {
      const container = containerRef?.current || fromRef.current?.parentElement;
      if (!container || !fromRef.current || !toRef.current) return;

      const cRect = container.getBoundingClientRect();
      const fRect = fromRef.current.getBoundingClientRect();
      const tRect = toRef.current.getBoundingClientRect();

      setCoords({
        x1: fRect.left + fRect.width / 2 - cRect.left,
        y1: fRect.top + fRect.height / 2 - cRect.top,
        x2: tRect.left + tRect.width / 2 - cRect.left,
        y2: tRect.top + tRect.height / 2 - cRect.top,
      });
    };

    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [active, fromRef, toRef, containerRef]);

  if (!coords || !active) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <defs>
        <linearGradient id="node-conn-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
          <stop offset="100%" stopColor="rgba(6, 182, 212, 0.4)" />
        </linearGradient>
      </defs>
      <line
        x1={coords.x1}
        y1={coords.y1}
        x2={coords.x2}
        y2={coords.y2}
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="6 4"
        style={
          animated
            ? { animation: 'dash-flow 1s linear infinite' }
            : undefined
        }
        opacity={0.6}
      />
      {/* Glow line behind */}
      <line
        x1={coords.x1}
        y1={coords.y1}
        x2={coords.x2}
        y2={coords.y2}
        stroke={color}
        strokeWidth="4"
        opacity={0.1}
        filter="blur(3px)"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Time-Lapse Growth
// ═══════════════════════════════════════════════════════════════════════════

interface TimeLapseGrowthProps {
  children: ReactNode;
  /** Delay before animation starts in ms (default 0) */
  delay?: number;
  /** Animation duration in ms (default 800) */
  duration?: number;
  /** Additional className */
  className?: string;
}

export function TimeLapseGrowth({
  children,
  delay = 0,
  duration = 800,
  className = '',
}: TimeLapseGrowthProps) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        transform: started ? 'scaleY(1)' : 'scaleY(0)',
        transformOrigin: 'bottom',
        opacity: started ? 1 : 0,
        transition: `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${duration * 0.6}ms ease`,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Proactive Pop-out
// ═══════════════════════════════════════════════════════════════════════════

interface ProactivePopoutProps {
  children: ReactNode;
  /** Direction to slide from */
  from?: 'left' | 'right' | 'bottom';
  /** Delay in ms (default 0) */
  delay?: number;
  /** Additional className */
  className?: string;
}

export function ProactivePopout({
  children,
  from = 'right',
  delay = 0,
  className = '',
}: ProactivePopoutProps) {
  const animClass =
    from === 'left' ? 'popout-left' :
    from === 'bottom' ? 'popout-bottom' :
    'popout-right';

  return (
    <div
      className={`${animClass} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Prediction Ghost
// ═══════════════════════════════════════════════════════════════════════════

interface PredictionGhostProps {
  /** Whether the ghost is visible */
  visible: boolean;
  /** Content to show as a ghost */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

export function PredictionGhost({
  visible,
  children,
  className = '',
}: PredictionGhostProps) {
  if (!visible) return null;

  return (
    <div
      className={`prediction-ghost prediction-ghost-enter ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Handshake Confirmation
// ═══════════════════════════════════════════════════════════════════════════

interface HandshakeConfirmationProps {
  /** When true, play the animation */
  trigger: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Size in px (default 48) */
  size?: number;
  /** Additional className */
  className?: string;
}

const PARTICLE_DIRECTIONS = [
  { x: 20, y: -20 },
  { x: -18, y: -22 },
  { x: 24, y: 8 },
  { x: -20, y: 10 },
  { x: 10, y: -28 },
  { x: -12, y: -18 },
  { x: 28, y: -5 },
  { x: -24, y: -8 },
];

export function HandshakeConfirmation({
  trigger,
  onComplete,
  size = 48,
  className = '',
}: HandshakeConfirmationProps) {
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleTrigger = useCallback(() => {
    setActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActive(false);
      onComplete?.();
    }, 1200);
  }, [onComplete]);

  useEffect(() => {
    if (trigger) handleTrigger();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [trigger, handleTrigger]);

  if (!active) return null;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Expanding ring */}
      <div
        className="absolute inset-0 rounded-full border-2"
        style={{
          borderColor: 'rgb(var(--c-primary-500) / 0.5)',
          animation: 'confirm-ring 0.8s ease-out forwards',
        }}
      />

      {/* Checkmark SVG */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="relative z-10"
        style={{ width: size * 0.5, height: size * 0.5 }}
      >
        <path
          d="M5 13l4 4L19 7"
          stroke="rgb(34, 197, 94)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 48,
            strokeDashoffset: 48,
            animation: 'checkmark-draw 0.5s ease-out 0.2s forwards',
          }}
        />
      </svg>

      {/* Particles */}
      {PARTICLE_DIRECTIONS.map((dir, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 4,
            height: 4,
            left: '50%',
            top: '50%',
            marginLeft: -2,
            marginTop: -2,
            backgroundColor: i % 2 === 0
              ? 'rgb(var(--c-primary-400))'
              : 'rgba(34, 197, 94, 0.8)',
            // @ts-expect-error CSS custom properties
            '--px': `${dir.x}px`,
            '--py': `${dir.y}px`,
            animation: `confirm-particle 0.6s ease-out ${0.1 + i * 0.03}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
