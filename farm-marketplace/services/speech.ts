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

/**
 * Speaks the given text using Expo Speech engine or Web SpeechSynthesis fallback.
 */
export const speakText = (text: string, langCode: LanguageCode = 'en'): void => {
  try {
    const locale = LOCALE_MAP[langCode] || 'en-IN';

    if (SpeechModule && typeof SpeechModule.speak === 'function') {
      try {
        SpeechModule.stop();
      } catch {
        // ignore
      }
      SpeechModule.speak(text, {
        language: locale,
        pitch: 1.0,
        rate: 0.95,
      });
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      window.speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.error('TTS Speech Error:', error);
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
  }
};
