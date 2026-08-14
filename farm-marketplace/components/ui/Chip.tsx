import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface ChipProps {
  label: string;
  active?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, active = false, icon, onPress, style }: ChipProps) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: Layout.spacing.md,
          height: 36,
          borderRadius: Layout.borderRadius.full,
          backgroundColor: active ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.border,
        },
        text: {
          fontSize: Typography.fontSize.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: active ? colors.white : colors.textSecondary,
        },
      }),
    [colors, active]
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, style]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {icon && (
        <Ionicons name={icon} size={14} color={active ? colors.white : colors.textSecondary} />
      )}
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

interface ChipRowProps {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  style?: ViewStyle;
  contentPaddingHorizontal?: number;
}

/** Horizontally scrollable filter row — never wraps, never clips on small screens. */
export function ChipRow({
  options,
  selected,
  onSelect,
  style,
  contentPaddingHorizontal = Layout.spacing.lg,
}: ChipRowProps) {
  return (
    <View style={style}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={options}
        keyExtractor={(item) => item.value}
        contentContainerStyle={{
          paddingHorizontal: contentPaddingHorizontal,
          gap: Layout.spacing.sm,
        }}
        renderItem={({ item }) => (
          <Chip
            label={item.label}
            active={selected === item.value}
            onPress={() => onSelect(item.value)}
          />
        )}
      />
    </View>
  );
}

export default Chip;
