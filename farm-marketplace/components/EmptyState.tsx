import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../constants/Colors';
import Typography from '../constants/Typography';
import Layout from '../constants/Layout';
import Button from './ui/Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
  /** Secondary action rendered under the primary one. */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

export default function EmptyState({
  icon = 'leaf-outline',
  title,
  description,
  actionLabel,
  onAction,
  iconColor,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  style,
}: EmptyStateProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: compact ? 0 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: Layout.spacing.xl,
          paddingVertical: compact ? Layout.spacing.xl : Layout.spacing.xxl,
          minHeight: compact ? 0 : 240,
        },
        iconOuter: {
          width: 108,
          height: 108,
          borderRadius: 54,
          backgroundColor: colors.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Layout.spacing.lg,
        },
        iconInner: {
          width: 76,
          height: 76,
          borderRadius: 38,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        title: {
          fontSize: Typography.fontSize.lg,
          lineHeight: Typography.leading.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
        },
        description: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: Layout.spacing.xs + 2,
          maxWidth: 300,
        },
        actions: {
          marginTop: Layout.spacing.lg,
          alignItems: 'center',
          gap: Layout.spacing.sm,
          width: '100%',
          maxWidth: 280,
        },
      }),
    [colors, compact]
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconOuter}>
        <View style={styles.iconInner}>
          <Ionicons name={icon} size={36} color={iconColor || colors.primary} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {((actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction)) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <Button title={actionLabel} onPress={onAction} size="md" />
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              title={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="ghost"
              size="sm"
            />
          )}
        </View>
      )}
    </View>
  );
}
