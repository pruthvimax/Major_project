import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import Typography from '../../constants/Typography';
import { stopSpeech, subscribeSpeechState } from '../../services/speech';

export interface ChatMessageData {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  /** Where the bot answer came from — shown as a tiny label for demos. */
  source?: 'local' | 'server' | 'fallback';
}

interface ChatMessageProps {
  message: ChatMessageData;
  onListen?: (text: string) => void;
  onStop?: () => void;
}

export default function ChatMessage({ message, onListen, onStop }: ChatMessageProps) {
  const colors = useColors();
  const isUser = message.sender === 'user';
  const [isPlayingThis, setIsPlayingThis] = useState(false);

  useEffect(() => {
    if (isUser) return;
    const unsubscribe = subscribeSpeechState((speaking, activeText) => {
      setIsPlayingThis(speaking && activeText === message.text);
    });
    return unsubscribe;
  }, [isUser, message.text]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: Layout.spacing.xs,
          marginBottom: Layout.spacing.sm,
          maxWidth: '88%',
          alignSelf: isUser ? 'flex-end' : 'flex-start',
        },
        avatar: {
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        bubble: {
          flexShrink: 1,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm + 2,
          borderRadius: Layout.borderRadius.lg,
          backgroundColor: isUser ? colors.primary : colors.surfaceAlt,
          borderBottomRightRadius: isUser ? 4 : Layout.borderRadius.lg,
          borderBottomLeftRadius: isUser ? Layout.borderRadius.lg : 4,
          borderWidth: isUser ? 0 : 1,
          borderColor: colors.border,
        },
        text: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: isUser ? colors.white : colors.text,
        },
        meta: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: Layout.spacing.xs,
          gap: Layout.spacing.sm,
        },
        time: {
          fontSize: Typography.fontSize.xxs,
          color: isUser ? 'rgba(255,255,255,0.75)' : colors.muted,
        },
        listenBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: Layout.borderRadius.xs,
          backgroundColor: isPlayingThis ? colors.error + '18' : 'transparent',
        },
        listenText: {
          fontSize: Typography.fontSize.xxs,
          color: isPlayingThis ? colors.error : colors.primary,
          fontWeight: Typography.fontWeight.semibold,
        },
      }),
    [colors, isUser, isPlayingThis]
  );

  const handleAudioPress = () => {
    if (isPlayingThis) {
      stopSpeech();
      if (onStop) onStop();
    } else if (onListen) {
      onListen(message.text);
    }
  };

  return (
    <View style={styles.row}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="leaf" size={15} color={colors.primary} />
        </View>
      )}
      <View style={styles.bubble}>
        <Text style={styles.text} selectable>
          {message.text}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.time}>
            {message.time}
            {!isUser && message.source === 'server' ? ' · live data' : ''}
          </Text>
          {!isUser && (onListen || onStop) && (
            <TouchableOpacity
              style={styles.listenBtn}
              onPress={handleAudioPress}
              accessibilityRole="button"
              accessibilityLabel={isPlayingThis ? 'Stop reading aloud' : 'Read aloud'}
            >
              <Ionicons
                name={isPlayingThis ? 'volume-mute' : 'volume-medium-outline'}
                size={14}
                color={isPlayingThis ? colors.error : colors.primary}
              />
              <Text style={styles.listenText}>{isPlayingThis ? 'Stop' : 'Listen'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
