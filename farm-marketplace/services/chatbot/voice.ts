import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { stopSpeech } from '../speech';
import api from '../api';

const LOCALES: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  pa: 'pa-IN',
};

interface UseVoiceInputOptions {
  language: string;
  /** Live transcript / status while user is speaking or processing */
  onInterim: (text: string) => void;
  /** Final transcript once speech is transcribed — caller sends it as a message */
  onFinal: (text: string) => void;
}

export const useVoiceInput = ({ language, onInterim, onFinal }: UseVoiceInputOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Native recording ref
  const recordingRef = useRef<any>(null);
  // Web Speech recognition ref
  const webRecognitionRef = useRef<any>(null);
  // Auto-stop safety timer ref
  const autoStopTimerRef = useRef<any>(null);

  const clearAutoStopTimer = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  };

  const stop = useCallback(async () => {
    clearAutoStopTimer();

    // 1. If Web Recognition was active
    if (webRecognitionRef.current) {
      try {
        webRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      webRecognitionRef.current = null;
    }

    // 2. If Native Audio recording was active
    if (recordingRef.current) {
      const recorder = recordingRef.current;
      recordingRef.current = null;
      setIsListening(false);
      setIsProcessing(true);
      onInterim('Transcribing speech...');

      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) throw new Error('Could not find recording URI');

        // Read audio file as base64
        let FileSystem: any;
        try {
          FileSystem = await import('expo-file-system/legacy');
        } catch {
          FileSystem = await import('expo-file-system');
        }

        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) throw new Error('Audio recording file not found');

        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });

        // Call backend STT transcribe endpoint
        const res = await api.post('/ai/transcribe', {
          audioData: base64Audio,
          languageCode: language || 'en',
        });

        const transcript = res.data?.transcription?.trim() || '';
        setIsProcessing(false);
        onInterim('');

        if (transcript) {
          onFinal(transcript);
        } else {
          Alert.alert('Voice Input', 'Could not detect any speech. Please try speaking again.');
        }
      } catch (err: any) {
        console.error('[voice] Error processing native audio:', err?.message || err);
        setIsProcessing(false);
        onInterim('');
        Alert.alert('Voice Input Error', err?.response?.data?.message || err?.message || 'Failed to transcribe audio. Please try again.');
      }
      return;
    }

    setIsListening(false);
    setIsProcessing(false);
  }, [language, onFinal, onInterim]);

  useEffect(() => {
    return () => {
      clearAutoStopTimer();
      if (webRecognitionRef.current) {
        try {
          webRecognitionRef.current.abort();
        } catch {}
      }
      if (recordingRef.current) {
        try {
          recordingRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const toggle = useCallback(async () => {
    stopSpeech();

    // If currently recording or processing, stop now
    if (isListening || isProcessing) {
      await stop();
      return;
    }

    // ─────────────────────────────────────────────
    // Web Browser Voice Recognition
    // ─────────────────────────────────────────────
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          webRecognitionRef.current = recognition;
          recognition.lang = LOCALES[language] || 'en-IN';
          recognition.interimResults = true;
          recognition.continuous = false;
          recognition.maxAlternatives = 1;

          let captured = '';
          let lastTranscript = '';

          recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
              if (event.results[i].isFinal) captured += event.results[i][0].transcript;
              else interim += event.results[i][0].transcript;
            }
            lastTranscript = (captured || interim).trim();
            onInterim(lastTranscript);
          };

          recognition.onerror = (err: any) => {
            setIsListening(false);
            webRecognitionRef.current = null;
            if (err?.error === 'not-allowed') {
              Alert.alert('Microphone Access', 'Microphone access was denied. Please allow microphone permissions.');
            }
          };

          recognition.onend = () => {
            setIsListening(false);
            webRecognitionRef.current = null;
            const finalText = captured.trim() || lastTranscript.trim();
            if (finalText) onFinal(finalText);
          };

          setIsListening(true);
          onInterim('Listening... speak now');
          recognition.start();
          return;
        } catch (webErr) {
          console.warn('[voice] Web speech recognition failed to start:', webErr);
        }
      }
    }

    // ─────────────────────────────────────────────
    // Native (Android / iOS / Expo Go) Voice Engine
    // ─────────────────────────────────────────────
    try {
      const { AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync, RecordingPresets } = await import('expo-audio');

      const permission = await requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Microphone Permission', 'Please grant microphone access in settings to speak with Krishi Assistant.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingRef.current = recorder;

      setIsListening(true);
      onInterim('Listening... speak now');

      // Auto-stop after 10 seconds of silence/speech
      clearAutoStopTimer();
      autoStopTimerRef.current = setTimeout(() => {
        stop();
      }, 10000);
    } catch (nativeErr: any) {
      console.error('[voice] Native audio record init failed:', nativeErr);
      setIsListening(false);
      Alert.alert('Voice Input Unavailable', nativeErr?.message || 'Audio recording could not be started on this device.');
    }
  }, [isListening, isProcessing, language, onFinal, onInterim, stop]);

  return { isListening: isListening || isProcessing, isProcessing, toggle, stop };
};
