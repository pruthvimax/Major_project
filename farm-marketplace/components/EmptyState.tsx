import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../constants/Colors';
import Typography from '../constants/Typography';
import Layout from '../constants/Layout';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
}

export default function EmptyState({
  icon = 'leaf-outline',
  title,
  description,
  actionLabel,
  onAction,
  iconColor,
}: EmptyStateProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: Layout.spacing.xl,
          minHeight: 240,
        },
        iconWrap: {
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: colors.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Layout.spacing.md,
        },
        title: {
          fontSize: Typography.fontSize.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.black,
          textAlign: 'center',
        },
        description: {
          fontSize: Typography.fontSize.sm,
          color: colors.gray,
          textAlign: 'center',
          marginTop: Layout.spacing.xs,
          lineHeight: 20,
          maxWidth: 280,
        },
        button: {
          marginTop: Layout.spacing.lg,
          backgroundColor: colors.primary,
          paddingHorizontal: Layout.spacing.xl,
          paddingVertical: Layout.spacing.sm + 2,
          borderRadius: Layout.borderRadius.md,
        },
        buttonText: {
          color: colors.white,
          fontWeight: Typography.fontWeight.semibold,
          fontSize: Typography.fontSize.sm,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={40} color={iconColor || colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
