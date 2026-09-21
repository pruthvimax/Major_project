import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { stopSpeech } from '../speech';

/**
 * Voice dictation for the assistant — same Web Speech API approach the
 * original ChatbotWidget used (works on web / Chrome; native Expo Go shows a
 * hint to type instead). Kept in a hook so ChatModal stays small.
 */

const LOCALES: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN', ml: 'ml-IN' };

interface UseVoiceInputOptions {
  language: string;
  /** Live transcript while the user is speaking. */
  onInterim: (text: string) => void;
  /** Final transcript once speech ends — caller sends it as a message. */
  onFinal: (text: string) => void;
}

export const useVoiceInput = ({ language, onInterim, onFinal }: UseVoiceInputOptions) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => stop, [stop]);

  const isSupported =
    typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const toggle = useCallback(() => {
    stopSpeech();
    if (isListening) {
      stop();
      return;
    }

    if (!isSupported) {
      const msg =
        'Live voice dictation needs a browser with the Web Speech API (Chrome, Edge or Safari). In Expo Go, please type your question — answers can still be read aloud with "Listen".';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Voice input', msg);
      return;
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = LOCALES[language] || 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      let captured = '';
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) captured += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        onInterim(captured || interim);
      };
      recognition.onerror = (err: any) => {
        setIsListening(false);
        recognitionRef.current = null;
        if (err?.error === 'not-allowed') {
          const msg = 'Microphone permission is required. Please allow microphone access.';
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Microphone', msg);
        }
      };
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        if (captured.trim()) onFinal(captured.trim());
      };

      setIsListening(true);
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
    }
  }, [isListening, isSupported, language, onInterim, onFinal, stop]);

  return { isListening, toggle, stop };
};
