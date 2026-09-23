import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Card from '../ui/Card';
import Badge, { BadgeTone } from '../ui/Badge';
import {
  SCHEME_CATEGORY_META,
  SCHEME_LABEL_META,
  type Scheme,
  type SchemeLabel,
} from '../../types/scheme.types';
import { daysUntilDeadline, describeDeadline } from '../../services/schemes';

const LABEL_TONES: Record<SchemeLabel, BadgeTone> = {
  new: 'info',
  popular: 'warning',
  expiring_soon: 'error',
};

/** Row of "New / Popular / Expiring Soon" badges. */
export function SchemeLabelBadges({ labels, style }: { labels: SchemeLabel[]; style?: ViewStyle }) {
  if (!labels || labels.length === 0) return null;
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, style]}>
      {labels.map((label) => {
        const meta = SCHEME_LABEL_META[label];
        if (!meta) return null;
        return <Badge key={label} label={meta.label} tone={LABEL_TONES[label]} icon={meta.icon} />;
      })}
    </View>
  );
}

/** Small "Government Scheme" emblem used on cards and detail screens. */
export function GovernmentBadge({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primarySoft,
        borderRadius: Layout.borderRadius.full,
        paddingHorizontal: compact ? 6 : 8,
        paddingVertical: compact ? 2 : 4,
        alignSelf: 'flex-start',
      }}
      accessibilityLabel="Government scheme"
    >
      <Ionicons name="ribbon" size={compact ? 10 : 12} color={colors.primaryDark} />
      {!compact && (
        <Text
          style={{
            fontSize: Typography.fontSize.xxs,
            fontWeight: Typography.fontWeight.bold,
            color: colors.primaryDark,
            letterSpacing: 0.4,
          }}
        >
          GOVT. SCHEME
        </Text>
      )}
    </View>
  );
}

interface SchemeCardProps {
  scheme: Scheme;
  onPress?: () => void;
  /** Farmer: shows a bookmark toggle. */
  onToggleSave?: () => void;
  saving?: boolean;
  /** Admin: shows active/inactive state and engagement numbers. */
  adminMeta?: boolean;
  /** Extra content under the card body (admin action row etc.). */
  footer?: React.ReactNode;
  style?: ViewStyle;
}

export default function SchemeCard({
  scheme,
  onPress,
  onToggleSave,
  saving = false,
  adminMeta = false,
  footer,
  style,
}: SchemeCardProps) {
  const colors = useColors();
  const category = SCHEME_CATEGORY_META[scheme.category] || SCHEME_CATEGORY_META.Other;
  const days = daysUntilDeadline(scheme.applicationDeadline);
  const deadlineUrgent = days !== null && days >= 0 && days <= 14;
  const deadlineClosed = days !== null && days < 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: Layout.spacing.md - 2, opacity: adminMeta && !scheme.isActive ? 0.72 : 1 },
        top: { flexDirection: 'row', alignItems: 'flex-start', gap: Layout.spacing.md },
        iconWell: {
          width: 48,
          height: 48,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        headings: { flex: 1, minWidth: 0, gap: 4 },
        name: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
        categoryText: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          fontWeight: Typography.fontWeight.medium,
        },
        saveBtn: {
          width: 38,
          height: 38,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: scheme.isSaved ? colors.primarySoft : colors.surfaceAlt,
          flexShrink: 0,
        },
        description: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          marginTop: Layout.spacing.sm + 2,
        },
        metaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.md,
          paddingTop: Layout.spacing.sm + 2,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        deadline: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1, minWidth: 0 },
        deadlineText: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          fontWeight: Typography.fontWeight.semibold,
          color: deadlineClosed ? colors.muted : deadlineUrgent ? colors.error : colors.textSecondary,
          flexShrink: 1,
        },
        stats: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md, flexShrink: 0 },
        stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
        statText: { fontSize: Typography.fontSize.xs, color: colors.muted, fontWeight: Typography.fontWeight.medium },
        labels: { marginTop: Layout.spacing.sm + 2 },
      }),
    [colors, adminMeta, scheme.isActive, scheme.isSaved, deadlineUrgent, deadlineClosed]
  );

  return (
    <Card style={style ? [styles.card, style] : styles.card} onPress={onPress} elevation="xs">
      <View style={styles.top}>
        <View style={styles.iconWell}>
          <Ionicons name={category.icon} size={22} color={colors.primary} />
        </View>
        <View style={styles.headings}>
          <Text style={styles.name} numberOfLines={2}>
            {scheme.name}
          </Text>
          <View style={styles.categoryRow}>
            <GovernmentBadge compact />
            <Text style={styles.categoryText} numberOfLines={1}>
              {scheme.category}
            </Text>
            {adminMeta && (
              <Badge
                label={scheme.isActive ? 'Active' : 'Inactive'}
                tone={scheme.isActive ? 'success' : 'neutral'}
              />
            )}
          </View>
        </View>
        {onToggleSave && (
          <TouchableOpacity
            onPress={onToggleSave}
            disabled={saving}
            style={styles.saveBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={scheme.isSaved ? 'Remove from saved schemes' : 'Save scheme'}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name={scheme.isSaved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={scheme.isSaved ? colors.primary : colors.muted}
            />
          </TouchableOpacity>
        )}
      </View>

      {scheme.labels.length > 0 && <SchemeLabelBadges labels={scheme.labels} style={styles.labels} />}

      <Text style={styles.description} numberOfLines={3}>
        {scheme.description}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.deadline}>
          <Ionicons
            name={deadlineClosed ? 'lock-closed-outline' : 'calendar-outline'}
            size={14}
            color={deadlineClosed ? colors.muted : deadlineUrgent ? colors.error : colors.textSecondary}
          />
          <Text style={styles.deadlineText} numberOfLines={1}>
            {describeDeadline(scheme.applicationDeadline)}
          </Text>
        </View>
        {adminMeta && (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={14} color={colors.muted} />
              <Text style={styles.statText}>{scheme.viewCount}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="bookmark-outline" size={14} color={colors.muted} />
              <Text style={styles.statText}>{scheme.savedCount}</Text>
            </View>
          </View>
        )}
        {!adminMeta && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
      </View>

      {footer}
    </Card>
  );
}
