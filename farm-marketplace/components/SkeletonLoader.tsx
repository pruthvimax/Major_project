import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import useColors from '../constants/Colors';
import Layout from '../constants/Layout';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.lightGray,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
      }),
    [colors]
  );

  return (
    <View style={styles.card}>
      <Skeleton height={140} borderRadius={12} />
      <Skeleton height={18} width="60%" style={{ marginTop: 12 }} />
      <Skeleton height={14} width="40%" style={{ marginTop: 8 }} />
      <Skeleton height={12} width="90%" style={{ marginTop: 10 }} />
      <View style={styles.row}>
        <Skeleton height={22} width={80} />
        <Skeleton height={36} width={100} borderRadius={10} />
      </View>
    </View>
  );
}

export function StatCardSkeleton() {
  return (
    <View style={{ flex: 1, marginHorizontal: 4 }}>
      <Skeleton height={90} borderRadius={16} />
    </View>
  );
}

export default Skeleton;
