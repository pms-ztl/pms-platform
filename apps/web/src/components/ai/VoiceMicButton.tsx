/**
 * VoiceMicButton — Animated microphone toggle button for speech-to-text.
 *
 * States:
 *  - Idle:      Mic icon, subtle glow
 *  - Listening: Pulsing red rings + animated sound bars
 *  - Disabled:  Greyed-out (unsupported browser)
 *
 * Matches the AIChatWidget glassmorphism aesthetic.
 */

import { MicrophoneIcon } from '@heroicons/react/24/outline';

interface VoiceMicButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  isDark: boolean;
  /** Optional interim text to show in a tooltip */
  interimTranscript?: string;
  className?: string;
}

export function VoiceMicButton({
  isListening,
  isSupported,
  onClick,
  isDark,
  interimTranscript,
  className = '',
}: VoiceMicButtonProps) {
  if (!isSupported) {
    return (
      <button
        disabled
        className={`flex h-8 w-8 items-center justify-center rounded-xl opacity-30 cursor-not-allowed ${className}`}
        title="Voice input not supported in this browser"
      >
        <MicrophoneIcon className="h-4 w-4 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="relative">
      {/* Pulsing rings when listening */}
      {isListening && (
        <>
          <span
            className="absolute inset-0 rounded-xl animate-ping"
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              animationDuration: '1.5s',
            }}
          />
          <span
            className="absolute -inset-1 rounded-xl animate-pulse"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              animationDuration: '2s',
            }}
          />
        </>
      )}

      <button
        type="button"
        onClick={onClick}
        className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${className}`}
        style={{
          background: isListening
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.05)',
          boxShadow: isListening
            ? '0 0 16px rgba(239, 68, 68, 0.5), 0 0 32px rgba(239, 68, 68, 0.2)'
            : 'none',
          border: isListening
            ? '1px solid rgba(239, 68, 68, 0.3)'
            : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? (
          /* ── Animated sound bars ── */
          <div className="flex items-end gap-[2px] h-4">
            <span
              className="w-[2.5px] rounded-full bg-white animate-voice-bar"
              style={{ animationDelay: '0ms', height: '40%' }}
            />
            <span
              className="w-[2.5px] rounded-full bg-white animate-voice-bar"
              style={{ animationDelay: '150ms', height: '70%' }}
            />
            <span
              className="w-[2.5px] rounded-full bg-white animate-voice-bar"
              style={{ animationDelay: '300ms', height: '50%' }}
            />
            <span
              className="w-[2.5px] rounded-full bg-white animate-voice-bar"
              style={{ animationDelay: '100ms', height: '85%' }}
            />
            <span
              className="w-[2.5px] rounded-full bg-white animate-voice-bar"
              style={{ animationDelay: '250ms', height: '60%' }}
            />
          </div>
        ) : (
          <MicrophoneIcon
            className={`h-4 w-4 transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-indigo-300'
                : 'text-gray-500 hover:text-indigo-500'
            }`}
          />
        )}
      </button>

      {/* Interim transcript tooltip */}
      {isListening && interimTranscript && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 max-w-[200px] rounded-lg px-3 py-1.5 text-xs leading-tight whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none"
          style={{
            background: isDark
              ? 'rgba(15,15,35,0.95)'
              : 'rgba(255,255,255,0.97)',
            border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            color: isDark ? '#fca5a5' : '#dc2626',
          }}
        >
          {interimTranscript}
        </div>
      )}

      {/* Inline keyframe style for voice bars */}
      <style>{`
        @keyframes voice-bar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .animate-voice-bar {
          animation: voice-bar 0.6s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>
    </div>
  );
}
