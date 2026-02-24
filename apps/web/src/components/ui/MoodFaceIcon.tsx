/**
 * MoodFaceIcon — Premium animated SVG mood face.
 * Score 1–5: Struggling → Stressed → Okay → Good → Great
 *
 * Each face features:
 *  - Unique gradient colour palette
 *  - Distinct expression (eyes, brows, mouth, accessories)
 *  - Signature CSS keyframe animation
 *
 * Keyframe names are globally unique (mf1-…, mf2-…, …) so all 5 faces
 * can render simultaneously in the same DOM without name collisions.
 * Gradient IDs are unique per score (mfg1–mfg5) for the same reason.
 */

interface MoodFaceIconProps {
  score: 1 | 2 | 3 | 4 | 5;
  /** Tailwind size classes — default "w-10 h-10" */
  className?: string;
  /** Highlight with a glow when selected */
  selected?: boolean;
}

// ── Score 1: Struggling — deep crimson, sway, falling tears ──────────────

function Mood1({ className, selected }: { className: string; selected: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true"
      style={{ filter: selected ? 'drop-shadow(0 0 8px rgba(220,38,38,.78))' : 'none', transition: 'filter .25s' }}>
      <defs>
        <radialGradient id="mfg1" cx="38%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
        <style>{`
          @keyframes mf1-sway{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(3.5deg)}}
          @keyframes mf1-tear{0%{transform:translateY(0);opacity:.9}90%{transform:translateY(18px);opacity:.3}100%{transform:translateY(20px);opacity:0}}
          @keyframes mf1-tear2{0%,45%{transform:translateY(0);opacity:0}50%{opacity:.85}100%{transform:translateY(16px);opacity:0}}
        `}</style>
      </defs>

      {/* Whole-face sway */}
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'mf1-sway 3s ease-in-out infinite' }}>
        {/* Face circle */}
        <circle cx="50" cy="50" r="46" fill="url(#mfg1)" stroke="#b91c1c" strokeWidth="2.5" />
        {/* Sheen glint */}
        <ellipse cx="34" cy="29" rx="11" ry="6" fill="white" opacity=".22" transform="rotate(-28 34 29)" />

        {/* Deeply furrowed brows */}
        <path d="M 24 29 Q 32 34 36 31" fill="none" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />
        <path d="M 64 31 Q 68 34 76 29" fill="none" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />

        {/* Sad eyes */}
        <ellipse cx="33" cy="43" rx="7.5" ry="6.5" fill="#1a0505" />
        <ellipse cx="67" cy="43" rx="7.5" ry="6.5" fill="#1a0505" />
        {/* Heavy drooping upper lids */}
        <path d="M 25 40 Q 33 37 41 40 L 41 43 Q 33 44 25 43 Z" fill="#b91c1c" opacity=".82" />
        <path d="M 59 40 Q 67 37 75 40 L 75 43 Q 67 44 59 43 Z" fill="#b91c1c" opacity=".82" />
        {/* Eye glints */}
        <circle cx="35.5" cy="42" r="1.5" fill="white" opacity=".65" />
        <circle cx="69.5" cy="42" r="1.5" fill="white" opacity=".65" />

        {/* Deep frown */}
        <path d="M 29 67 Q 50 55 71 67" fill="none" stroke="#7f1d1d" strokeWidth="4" strokeLinecap="round" />

        {/* Tear 1 — continuous fall */}
        <ellipse cx="31" cy="51" rx="3" ry="5.5" fill="#93c5fd"
          style={{ transformBox: 'fill-box', transformOrigin: '50% 0%', animation: 'mf1-tear 1.9s ease-in infinite' }} />
        {/* Tear 2 — offset by half cycle */}
        <ellipse cx="29" cy="50" rx="2" ry="4" fill="#bfdbfe"
          style={{ transformBox: 'fill-box', transformOrigin: '50% 0%', animation: 'mf1-tear2 1.9s ease-in infinite' }} />
      </g>
    </svg>
  );
}

// ── Score 2: Stressed — warm amber, jitter, sweat drop ───────────────────

function Mood2({ className, selected }: { className: string; selected: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true"
      style={{ filter: selected ? 'drop-shadow(0 0 8px rgba(245,158,11,.78))' : 'none', transition: 'filter .25s' }}>
      <defs>
        <radialGradient id="mfg2" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <style>{`
          @keyframes mf2-jitter{
            0%,100%{transform:translate(0,0) rotate(0deg)}
            20%{transform:translate(-1.5px,0) rotate(-1deg)}
            40%{transform:translate(1.5px,0) rotate(1deg)}
            60%{transform:translate(-1px,.5px) rotate(-.5deg)}
            80%{transform:translate(1px,-.5px) rotate(.5deg)}
          }
          @keyframes mf2-sweat{0%{transform:translateY(0) scaleY(1);opacity:.9}70%{transform:translateY(11px) scaleY(1.3);opacity:.55}100%{transform:translateY(15px) scaleY(1.5);opacity:0}}
        `}</style>
      </defs>

      {/* Whole-face jitter */}
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'mf2-jitter .55s ease-in-out infinite' }}>
        <circle cx="50" cy="50" r="46" fill="url(#mfg2)" stroke="#92400e" strokeWidth="2.5" />
        <ellipse cx="34" cy="29" rx="11" ry="6" fill="white" opacity=".25" transform="rotate(-28 34 29)" />

        {/* Heavy V brows */}
        <path d="M 23 28 Q 30 35 36 32" fill="none" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 64 32 Q 70 35 77 28" fill="none" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />

        {/* Worried round eyes */}
        <circle cx="33" cy="44" r="7" fill="#1a0a00" />
        <circle cx="67" cy="44" r="7" fill="#1a0a00" />
        <circle cx="35" cy="42" r="2" fill="white" opacity=".72" />
        <circle cx="69" cy="42" r="2" fill="white" opacity=".72" />

        {/* Wavy tense mouth */}
        <path d="M 32 62 Q 38 58 44 62 Q 50 66 56 62 Q 62 58 68 62"
          fill="none" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />

        {/* Sweat drop — animated fall */}
        <path d="M 75 26 Q 78 22 81 26 Q 82 30 78 31 Q 74 30 75 26 Z" fill="#bae6fd"
          style={{ transformBox: 'fill-box', transformOrigin: '50% 0%', animation: 'mf2-sweat 1.6s ease-in infinite .3s' }} />
      </g>
    </svg>
  );
}

// ── Score 3: Okay — golden yellow, slow breathing pulse ──────────────────

function Mood3({ className, selected }: { className: string; selected: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true"
      style={{ filter: selected ? 'drop-shadow(0 0 7px rgba(202,138,4,.72))' : 'none', transition: 'filter .25s' }}>
      <defs>
        <radialGradient id="mfg3" cx="38%" cy="28%" r="66%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#a16207" />
        </radialGradient>
        <style>{`@keyframes mf3-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}`}</style>
      </defs>

      {/* Slow breathing pulse */}
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'mf3-breathe 3.5s ease-in-out infinite' }}>
        <circle cx="50" cy="50" r="46" fill="url(#mfg3)" stroke="#ca8a04" strokeWidth="2.5" />
        <ellipse cx="34" cy="29" rx="11" ry="6" fill="white" opacity=".28" transform="rotate(-28 34 29)" />

        {/* Flat tired brows */}
        <path d="M 25 33 Q 33 35 38 34" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 62 34 Q 67 35 75 33" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />

        {/* Half-lidded drowsy eyes */}
        <ellipse cx="33" cy="44" rx="8" ry="7" fill="#1a1000" />
        <ellipse cx="67" cy="44" rx="8" ry="7" fill="#1a1000" />
        {/* Drowsy upper lids cover top half */}
        <path d="M 25 41 Q 33 38 41 41 L 41 44 Q 33 45 25 44 Z" fill="#a16207" opacity=".8" />
        <path d="M 59 41 Q 67 38 75 41 L 75 44 Q 67 45 59 44 Z" fill="#a16207" opacity=".8" />
        <circle cx="35" cy="43" r="1.5" fill="white" opacity=".6" />
        <circle cx="69" cy="43" r="1.5" fill="white" opacity=".6" />

        {/* Lopsided neutral mouth (slight asymmetry = "meh") */}
        <path d="M 33 60 Q 44 62 56 60 Q 61 59 66 60"
          fill="none" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ── Score 4: Good — fresh green, float bob, blush cheeks ─────────────────

function Mood4({ className, selected }: { className: string; selected: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true"
      style={{ filter: selected ? 'drop-shadow(0 0 8px rgba(34,197,94,.78))' : 'none', transition: 'filter .25s' }}>
      <defs>
        <radialGradient id="mfg4" cx="38%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        <style>{`@keyframes mf4-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
      </defs>

      {/* Gentle float bob */}
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'mf4-bob 2.2s ease-in-out infinite' }}>
        <circle cx="50" cy="50" r="46" fill="url(#mfg4)" stroke="#16a34a" strokeWidth="2.5" />
        <ellipse cx="34" cy="29" rx="11" ry="6" fill="white" opacity=".3" transform="rotate(-28 34 29)" />

        {/* Happy raised brows */}
        <path d="M 24 30 Q 32 27 38 29" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 62 29 Q 68 27 76 30" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" />

        {/* ^ arc happy eyes */}
        <path d="M 25 44 Q 33 36 41 44" fill="none" stroke="#166534" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 59 44 Q 67 36 75 44" fill="none" stroke="#166534" strokeWidth="3.5" strokeLinecap="round" />

        {/* Soft pink blush cheeks */}
        <ellipse cx="20" cy="58" rx="9" ry="5.5" fill="#fda4af" opacity=".45" />
        <ellipse cx="80" cy="58" rx="9" ry="5.5" fill="#fda4af" opacity=".45" />

        {/* Wide smile */}
        <path d="M 28 59 Q 50 74 72 59" fill="none" stroke="#166534" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ── Score 5: Great — cyan/teal, excited bounce, teeth smile, stars ────────

function Mood5({ className, selected }: { className: string; selected: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true"
      style={{ filter: selected ? 'drop-shadow(0 0 10px rgba(6,182,212,.92))' : 'none', transition: 'filter .25s' }}>
      <defs>
        <radialGradient id="mfg5" cx="38%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#0e7490" />
        </radialGradient>
        <style>{`
          @keyframes mf5-bounce{0%,100%{transform:scale(1)}40%{transform:scale(1.07)}60%{transform:scale(.96)}}
          @keyframes mf5-s1{0%,100%{transform:rotate(0deg) scale(1);opacity:.8}50%{transform:rotate(180deg) scale(1.35);opacity:1}}
          @keyframes mf5-s2{0%,100%{transform:rotate(0deg) scale(.85);opacity:.7}50%{transform:rotate(-180deg) scale(1.2);opacity:1}}
          @keyframes mf5-s3{0%,100%{transform:translateY(0) scale(1);opacity:.75}50%{transform:translateY(-3px) scale(1.25);opacity:1}}
        `}</style>
      </defs>

      {/* ── 3 sparkle stars rendered OUTSIDE the bouncing group so they float freely ── */}

      {/* Top-right gold sparkle */}
      <g transform="translate(78,14)">
        <path d="M0,-4.5 L1.1,-1.1 L4.5,0 L1.1,1.1 L0,4.5 L-1.1,1.1 L-4.5,0 L-1.1,-1.1 Z"
          fill="#fbbf24"
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'mf5-s1 2.2s linear infinite' }} />
      </g>

      {/* Top-left smaller sparkle */}
      <g transform="translate(14,19)">
        <path d="M0,-3.5 L.85,-.85 L3.5,0 L.85,.85 L0,3.5 L-.85,.85 L-3.5,0 L-.85,-.85 Z"
          fill="#fcd34d"
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'mf5-s2 1.8s linear infinite .35s' }} />
      </g>

      {/* Right side tiny sparkle */}
      <g transform="translate(89,51)">
        <path d="M0,-3 L.7,-.7 L3,0 L.7,.7 L0,3 L-.7,.7 L-3,0 L-.7,-.7 Z"
          fill="#fbbf24"
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'mf5-s3 1.5s ease-in-out infinite .2s' }} />
      </g>

      {/* ── Bouncing face group ── */}
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'mf5-bounce 1.4s cubic-bezier(.36,.07,.19,.97) infinite' }}>
        <circle cx="50" cy="50" r="46" fill="url(#mfg5)" stroke="#0e7490" strokeWidth="2.5" />
        <ellipse cx="34" cy="29" rx="11" ry="6" fill="white" opacity=".3" transform="rotate(-28 34 29)" />

        {/* High very happy brows */}
        <path d="M 23 27 Q 31 23 38 26" fill="none" stroke="#155e75" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 62 26 Q 69 23 77 27" fill="none" stroke="#155e75" strokeWidth="2.5" strokeLinecap="round" />

        {/* Closed crescent eyes — deep joy squint (control point far above arc) */}
        <path d="M 25 44 Q 33 33 41 44" fill="none" stroke="#155e75" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 59 44 Q 67 33 75 44" fill="none" stroke="#155e75" strokeWidth="3.5" strokeLinecap="round" />

        {/* Deep rosy blush */}
        <ellipse cx="18" cy="59" rx="10" ry="6" fill="#fb7185" opacity=".52" />
        <ellipse cx="82" cy="59" rx="10" ry="6" fill="#fb7185" opacity=".52" />

        {/* Huge open smile outline */}
        <path d="M 24 56 Q 50 78 76 56" fill="none" stroke="#155e75" strokeWidth="4" strokeLinecap="round" />
        {/* White teeth fill inside smile */}
        <path d="M 27 57 Q 50 76 73 57 Q 73 65 50 67 Q 27 65 27 57 Z" fill="white" opacity=".85" />
      </g>
    </svg>
  );
}

// ── Main exported component ───────────────────────────────────────────────

export function MoodFaceIcon({ score, className = 'w-10 h-10', selected = false }: MoodFaceIconProps) {
  const p = { className, selected };
  switch (score) {
    case 1: return <Mood1 {...p} />;
    case 2: return <Mood2 {...p} />;
    case 3: return <Mood3 {...p} />;
    case 4: return <Mood4 {...p} />;
    case 5: return <Mood5 {...p} />;
    default: return <Mood3 {...p} />;
  }
}
