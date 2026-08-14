import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';

interface RatingProps {
  value?: number;
  count?: number;
  size?: number;
  showValue?: boolean;
  /** Renders all five stars instead of a single star + number. */
  expanded?: boolean;
  style?: ViewStyle;
}

export default function Rating({
  value = 0,
  count,
  size = 13,
  showValue = true,
  expanded = false,
  style,
}: RatingProps) {
  const colors = useColors();
  const rounded = Math.round((value || 0) * 10) / 10;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
        value: {
          fontSize: Math.max(size - 2, 10),
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        count: {
          fontSize: Math.max(size - 3, 9),
          color: colors.textSecondary,
        },
      }),
    [colors, size]
  );

  if (expanded) {
    return (
      <View style={[styles.row, style]}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Ionicons
            key={i}
            name={rounded >= i ? 'star' : rounded >= i - 0.5 ? 'star-half' : 'star-outline'}
            size={size}
            color={colors.star}
          />
        ))}
        {showValue && <Text style={styles.value}>{rounded.toFixed(1)}</Text>}
        {count !== undefined && <Text style={styles.count}>({count})</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <Ionicons name="star" size={size} color={colors.star} />
      {showValue && <Text style={styles.value}>{rounded.toFixed(1)}</Text>}
      {count !== undefined && <Text style={styles.count}>({count})</Text>}
    </View>
  );
}
