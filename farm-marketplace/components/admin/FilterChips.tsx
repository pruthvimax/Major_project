import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import { ChipRow } from '../ui/Chip';

interface FilterChipsProps {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

/**
 * Admin filter row. Delegates to the shared <ChipRow/> so the chips scroll
 * horizontally instead of wrapping and never clip on small screens.
 */
export default function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingTop: Layout.spacing.md,
          paddingBottom: Layout.spacing.md,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <ChipRow options={options} selected={selected} onSelect={onSelect} />
    </View>
  );
}
