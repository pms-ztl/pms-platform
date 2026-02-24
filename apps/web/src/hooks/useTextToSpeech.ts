/**
 * useTextToSpeech — React hook wrapping the Web Speech Synthesis API.
 *
 * 100 % FREE, browser-native text-to-speech.
 * Works in all modern browsers (Chrome, Edge, Safari, Firefox).
 *
 * Usage:
 *   const { speak, stop, isSpeaking, isSupported } = useTextToSpeech();
 *   speak('Hello world!');
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseTextToSpeechOptions {
  /** BCP-47 language tag (default: 'en-US') */
  lang?: string;
  /** Speech rate 0.1 – 10 (default: 1) */
  rate?: number;
  /** Pitch 0 – 2 (default: 1) */
  pitch?: number;
  /** Volume 0 – 1 (default: 1) */
  volume?: number;
}

export interface UseTextToSpeechReturn {
  /** Whether the browser supports SpeechSynthesis */
  isSupported: boolean;
  /** Whether speech is currently playing */
  isSpeaking: boolean;
  /** Speak the given text */
  speak: (text: string) => void;
  /** Stop any current speech */
  stop: () => void;
  /** Available voices */
  voices: SpeechSynthesisVoice[];
}

export function useTextToSpeech(opts: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const { lang = 'en-US', rate = 1, pitch = 1, volume = 1 } = opts;

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Load voices (async on some browsers) ─────────────────────
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  // ── Pick the best voice for the requested language ───────────
  const pickVoice = useCallback(
    (targetLang: string): SpeechSynthesisVoice | undefined => {
      if (voices.length === 0) return undefined;

      // Prefer a high-quality voice with matching lang
      const match = voices.find(
        (v) => v.lang.startsWith(targetLang.split('-')[0]) && !v.localService,
      );
      if (match) return match;

      // Fallback to any local voice with matching lang
      const local = voices.find((v) => v.lang.startsWith(targetLang.split('-')[0]));
      if (local) return local;

      // Fallback to default
      return voices.find((v) => v.default) ?? voices[0];
    },
    [voices],
  );

  // ── Speak ──────────────────────────────────────────────────────
  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Stop any existing speech
      window.speechSynthesis.cancel();

      // Strip markdown formatting for cleaner speech
      const cleanText = text
        .replace(/```[\s\S]*?```/g, ' code block omitted ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/#{1,6}\s+/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[-*]\s+/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      const voice = pickVoice(lang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, lang, rate, pitch, volume, pickVoice],
  );

  // ── Stop ───────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  return { isSupported, isSpeaking, speak, stop, voices };
}
