import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface QuantityStepperProps {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export default function QuantityStepper({
  value,
  onDecrease,
  onIncrease,
  min = 1,
  max,
  disabled = false,
  compact = false,
  style,
}: QuantityStepperProps) {
  const colors = useColors();
  const box = compact ? 30 : 36;
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && (max === undefined || value < max);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: compact ? Layout.spacing.sm : Layout.spacing.md,
        },
        btn: {
          width: box,
          height: box,
          borderRadius: Layout.borderRadius.sm + 2,
          borderWidth: 1.5,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
        },
        btnDisabled: { opacity: 0.4 },
        value: {
          minWidth: 22,
          textAlign: 'center',
          fontSize: compact ? Typography.fontSize.sm : Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
      }),
    [colors, box, compact]
  );

  return (
    <View style={[styles.wrap, style]}>
      <TouchableOpacity
        onPress={onDecrease}
        disabled={!canDecrease}
        style={[styles.btn, !canDecrease && styles.btnDisabled]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
      >
        <Ionicons name="remove" size={compact ? 15 : 18} color={colors.primary} />
      </TouchableOpacity>

      <Text style={styles.value}>{value}</Text>

      <TouchableOpacity
        onPress={onIncrease}
        disabled={!canIncrease}
        style={[styles.btn, !canIncrease && styles.btnDisabled]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
      >
        <Ionicons name="add" size={compact ? 15 : 18} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}
