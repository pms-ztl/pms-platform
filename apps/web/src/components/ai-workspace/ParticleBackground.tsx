/**
 * ParticleBackground - Subtle animated floating particles for the AI Workspace.
 *
 * Renders 18 small circles that drift slowly across the viewport using pure
 * CSS keyframe animations. Colors range across purple, blue, and cyan with
 * very low opacity (0.05-0.15) so they never distract from the main content.
 *
 * The component is absolutely positioned and pointer-events: none so it sits
 * behind all interactive elements.
 */

const PARTICLES = [
  { size: 3, x: '5%',  y: '10%', color: '#a78bfa', opacity: 0.10, duration: 18, delay: 0   },
  { size: 4, x: '15%', y: '25%', color: '#818cf8', opacity: 0.08, duration: 22, delay: 1.2 },
  { size: 2, x: '25%', y: '60%', color: '#67e8f9', opacity: 0.12, duration: 20, delay: 0.5 },
  { size: 5, x: '35%', y: '15%', color: '#c084fc', opacity: 0.06, duration: 25, delay: 2   },
  { size: 3, x: '45%', y: '75%', color: '#7dd3fc', opacity: 0.10, duration: 19, delay: 0.8 },
  { size: 2, x: '55%', y: '40%', color: '#a78bfa', opacity: 0.15, duration: 23, delay: 1.5 },
  { size: 4, x: '65%', y: '85%', color: '#818cf8', opacity: 0.07, duration: 21, delay: 3   },
  { size: 3, x: '75%', y: '30%', color: '#67e8f9', opacity: 0.11, duration: 17, delay: 0.3 },
  { size: 2, x: '85%', y: '55%', color: '#c084fc', opacity: 0.09, duration: 24, delay: 2.5 },
  { size: 5, x: '10%', y: '80%', color: '#7dd3fc', opacity: 0.05, duration: 26, delay: 1   },
  { size: 3, x: '20%', y: '45%', color: '#a78bfa', opacity: 0.13, duration: 20, delay: 3.5 },
  { size: 2, x: '40%', y: '5%',  color: '#818cf8', opacity: 0.08, duration: 18, delay: 0.7 },
  { size: 4, x: '60%', y: '65%', color: '#67e8f9', opacity: 0.10, duration: 22, delay: 2.2 },
  { size: 3, x: '70%', y: '10%', color: '#c084fc', opacity: 0.06, duration: 19, delay: 1.8 },
  { size: 2, x: '80%', y: '90%', color: '#7dd3fc', opacity: 0.14, duration: 21, delay: 0.4 },
  { size: 4, x: '90%', y: '35%', color: '#a78bfa', opacity: 0.07, duration: 25, delay: 3.2 },
  { size: 3, x: '50%', y: '50%', color: '#818cf8', opacity: 0.09, duration: 23, delay: 1.4 },
  { size: 2, x: '30%', y: '92%', color: '#67e8f9', opacity: 0.11, duration: 17, delay: 2.8 },
];

const keyframesStyle = `
@keyframes ai-particle-float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(12px, -18px) scale(1.1);
  }
  50% {
    transform: translate(-8px, -30px) scale(0.95);
  }
  75% {
    transform: translate(15px, -12px) scale(1.05);
  }
}
`;

export function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>{keyframesStyle}</style>
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: p.color,
            opacity: p.opacity,
            animation: `ai-particle-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}
