import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Card from './Card';
import Rating from './Rating';
import Badge from './Badge';
import ErrorState from './ErrorState';
import EmptyState from '../EmptyState';
import { Skeleton } from '../SkeletonLoader';

/**
 * Farmer Rating Analytics — built entirely from the reviews the dashboard
 * already fetches from GET /api/reviews/farmer (buyer + product populated).
 *
 *   reviews[] ──► average / total / today
 *             ──► distribution (1★..5★ as % of total)
 *             ──► per-product averages ──► top rated
 *             ──► newest 5 ──► recent feedback
 *
 * The parent owns fetching; this component only renders the four states:
 * loading (skeleton), error (retry), empty, and data.
 */

export interface FarmerReview {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  buyer?: { name?: string };
  product?: { _id?: string; name?: string };
}

interface ReviewAnalyticsProps {
  reviews: FarmerReview[];
  /** Server-computed average from the same endpoint; falls back to a local calculation. */
  averageRating?: number;
  /** Server-computed total from the same endpoint; falls back to reviews.length. */
  totalReviews?: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

interface ProductRating {
  key: string;
  name: string;
  count: number;
  average: number;
}

const RECENT_LIMIT = 5;

const isToday = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const clampStars = (value: unknown): number => Math.min(Math.max(Math.round(Number(value) || 0), 1), 5);

export interface ReviewAnalyticsMetrics {
  total: number;
  average: number;
  todayCount: number;
  distribution: { stars: number; count: number; percent: number }[];
  topRated: ProductRating | null;
  recent: FarmerReview[];
}

/** Pure metric calculation — kept separate from rendering so it can be unit-tested. */
export function computeReviewAnalytics(
  reviews: FarmerReview[],
  averageRating?: number,
  totalReviews?: number
): ReviewAnalyticsMetrics {
  const total = typeof totalReviews === 'number' && totalReviews > 0 ? totalReviews : reviews.length;

  let average = 0;
  if (typeof averageRating === 'number' && averageRating > 0) {
    average = Math.round(averageRating * 10) / 10;
  } else if (reviews.length > 0) {
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    average = Math.round((sum / reviews.length) * 10) / 10;
  }

  const todayCount = reviews.filter((r) => isToday(r.createdAt)).length;

  const counts = [0, 0, 0, 0, 0]; // index 0 => 1★ … index 4 => 5★
  for (const r of reviews) counts[clampStars(r.rating) - 1] += 1;
  const denom = reviews.length || 1;
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = counts[stars - 1];
    return { stars, count, percent: Math.round((count / denom) * 100) };
  });

  const map = new Map<string, { name: string; total: number; count: number }>();
  for (const r of reviews) {
    const key = r.product?._id || r.product?.name || 'unknown';
    const entry = map.get(key) || { name: r.product?.name || 'Unknown product', total: 0, count: 0 };
    entry.total += Number(r.rating) || 0;
    entry.count += 1;
    map.set(key, entry);
  }
  let topRated: ProductRating | null = null;
  for (const [key, v] of map.entries()) {
    const candidate: ProductRating = { key, name: v.name, count: v.count, average: Math.round((v.total / v.count) * 10) / 10 };
    // Higher average wins; on a tie the product with more reviews is more trustworthy.
    if (!topRated || candidate.average > topRated.average || (candidate.average === topRated.average && candidate.count > topRated.count)) {
      topRated = candidate;
    }
  }

  const recent = [...reviews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_LIMIT);

  return { total, average, todayCount, distribution, topRated, recent };
}

export default function ReviewAnalytics({
  reviews,
  averageRating,
  totalReviews,
  loading = false,
  error = null,
  onRetry,
}: ReviewAnalyticsProps) {
  const colors = useColors();

  const { total, average, todayCount, distribution, topRated, recent } = useMemo(
    () => computeReviewAnalytics(reviews, averageRating, totalReviews),
    [reviews, averageRating, totalReviews]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        stack: { gap: Layout.spacing.md },
        grid: { flexDirection: 'row', gap: Layout.spacing.md },
        gridItem: { flex: 1, minWidth: 0 },
        metricCard: { minHeight: 132, justifyContent: 'space-between' },
        metricHeader: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.xs },
        iconWell: {
          width: 34,
          height: 34,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        metricLabel: {
          flex: 1,
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.textSecondary,
        },
        metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: Layout.spacing.sm },
        metricValue: {
          fontSize: Typography.fontSize.xxl,
          lineHeight: Typography.leading.xxl,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.text,
        },
        metricSuffix: {
          fontSize: Typography.fontSize.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.muted,
        },
        metricHint: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          marginTop: Layout.spacing.xs,
        },
        cardHeading: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          marginBottom: Layout.spacing.sm,
        },
        distRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm, marginBottom: Layout.spacing.xs + 2 },
        distLabel: {
          width: 30,
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
        },
        distTrack: {
          flex: 1,
          height: 10,
          borderRadius: Layout.borderRadius.full,
          backgroundColor: colors.surfaceAlt,
          overflow: 'hidden',
        },
        distFill: { height: '100%', borderRadius: Layout.borderRadius.full, backgroundColor: colors.star },
        distPercent: {
          width: 40,
          textAlign: 'right',
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
        },
        distCount: { width: 34, textAlign: 'right', fontSize: Typography.fontSize.xxs, color: colors.muted },
        topCard: { backgroundColor: colors.tintAmber, borderColor: colors.tintAmber },
        topRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md },
        topIconWell: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.card,
          alignItems: 'center',
          justifyContent: 'center',
        },
        topBody: { flex: 1, minWidth: 0, gap: 4 },
        topName: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        topMeta: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.xs, flexWrap: 'wrap' },
        topMetaText: { fontSize: Typography.fontSize.xs, color: colors.textSecondary },
        reviewRow: { paddingVertical: Layout.spacing.sm },
        reviewDivider: { height: 1, backgroundColor: colors.border },
        reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Layout.spacing.sm },
        reviewerName: {
          flexShrink: 1,
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        reviewDate: { fontSize: Typography.fontSize.xs, color: colors.muted },
        reviewProduct: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.primary,
          fontWeight: Typography.fontWeight.semibold,
          marginTop: 2,
        },
        reviewComment: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          marginTop: Layout.spacing.xs,
        },
      }),
    [colors]
  );

  // ---- Loading: skeletons sized like the real cards so nothing jumps ----
  if (loading) {
    return (
      <View style={styles.stack}>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Skeleton height={132} borderRadius={Layout.borderRadius.lg} />
          </View>
          <View style={styles.gridItem}>
            <Skeleton height={132} borderRadius={Layout.borderRadius.lg} />
          </View>
        </View>
        <Skeleton height={190} borderRadius={Layout.borderRadius.lg} />
        <Skeleton height={88} borderRadius={Layout.borderRadius.lg} />
        <Skeleton height={260} borderRadius={Layout.borderRadius.lg} />
      </View>
    );
  }

  // ---- Error: friendly message + retry, never a red screen ----
  if (error) {
    return (
      <Card>
        <ErrorState
          compact
          title="Could not load your reviews"
          message={error}
          onRetry={onRetry}
          retryLabel="Retry"
          icon="leaf-outline"
        />
      </Card>
    );
  }

  // ---- Empty ----
  if (reviews.length === 0) {
    return (
      <Card>
        <EmptyState
          compact
          icon="leaf-outline"
          title="No reviews received yet"
          description="Once buyers rate your produce, your ratings, top product and latest feedback will grow here like a fresh crop. 🌱"
        />
      </Card>
    );
  }

  // ---- Data ----
  return (
    <View style={styles.stack}>
      {/* 1 + 2. Average rating & total reviews */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.iconWell, { backgroundColor: colors.tintAmber }]}>
                <Ionicons name="star" size={18} color={colors.star} />
              </View>
              <Text style={styles.metricLabel} numberOfLines={2}>
                Average Rating
              </Text>
            </View>
            <View>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>{average.toFixed(1)}</Text>
                <Text style={styles.metricSuffix}>/ 5</Text>
              </View>
              <Rating value={average} size={14} expanded showValue={false} />
              <Text style={styles.metricHint} numberOfLines={1}>
                Based on {total} review{total !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.gridItem}>
          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.iconWell, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
              </View>
              <Text style={styles.metricLabel} numberOfLines={2}>
                Total Reviews
              </Text>
            </View>
            <View>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>{total}</Text>
              </View>
              {todayCount > 0 ? (
                <Badge label={`+${todayCount} today`} tone="success" icon="trending-up-outline" />
              ) : (
                <Badge label="None today" tone="neutral" icon="time-outline" />
              )}
              <Text style={styles.metricHint} numberOfLines={1}>
                Across all your products
              </Text>
            </View>
          </Card>
        </View>
      </View>

      {/* 3. Rating distribution */}
      <Card>
        <Text style={styles.cardHeading}>Rating Distribution</Text>
        {distribution.map((d) => (
          <View key={d.stars} style={styles.distRow}>
            <Text style={styles.distLabel}>{d.stars}★</Text>
            <View style={styles.distTrack}>
              {d.count > 0 && <View style={[styles.distFill, { width: `${d.percent}%` as `${number}%` }]} />}
            </View>
            <Text style={styles.distPercent}>{d.percent}%</Text>
            <Text style={styles.distCount}>({d.count})</Text>
          </View>
        ))}
      </Card>

      {/* 4. Top rated product */}
      {topRated && (
        <Card style={styles.topCard} elevation="xs">
          <View style={styles.topRow}>
            <View style={styles.topIconWell}>
              <Ionicons name="trophy" size={24} color={colors.accent} />
            </View>
            <View style={styles.topBody}>
              <Badge label="Top Rated Product" tone="warning" icon="ribbon-outline" />
              <Text style={styles.topName} numberOfLines={1}>
                {topRated.name}
              </Text>
              <View style={styles.topMeta}>
                <Rating value={topRated.average} size={14} expanded />
                <Text style={styles.topMetaText}>
                  · {topRated.count} review{topRated.count !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      )}

      {/* 5. Recent feedback */}
      <Card>
        <Text style={styles.cardHeading}>Recent Feedback</Text>
        {recent.map((review, index) => (
          <View key={review._id}>
            {index > 0 && <View style={styles.reviewDivider} />}
            <View style={styles.reviewRow}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName} numberOfLines={1}>
                  {review.buyer?.name || 'Anonymous buyer'}
                </Text>
                <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
              </View>
              {!!review.product?.name && (
                <Text style={styles.reviewProduct} numberOfLines={1}>
                  {review.product.name}
                </Text>
              )}
              <Rating value={review.rating} size={14} expanded showValue={false} style={{ marginTop: 4 }} />
              <Text style={styles.reviewComment} numberOfLines={3}>
                {review.comment}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}
