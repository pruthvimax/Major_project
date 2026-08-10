import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface FilterChipsProps {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

export default function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: Layout.spacing.sm,
          paddingHorizontal: Layout.spacing.md,
          paddingBottom: Layout.spacing.md,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        chip: {
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.lighterGray,
        },
        chipActive: {
          backgroundColor: colors.admin,
          borderColor: colors.admin,
        },
        chipText: {
          color: colors.gray,
          fontSize: Typography.fontSize.xs,
          fontWeight: '700',
        },
        chipTextActive: {
          color: colors.white,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = selected === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}