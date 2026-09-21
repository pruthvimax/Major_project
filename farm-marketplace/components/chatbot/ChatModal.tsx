import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import Typography from '../../constants/Typography';
import { useLanguage } from '../../context/LanguageContext';
import { speakText, stopSpeech } from '../../services/speech';
import { askAssistant, getWelcomeMessage } from '../../services/chatbot';
import { useVoiceInput } from '../../services/chatbot/voice';
import { QUICK_ACTIONS } from '../../data/faqs';
import type { ChatRole } from '../../data/faqs/types';
import LanguageSelector from '../LanguageSelector';
import ChatMessage, { type ChatMessageData } from './ChatMessage';
import SuggestedQuestions from './SuggestedQuestions';
import TypingIndicator from './TypingIndicator';

interface ChatModalProps {
  visible: boolean;
  role: ChatRole;
  userName?: string;
  onClose: () => void;
}

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Small pause so the typing indicator is visible even for instant local answers. */
const THINK_DELAY_MS = 450;

export default function ChatModal({ visible, role, userName, onClose }: ChatModalProps) {
  const colors = useColors();
  const { language } = useLanguage();

  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(QUICK_ACTIONS[role]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [interim, setInterim] = useState('');
  const lastEntryId = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const slide = useRef(new Animated.Value(0)).current;

  // Open / close animation for the sheet.
  useEffect(() => {
    if (!visible) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, slide]);

  // Fresh, role-specific welcome each time the assistant opens.
  useEffect(() => {
    if (!visible) return;
    lastEntryId.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([{ id: 'welcome', sender: 'bot', text: getWelcomeMessage(role, userName), time: now(), source: 'local' }]);
    setSuggestions(QUICK_ACTIONS[role]);
    setInput('');
    setInterim('');
  }, [visible, role, userName]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || typing) return;

      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'user', text, time: now() }]);
      setInput('');
      setInterim('');
      setTyping(true);
      scrollToEnd();

      const started = Date.now();
      const reply = await askAssistant(text, { role, language, lastEntryId: lastEntryId.current });
      const wait = Math.max(0, THINK_DELAY_MS - (Date.now() - started));
      await new Promise((resolve) => setTimeout(resolve, wait));

      lastEntryId.current = reply.entryId;
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, sender: 'bot', text: reply.text, time: now(), source: reply.source }]);
      setSuggestions(reply.suggestions);
      setTyping(false);
      scrollToEnd();
      speakText(reply.text, language);
    },
    [role, language, typing, scrollToEnd]
  );

  const voice = useVoiceInput({
    language,
    onInterim: (live) => {
      setInterim(live);
      setInput(live);
    },
    onFinal: (final) => send(final),
  });

  const handleClose = () => {
    stopSpeech();
    voice.stop();
    onClose();
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
        },
        backdrop: { flex: 1 },
        sheet: {
          height: '82%',
          backgroundColor: colors.card,
          borderTopLeftRadius: Layout.borderRadius.xxl,
          borderTopRightRadius: Layout.borderRadius.xxl,
          overflow: 'hidden',
          ...Layout.shadow.lg,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm,
          backgroundColor: colors.primary,
        },
        headerAvatar: {
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: 'rgba(255,255,255,0.2)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerText: { flex: 1, minWidth: 0 },
        headerTitle: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.white,
        },
        headerSub: {
          fontSize: Typography.fontSize.xxs,
          color: 'rgba(255,255,255,0.85)',
        },
        headerBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.18)',
        },
        listening: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Layout.spacing.xs,
          paddingVertical: 6,
          backgroundColor: colors.primarySoft,
        },
        listeningText: {
          fontSize: Typography.fontSize.xs,
          color: colors.primaryDark,
          fontWeight: Typography.fontWeight.semibold,
        },
        messages: { flex: 1 },
        messagesContent: {
          padding: Layout.spacing.md,
          paddingBottom: Layout.spacing.lg,
        },
        inputRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: Layout.spacing.xs,
          padding: Layout.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
        },
        input: {
          flex: 1,
          minHeight: 42,
          maxHeight: 96,
          backgroundColor: colors.input,
          borderRadius: Layout.borderRadius.xl,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Platform.OS === 'ios' ? 10 : 8,
          fontSize: Typography.fontSize.sm,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
        },
        iconBtn: {
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
        },
        micActive: { backgroundColor: colors.error, borderColor: colors.error },
        sendBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
        sendDisabled: { opacity: 0.45 },
        offlineNote: {
          textAlign: 'center',
          fontSize: Typography.fontSize.xxs,
          color: colors.muted,
          paddingBottom: Layout.spacing.xs,
        },
      }),
    [colors]
  );

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const canSend = input.trim().length > 0 && !typing;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} accessibilityLabel="Close assistant" />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerAvatar}>
                <Ionicons name="leaf" size={20} color={colors.white} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Krishi Assistant
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {role === 'farmer' ? 'Farmer help · selling & farming tips' : 'Buyer help · orders, escrow & delivery'}
                </Text>
              </View>
              <LanguageSelector />
              <TouchableOpacity style={styles.headerBtn} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>

            {voice.isListening && (
              <View style={styles.listening}>
                <Ionicons name="mic" size={14} color={colors.primaryDark} />
                <Text style={styles.listeningText}>{interim ? `"${interim}"` : 'Listening… speak now'}</Text>
              </View>
            )}

            {/* Conversation */}
            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={scrollToEnd}
            >
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} onListen={(text) => speakText(text, language)} />
              ))}
              {typing && <TypingIndicator />}
            </ScrollView>

            {/* Suggested questions */}
            <SuggestedQuestions
              title={messages.length <= 1 ? 'Quick questions' : 'You can also ask'}
              questions={suggestions}
              onSelect={send}
              disabled={typing}
            />

            {/* Composer */}
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[styles.iconBtn, voice.isListening && styles.micActive]}
                onPress={voice.toggle}
                accessibilityRole="button"
                accessibilityLabel={voice.isListening ? 'Stop listening' : 'Speak your question'}
              >
                <Ionicons name={voice.isListening ? 'mic' : 'mic-outline'} size={20} color={voice.isListening ? colors.white : colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={voice.isListening ? 'Listening…' : 'Ask a question…'}
                placeholderTextColor={colors.muted}
                multiline
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={() => send(input)}
                editable={!typing}
              />
              <TouchableOpacity
                style={[styles.iconBtn, styles.sendBtn, !canSend && styles.sendDisabled]}
                onPress={() => send(input)}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send"
              >
                <Ionicons name="send" size={17} color={colors.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.offlineNote}>Answers come from the built-in knowledge base · works offline</Text>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}
