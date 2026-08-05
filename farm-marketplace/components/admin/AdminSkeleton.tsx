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
        card: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.lg,
          marginBottom: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: Layout.spacing.sm,
        },
      }),
    [colors]
  );

  return (
    <View style={{ padding: Layout.spacing.md }}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.card}>
          <Skeleton height={18} width="50%" />
          <Skeleton height={14} width="70%" style={{ marginTop: 8 }} />
          <Skeleton height={14} width="40%" style={{ marginTop: 8 }} />
          <View style={styles.row}>
            <Skeleton height={24} width={80} borderRadius={6} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Skeleton height={32} width={32} borderRadius={8} />
              <Skeleton height={32} width={32} borderRadius={8} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function AdminStatCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: Layout.spacing.md }}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={{ width: '33.33%', padding: 4 }}>
          <Skeleton height={110} borderRadius={16} />
        </View>
      ))}
    </View>
  );
}