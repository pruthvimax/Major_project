import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

export type BadgeTone =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'primary';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export default function Badge({
  label,
  tone = 'neutral',
  icon,
  size = 'sm',
  style,
}: BadgeProps) {
  const colors = useColors();

  const palette = useMemo(() => {
    switch (tone) {
      case 'success':
        return { bg: colors.successSoft, fg: colors.success };
      case 'warning':
        return { bg: colors.warningSoft, fg: colors.warning };
      case 'error':
        return { bg: colors.errorSoft, fg: colors.error };
      case 'info':
        return { bg: colors.infoSoft, fg: colors.info };
      case 'primary':
        return { bg: colors.primarySoft, fg: colors.primary };
      default:
        return { bg: colors.lighterGray, fg: colors.textSecondary };
    }
  }, [tone, colors]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: palette.bg,
          borderRadius: Layout.borderRadius.full,
          paddingHorizontal: size === 'sm' ? Layout.spacing.sm + 2 : Layout.spacing.md,
          paddingVertical: size === 'sm' ? 4 : 6,
          gap: 4,
        },
        text: {
          fontSize: size === 'sm' ? Typography.fontSize.xxs : Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.bold,
          color: palette.fg,
          letterSpacing: 0.3,
        },
      }),
    [palette, size]
  );

  return (
    <View style={[styles.wrap, style]}>
      {icon && <Ionicons name={icon} size={size === 'sm' ? 11 : 13} color={palette.fg} />}
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
