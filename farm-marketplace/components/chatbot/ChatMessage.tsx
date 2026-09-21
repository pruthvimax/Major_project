import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import Typography from '../../constants/Typography';

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
}

export default function ChatMessage({ message, onListen }: ChatMessageProps) {
  const colors = useColors();
  const isUser = message.sender === 'user';

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
        listen: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
        },
        listenText: {
          fontSize: Typography.fontSize.xxs,
          color: colors.primary,
          fontWeight: Typography.fontWeight.semibold,
        },
      }),
    [colors, isUser]
  );

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
          {!isUser && onListen && (
            <TouchableOpacity style={styles.listen} onPress={() => onListen(message.text)} accessibilityRole="button" accessibilityLabel="Read aloud">
              <Ionicons name="volume-medium-outline" size={14} color={colors.primary} />
              <Text style={styles.listenText}>Listen</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
