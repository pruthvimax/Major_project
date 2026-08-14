import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  elevation?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  style?: ViewStyle | ViewStyle[];
  bordered?: boolean;
}

export default function Card({
  children,
  onPress,
  padded = true,
  elevation = 'sm',
  bordered = true,
  style,
}: CardProps) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: padded ? Layout.spacing.md : 0,
          borderWidth: bordered ? 1 : 0,
          borderColor: colors.border,
          ...Layout.shadow[elevation],
        },
      }),
    [colors, padded, bordered, elevation]
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}
