import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { speakText, stopSpeech } from '../services/speech';
import api from '../services/api';
import useColors from '../constants/Colors';
import Layout from '../constants/Layout';
import Typography from '../constants/Typography';
import LanguageSelector from './LanguageSelector';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// Compact 1-2 word recommendations
const QUICK_SUGGESTIONS: Record<string, string[]> = {
  en: ['Vegetables', 'Organic', 'My Orders', 'Prices'],
  hi: ['सब्जियां', 'जैविक', 'मेरे ऑर्डर', 'भाव'],
  kn: ['ತರಕಾರಿಗಳು', 'ಸಾವಯವ', 'ಆರ್ಡರ್‌ಗಳು', 'ಬೆಲೆ'],
  ml: ['പച്ചക്കറികൾ', 'ജൈവം', 'ഓർഡറുകൾ', 'വില'],
};

export default function ChatbotWidget() {
  const { language, t } = useLanguage();
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: t('common.appName') + ' Voice Assistant. Tap microphone to speak your query.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        fab: {
          position: 'absolute',
          bottom: 80,
          right: Layout.spacing.lg,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 999,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'flex-end',
        },
        modalContainer: {
          height: '80%',
          backgroundColor: colors.card,
          borderTopLeftRadius: Layout.borderRadius.xl,
          borderTopRightRadius: Layout.borderRadius.xl,
          overflow: 'hidden',
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm,
          backgroundColor: colors.surfaceAlt,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs,
        },
        headerTitle: {
          fontSize: Typography.fontSize.sm,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs,
        },
        chatContainer: {
          flex: 1,
          padding: Layout.spacing.md,
        },
        userBubble: {
          alignSelf: 'flex-end',
          backgroundColor: colors.primary,
          borderRadius: Layout.borderRadius.lg,
          borderBottomRightRadius: 2,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.sm,
          maxWidth: '80%',
        },
        userText: {
          color: '#FFFFFF',
          fontSize: Typography.fontSize.sm,
        },
        botBubbleRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: Layout.spacing.xs,
          marginBottom: Layout.spacing.sm,
          maxWidth: '85%',
        },
        botAvatar: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        },
        botBubble: {
          backgroundColor: colors.surfaceAlt,
          borderRadius: Layout.borderRadius.lg,
          borderBottomLeftRadius: 2,
          padding: Layout.spacing.md,
          flex: 1,
        },
        botText: {
          color: colors.text,
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
        },
        audioBtn: {
          marginTop: Layout.spacing.xs,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
        },
        audioText: {
          fontSize: Typography.fontSize.xs,
          color: colors.primary,
          fontWeight: Typography.fontWeight.semibold,
        },
        // Compact recommendations
        suggestionsRow: {
          paddingHorizontal: Layout.spacing.sm,
          paddingVertical: 4,
          alignItems: 'center',
        },
        chip: {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 3,
          marginRight: 6,
        },
        chipText: {
          fontSize: 11,
          color: colors.textSecondary,
          fontWeight: Typography.fontWeight.medium,
        },
        inputRow: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: Layout.spacing.sm,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: Layout.spacing.xs,
        },
        textInput: {
          flex: 1,
          backgroundColor: colors.surfaceAlt,
          borderRadius: Layout.borderRadius.lg,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Platform.OS === 'ios' ? 8 : 6,
          fontSize: Typography.fontSize.sm,
          color: colors.text,
          maxHeight: 80,
        },
        iconBtn: {
          width: 38,
          height: 38,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        micActiveBtn: {
          backgroundColor: colors.error,
        },
        sendBtn: {
          backgroundColor: colors.primary,
        },
        listeningBanner: {
          backgroundColor: colors.primarySoft,
          paddingVertical: 6,
          paddingHorizontal: Layout.spacing.md,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        },
        listeningBannerText: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.primary,
        },
      }),
    [colors]
  );

  const sendMessage = async (textToSend: string) => {
    if (!textToSend || !textToSend.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setInterimTranscript('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: textToSend.trim(),
        language,
      });

      if (response.data.success) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: response.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);

        // Auto-play voice reply in selected language
        speakText(response.data.reply, language);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Sorry, I encountered an error connecting to the server. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch {
      // ignore
    }
    setIsListening(false);
  };

  const handleMicInput = () => {
    stopSpeech();

    // Toggle off if currently listening
    if (isListening) {
      stopListening();
      return;
    }

    // Check for Browser Web Speech API (Google Chrome / Edge / Safari / Android Webview)
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      try {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        const langLocaleMap: Record<string, string> = {
          en: 'en-IN',
          hi: 'hi-IN',
          kn: 'kn-IN',
          ml: 'ml-IN',
        };

        recognition.lang = langLocaleMap[language] || 'en-IN';
        recognition.interimResults = true; // Live speech feedback
        recognition.continuous = false; // Auto-stop when user finishes speaking sentence
        recognition.maxAlternatives = 1;

        setIsListening(true);
        setInterimTranscript('');

        let capturedSentence = '';

        recognition.onresult = (event: any) => {
          let interimText = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              capturedSentence += event.results[i][0].transcript;
            } else {
              interimText += event.results[i][0].transcript;
            }
          }

          const currentLiveText = capturedSentence || interimText;
          if (currentLiveText) {
            setInterimTranscript(currentLiveText);
            setInputText(currentLiveText);
          }
        };

        recognition.onerror = (err: any) => {
          console.log('Voice dictation error:', err?.error || err);
          setIsListening(false);
          setInterimTranscript('');
          if (err?.error === 'not-allowed') {
            if (Platform.OS === 'web') {
              window.alert('Microphone permission is required. Please allow microphone access in your browser settings.');
            } else {
              Alert.alert('Microphone Error', 'Microphone access was denied.');
            }
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          recognitionRef.current = null;

          // Dispatch the captured spoken input automatically!
          if (capturedSentence && capturedSentence.trim()) {
            sendMessage(capturedSentence.trim());
          } else if (inputText && inputText.trim()) {
            sendMessage(inputText.trim());
          }
        };

        recognition.start();
      } catch (err) {
        setIsListening(false);
        console.error('Failed to start speech recognition:', err);
      }
    } else {
      if (Platform.OS === 'web') {
        window.alert('Speech recognition is supported in Chrome, Edge, and Safari browsers. Please type your query or open in Chrome.');
      } else {
        Alert.alert(
          'Speech Recognition',
          'Live voice dictation requires Web Speech API supported browsers (Google Chrome / Safari / Edge). You can type your query in the input box below!'
        );
      }
    }
  };

  const suggestions = QUICK_SUGGESTIONS[language] || QUICK_SUGGESTIONS.en;

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Open AI Voice Assistant"
      >
        <Ionicons name="sparkles" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          stopSpeech();
          stopListening();
          setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={styles.headerTitle}>Krishi AI Voice Assistant</Text>
              </View>
              <View style={styles.headerRight}>
                <LanguageSelector />
                <TouchableOpacity
                  onPress={() => {
                    stopSpeech();
                    stopListening();
                    setModalVisible(false);
                  }}
                  style={styles.iconBtn}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {isListening && (
              <View style={styles.listeningBanner}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.listeningBannerText}>
                  🎙️ {interimTranscript ? `Listening: "${interimTranscript}"` : 'Listening to your voice... Speak now'}
                </Text>
              </View>
            )}

            {/* Chat Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatContainer}
              contentContainerStyle={{ paddingBottom: Layout.spacing.md }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg) =>
                msg.sender === 'user' ? (
                  <View key={msg.id} style={styles.userBubble}>
                    <Text style={styles.userText}>{msg.text}</Text>
                  </View>
                ) : (
                  <View key={msg.id} style={styles.botBubbleRow}>
                    <View style={styles.botAvatar}>
                      <Ionicons name="leaf-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.botBubble}>
                      <Text style={styles.botText}>{msg.text}</Text>
                      <TouchableOpacity
                        style={styles.audioBtn}
                        onPress={() => speakText(msg.text, language)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="volume-medium-outline" size={16} color={colors.primary} />
                        <Text style={styles.audioText}>Listen</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              )}

              {loading && (
                <View style={styles.botBubbleRow}>
                  <View style={styles.botAvatar}>
                    <Ionicons name="leaf-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.botBubble}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Compact Recommendations */}
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsRow}
              >
                {suggestions.map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chip}
                    onPress={() => sendMessage(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Input Row */}
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[styles.iconBtn, isListening && styles.micActiveBtn]}
                onPress={handleMicInput}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isListening ? 'mic' : 'mic-outline'}
                  size={20}
                  color={isListening ? '#FFF' : colors.primary}
                />
              </TouchableOpacity>

              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder={isListening ? 'Listening...' : t('common.search')}
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <TouchableOpacity
                style={[styles.iconBtn, styles.sendBtn]}
                onPress={() => sendMessage(inputText)}
                disabled={loading || !inputText.trim()}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}
