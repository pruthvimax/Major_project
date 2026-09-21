import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import Typography from '../../constants/Typography';

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
  title?: string;
  disabled?: boolean;
}

/** Horizontally scrolling quick-action chips under the conversation. */
export default function SuggestedQuestions({ questions, onSelect, title, disabled }: SuggestedQuestionsProps) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingTop: Layout.spacing.xs,
          paddingBottom: Layout.spacing.xs,
        },
        title: {
          fontSize: Typography.fontSize.xxs,
          letterSpacing: Typography.letterSpacing.wider,
          textTransform: 'uppercase',
          color: colors.muted,
          fontWeight: Typography.fontWeight.semibold,
          paddingHorizontal: Layout.spacing.md,
          marginBottom: Layout.spacing.xs,
        },
        row: {
          paddingHorizontal: Layout.spacing.md,
          gap: Layout.spacing.sm,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: colors.primaryTint,
          borderColor: colors.primarySoft,
          borderWidth: 1,
          borderRadius: Layout.borderRadius.full,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: 7,
          opacity: disabled ? 0.5 : 1,
        },
        chipText: {
          fontSize: Typography.fontSize.xs,
          color: colors.primaryDark,
          fontWeight: Typography.fontWeight.semibold,
        },
      }),
    [colors, disabled]
  );

  if (questions.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
        {questions.map((q) => (
          <TouchableOpacity key={q} style={styles.chip} onPress={() => onSelect(q)} disabled={disabled} activeOpacity={0.75} accessibilityRole="button">
            <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
            <Text style={styles.chipText} numberOfLines={1}>
              {q}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
