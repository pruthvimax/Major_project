import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Card from '../ui/Card';
import Badge, { BadgeTone } from '../ui/Badge';
import { SCHEME_QUERY_STATUS_META, type SchemeQuery, type SchemeQueryStatus } from '../../types/scheme.types';
import { formatSchemeDate } from '../../services/schemes';

export const QUERY_STATUS_TONES: Record<SchemeQueryStatus, BadgeTone> = {
  open: 'warning',
  answered: 'info',
  resolved: 'success',
};

export function QueryStatusBadge({ status }: { status: SchemeQueryStatus }) {
  const meta = SCHEME_QUERY_STATUS_META[status] || SCHEME_QUERY_STATUS_META.open;
  return <Badge label={meta.label} tone={QUERY_STATUS_TONES[status] || 'neutral'} icon={meta.icon} />;
}

interface QueryCardProps {
  query: SchemeQuery;
  /** Shows the farmer's name (admin inbox). */
  showFarmer?: boolean;
  /** Shows the scheme name above the question. */
  showScheme?: boolean;
  onPress?: () => void;
  footer?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * One farmer question with the admin's reply thread. Used by both the farmer
 * "My Questions" list and the admin query inbox.
 */
export default function QueryCard({
  query,
  showFarmer = false,
  showScheme = true,
  onPress,
  footer,
  style,
}: QueryCardProps) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: Layout.spacing.md - 2 },
        head: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
        },
        headText: { flex: 1, minWidth: 0 },
        schemeName: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          fontWeight: Typography.fontWeight.bold,
          color: colors.primary,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        },
        meta: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.muted,
          marginTop: 2,
        },
        bubble: {
          flexDirection: 'row',
          gap: Layout.spacing.sm,
          alignItems: 'flex-start',
          marginTop: Layout.spacing.sm + 2,
        },
        avatar: {
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        bubbleBody: {
          flex: 1,
          minWidth: 0,
          borderRadius: Layout.borderRadius.md,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm + 2,
        },
        questionBody: { backgroundColor: colors.surfaceAlt },
        answerBody: { backgroundColor: colors.primarySoft },
        bubbleLabel: {
          fontSize: Typography.fontSize.xxs,
          lineHeight: Typography.leading.xs,
          fontWeight: Typography.fontWeight.extrabold,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 2,
        },
        bubbleText: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.text,
        },
        pending: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: Layout.spacing.sm + 2,
        },
        pendingText: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          fontStyle: 'italic',
          flexShrink: 1,
        },
      }),
    [colors]
  );

  const asked = formatSchemeDate(query.createdAt);
  const who = showFarmer ? query.farmer?.name || 'Farmer' : 'You';

  return (
    <Card style={style ? [styles.card, style] : styles.card} onPress={onPress} elevation="xs">
      <View style={styles.head}>
        <View style={styles.headText}>
          {showScheme && (
            <Text style={styles.schemeName} numberOfLines={1}>
              {query.scheme?.name || 'Scheme removed'}
            </Text>
          )}
          <Text style={styles.meta} numberOfLines={1}>
            {showFarmer ? `${who} · ` : ''}Asked on {asked}
          </Text>
        </View>
        <QueryStatusBadge status={query.status} />
      </View>

      <View style={styles.bubble}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="person-outline" size={15} color={colors.textSecondary} />
        </View>
        <View style={[styles.bubbleBody, styles.questionBody]}>
          <Text style={[styles.bubbleLabel, { color: colors.textSecondary }]}>Question</Text>
          <Text style={styles.bubbleText}>{query.question}</Text>
        </View>
      </View>

      {query.adminResponse ? (
        <View style={styles.bubble}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
          </View>
          <View style={[styles.bubbleBody, styles.answerBody]}>
            <Text style={[styles.bubbleLabel, { color: colors.primaryDark }]}>
              Admin response{query.respondedAt ? ` · ${formatSchemeDate(query.respondedAt)}` : ''}
            </Text>
            <Text style={styles.bubbleText}>{query.adminResponse}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.pending}>
          <Ionicons name="time-outline" size={14} color={colors.muted} />
          <Text style={styles.pendingText} numberOfLines={2}>
            {showFarmer ? 'Awaiting your reply' : 'Waiting for an administrator to reply'}
          </Text>
        </View>
      )}

      {footer}
    </Card>
  );
}
