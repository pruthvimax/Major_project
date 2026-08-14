import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  /** Accent colour for the icon chip and value. Defaults to brand primary. */
  accent?: string;
  tint?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function StatCard({
  icon,
  value,
  label,
  accent,
  tint,
  onPress,
  style,
}: StatCardProps) {
  const colors = useColors();
  const accentColor = accent || colors.primary;
  const tintColor = tint || colors.primarySoft;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          minWidth: 0,
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          ...Layout.shadow.xs,
        },
        iconWrap: {
          width: 38,
          height: 38,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: tintColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Layout.spacing.sm + 2,
        },
        value: {
          fontSize: Typography.fontSize.xxl,
          lineHeight: Typography.leading.xxl,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.text,
        },
        label: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          marginTop: 2,
          fontWeight: Typography.fontWeight.medium,
        },
      }),
    [colors, tintColor]
  );

  const body = (
    <>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={accentColor} />
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, style]}>
        {body}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{body}</View>;
}
