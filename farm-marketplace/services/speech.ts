import { LanguageCode } from '../constants/i18n';

/**
 * Maps app language codes ('en', 'hi', 'kn', 'ml') to Indian accent TTS locale codes.
 */
const LOCALE_MAP: Record<LanguageCode, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
};

let SpeechModule: typeof import('expo-speech') | null = null;
try {
  SpeechModule = require('expo-speech');
} catch (error) {
  // Speech module fallback for environments where native binary is unlinked
}

type SpeechListener = (speaking: boolean, activeText?: string) => void;
const listeners: Set<SpeechListener> = new Set();
let currentSpeakingText: string | null = null;

const notify = (speaking: boolean, text?: string) => {
  currentSpeakingText = speaking ? (text || null) : null;
  listeners.forEach((cb) => cb(speaking, currentSpeakingText || undefined));
};

/**
 * Subscribe to reactive speech state changes.
 */
export const subscribeSpeechState = (listener: SpeechListener) => {
  listeners.add(listener);
  listener(!!currentSpeakingText, currentSpeakingText || undefined);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Speaks the given text using Expo Speech engine or Web SpeechSynthesis fallback.
 */
export const speakText = (text: string, langCode: LanguageCode = 'en'): void => {
  try {
    const locale = LOCALE_MAP[langCode] || 'en-IN';
    stopSpeech();
    notify(true, text);

    if (SpeechModule && typeof SpeechModule.speak === 'function') {
      SpeechModule.speak(text, {
        language: locale,
        pitch: 1.0,
        rate: 0.95,
        onDone: () => notify(false),
        onStopped: () => notify(false),
        onError: () => notify(false),
      });
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      utterance.onend = () => notify(false);
      utterance.onerror = () => notify(false);
      window.speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.error('TTS Speech Error:', error);
    notify(false);
  }
};

/**
 * Stops any active speech playback.
 */
export const stopSpeech = (): void => {
  try {
    if (SpeechModule && typeof SpeechModule.stop === 'function') {
      SpeechModule.stop();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch (error) {
    // ignore
  } finally {
    notify(false);
  }
};
