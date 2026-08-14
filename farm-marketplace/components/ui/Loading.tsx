import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { Skeleton } from '../SkeletonLoader';

interface LoadingProps {
  label?: string;
  style?: ViewStyle;
}

/** Centred spinner for full-screen waits. */
export default function Loading({ label = 'Loading…', style }: LoadingProps) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: Layout.spacing.xl,
        },
        label: {
          marginTop: Layout.spacing.md,
          fontSize: Typography.fontSize.sm,
          color: colors.textSecondary,
        },
      }),
    [colors]
  );

  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {!!label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

/** Placeholder rows for list screens (orders, users, disputes …). */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.md,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: Layout.spacing.md,
        },
      }),
    [colors]
  );

  return (
    <View>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.row}>
            <Skeleton height={16} width="45%" style={{ marginTop: 0 }} />
            <Skeleton height={22} width={78} borderRadius={11} style={{ marginTop: 0 }} />
          </View>
          <Skeleton height={12} width="70%" style={{ marginTop: 12 }} />
          <Skeleton height={12} width="55%" style={{ marginTop: 8 }} />
          <View style={styles.row}>
            <Skeleton height={22} width={90} style={{ marginTop: 0 }} />
            <Skeleton height={34} width={104} borderRadius={10} style={{ marginTop: 0 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Placeholder grid for dashboard statistic tiles. */
export function StatRowSkeleton({ count = 2 }: { count?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: Layout.spacing.md }}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={{ flex: 1 }}>
          <Skeleton height={104} borderRadius={Layout.borderRadius.lg} />
        </View>
      ))}
    </View>
  );
}
