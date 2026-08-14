import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../SkeletonLoader';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';

export function AdminListSkeleton({ count = 5 }: { count?: number }) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          padding: Layout.spacing.lg,
        },
        card: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          ...Layout.shadow.xs,
        },
        headRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        footRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: Layout.spacing.md,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.headRow}>
            <Skeleton height={16} width="48%" />
            <Skeleton height={22} width={78} borderRadius={Layout.borderRadius.full} />
          </View>
          <Skeleton height={12} width="70%" style={{ marginTop: 12 }} />
          <Skeleton height={12} width="42%" style={{ marginTop: 8 }} />
          <View style={styles.footRow}>
            <Skeleton height={22} width={86} borderRadius={Layout.borderRadius.full} />
            <View style={{ flexDirection: 'row', gap: Layout.spacing.sm }}>
              <Skeleton height={36} width={36} borderRadius={Layout.borderRadius.md} />
              <Skeleton height={36} width={36} borderRadius={Layout.borderRadius.md} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function AdminStatCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Layout.spacing.md,
        padding: Layout.spacing.lg,
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={{ flexGrow: 1, flexBasis: '40%', minWidth: 0 }}>
          <Skeleton height={112} borderRadius={Layout.borderRadius.lg} />
        </View>
      ))}
    </View>
  );
}
