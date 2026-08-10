import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FFF3E0', text: '#EF6C00' },
  accepted: { bg: '#E3F2FD', text: '#0277BD' },
  confirmed: { bg: '#E3F2FD', text: '#0277BD' },
  packed: { bg: '#E8EAF6', text: '#3949AB' },
  processing: { bg: '#E8EAF6', text: '#3949AB' },
  shipped: { bg: '#EDE7F6', text: '#7B1FA2' },
  delivered: { bg: '#E8F5E9', text: '#2E7D32' },
  cancelled: { bg: '#FFEBEE', text: '#C62828' },
  approved: { bg: '#E8F5E9', text: '#2E7D32' },
  blocked: { bg: '#FFEBEE', text: '#C62828' },
  rejected: { bg: '#FFEBEE', text: '#C62828' },
  unverified: { bg: '#FFF3E0', text: '#EF6C00' },
  verified: { bg: '#E8F5E9', text: '#2E7D32' },
  paid: { bg: '#E8F5E9', text: '#2E7D32' },
  failed: { bg: '#FFEBEE', text: '#C62828' },
  disputed: { bg: '#FFEBEE', text: '#C62828' },
  resolved: { bg: '#E8F5E9', text: '#2E7D32' },
  active: { bg: '#E8F5E9', text: '#2E7D32' },
  suspended: { bg: '#FFF3E0', text: '#EF6C00' },
  locked: { bg: '#E3F2FD', text: '#0277BD' },
  released: { bg: '#E8F5E9', text: '#2E7D32' },
  refunded: { bg: '#EDE7F6', text: '#7B1FA2' },
  none: { bg: '#F5F5F5', text: '#616161' },
  default: { bg: '#F5F5F5', text: '#616161' },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const colors = useColors();
  const normalized = status?.toLowerCase() || 'default';
  const colorSet = STATUS_COLORS[normalized] || STATUS_COLORS.default;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          paddingHorizontal: Layout.spacing.sm,
          paddingVertical: 4,
          borderRadius: Layout.borderRadius.xs,
          alignSelf: 'flex-start',
        },
        text: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
        },
      }),
    []
  );

  return (
    <View style={[styles.badge, { backgroundColor: colorSet.bg }]}>
      <Text style={[styles.text, { color: colorSet.text }]}>
        {label || status}
      </Text>
    </View>
  );
}