/**
 * useVoiceInput — React hook wrapping the Web Speech API (SpeechRecognition).
 *
 * 100 % FREE, browser-native speech-to-text.
 * Works in Chrome, Edge, Safari (desktop + mobile).
 *
 * Usage:
 *   const { transcript, interimTranscript, isListening, isSupported, toggleListening } = useVoiceInput();
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Vendor-prefixed SpeechRecognition ────────────────────────────
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : any;

function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as any).SpeechRecognition ??
    (window as any).webkitSpeechRecognition ??
    null
  );
}

export interface UseVoiceInputOptions {
  /** BCP-47 language tag (default: 'en-US') */
  lang?: string;
  /** Keep listening after each utterance (default: true) */
  continuous?: boolean;
  /** Provide interim (partial) results while user is speaking (default: true) */
  interimResults?: boolean;
  /** Auto-restart on unexpected end (network hiccup, etc.) — up to N retries (default: 3) */
  maxAutoRestarts?: number;
  /** Callback fired when a final transcript segment is received */
  onResult?: (transcript: string) => void;
  /** Callback fired on error */
  onError?: (error: string) => void;
}

export interface UseVoiceInputReturn {
  /** Whether the browser supports SpeechRecognition */
  isSupported: boolean;
  /** Whether recognition is currently active */
  isListening: boolean;
  /** Accumulated final transcript for the current session */
  transcript: string;
  /** Live partial text while user is still speaking */
  interimTranscript: string;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Toggle listening on/off */
  toggleListening: () => void;
  /** Clear the transcript buffer */
  clearTranscript: () => void;
}

export function useVoiceInput(opts: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    maxAutoRestarts = 3,
    onResult,
    onError,
  } = opts;

  const SpeechRecognition = getSpeechRecognition();
  const isSupported = SpeechRecognition !== null;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const autoRestartCountRef = useRef(0);
  const intentionalStopRef = useRef(false);

  // ── Initialise recognition instance ──────────────────────────
  const getRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;
    if (recognitionRef.current) return recognitionRef.current;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        setTranscript((prev) => {
          const updated = prev ? `${prev} ${finalText.trim()}` : finalText.trim();
          onResult?.(updated);
          return updated;
        });
        setInterimTranscript('');
      } else {
        setInterimTranscript(interimText);
      }
    };

    recognition.onerror = (event: any) => {
      const errorType: string = event.error;
      // "aborted" is normal when we call .stop()
      if (errorType === 'aborted') return;

      // "not-allowed" / "service-not-allowed" — mic permission denied
      if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
        onError?.('Microphone access denied. Please allow microphone permission.');
        setIsListening(false);
        return;
      }

      // "no-speech" — user was silent, not really an error
      if (errorType === 'no-speech') return;

      // Anything else — network, audio-capture, etc.
      onError?.(`Speech recognition error: ${errorType}`);
    };

    recognition.onend = () => {
      // If we didn't explicitly stop, try to auto-restart (network hiccup recovery)
      if (!intentionalStopRef.current && autoRestartCountRef.current < maxAutoRestarts) {
        autoRestartCountRef.current++;
        try {
          recognition.start();
          return;
        } catch {
          // ignore — e.g. already running
        }
      }
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [SpeechRecognition, lang, continuous, interimResults, maxAutoRestarts, onResult, onError]);

  // ── Start ──────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) return;

    intentionalStopRef.current = false;
    autoRestartCountRef.current = 0;
    setTranscript('');
    setInterimTranscript('');

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // Already running — ignore
    }
  }, [getRecognition]);

  // ── Stop ───────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // ── Toggle ─────────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ── Clear ──────────────────────────────────────────────────────
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}
