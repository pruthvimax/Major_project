import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import ThemeToggle from '../../components/ThemeToggle';
import { registerForPushNotificationsAsync, savePushToken } from '../../services/notifications';
import {
  ScreenHeader,
  SectionHeader,
  StatCard,
  StatRowSkeleton,
  Card,
  Rating,
  EmptyState,
} from '../../components/ui';

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  buyer?: { name: string };
  product?: { name: string };
}

interface ProductRating {
  name: string;
  count: number;
  average: number;
}

export default function FarmerDashboard() {
  const colors = useColors();
  const [userName, setUserName] = useState('Farmer');
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // ---- Review analytics derived from the (already fetched) reviews array ----
  const productRatings = useMemo<ProductRating[]>(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const r of reviews) {
      const name = r.product?.name || 'Unknown product';
      const entry = map.get(name) || { total: 0, count: 0 };
      entry.total += Number(r.rating) || 0;
      entry.count += 1;
      map.set(name, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        count: v.count,
        average: Math.round((v.total / v.count) * 10) / 10,
      }))
      .sort((a, b) => b.average - a.average);
  }, [reviews]);

  const ratingDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 => 1 star ... index 4 => 5 stars
    for (const r of reviews) {
      const idx = Math.min(Math.max(Math.round(Number(r.rating) || 0), 1), 5) - 1;
      counts[idx] += 1;
    }
    return counts.map((count, i) => ({ stars: i + 1, count }));
  }, [reviews]);

  const topRated = productRatings.length > 0 ? productRatings[0] : null;
  const lowestRated =
    productRatings.length > 0 ? productRatings[productRatings.length - 1] : null;
  const maxDistCount = ratingDistribution.reduce((max, d) => Math.max(max, d.count), 0) || 1;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: Layout.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    scrollContent: {
      padding: Layout.spacing.lg,
      paddingBottom: Layout.spacing.xxl,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Layout.spacing.md,
    },
    gridItem: {
      flexGrow: 1,
      flexBasis: '45%',
      minWidth: 0,
    },
    skeletonStack: {
      gap: Layout.spacing.md,
    },
    actionTile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.md,
      minHeight: Layout.touchTarget + 24,
    },
    actionIconWell: {
      width: 44,
      height: 44,
      borderRadius: Layout.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      flex: 1,
      flexShrink: 1,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
    },
    sectionSpacer: {
      marginTop: Layout.spacing.xl,
    },
    // ---- Analytics styles ----
    analyticsCard: {
      marginBottom: Layout.spacing.md,
      gap: Layout.spacing.md,
    },
    thinCard: {
      marginBottom: Layout.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
    },
    cardHeading: {
      fontSize: Typography.fontSize.md,
      lineHeight: Typography.leading.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
      marginBottom: Layout.spacing.sm,
      marginTop: Layout.spacing.sm,
    },
    summaryTitle: {
      fontSize: Typography.fontSize.md,
      lineHeight: Typography.leading.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
    },
    topRatedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
      backgroundColor: colors.tintAmber,
      borderRadius: Layout.borderRadius.md,
      paddingHorizontal: Layout.spacing.md,
      paddingVertical: Layout.spacing.sm,
    },
    topRatedText: {
      flex: 1,
      flexShrink: 1,
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.accent,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Layout.spacing.md,
    },
    summaryItem: {
      flexGrow: 1,
      flexBasis: '45%',
      minWidth: 0,
    },
    summaryValue: {
      fontSize: Typography.fontSize.xl,
      lineHeight: Typography.leading.xl,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.primary,
    },
    summaryLabel: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    avgRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
    },
    avgValue: {
      fontSize: Typography.fontSize.xxl,
      lineHeight: Typography.leading.xxl,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.text,
    },
    avgCount: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
      flexWrap: 'wrap',
    },
    badgeText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.accent,
    },
    badgeName: {
      flexShrink: 1,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
    },
    productRatingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
      paddingVertical: Layout.spacing.xs,
    },
    productName: {
      flex: 1,
      flexShrink: 1,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
    },
    productCount: {
      fontSize: Typography.fontSize.xs,
      color: colors.muted,
    },
    distRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
      marginBottom: Layout.spacing.xs + 2,
    },
    distLabel: {
      width: 52,
      fontSize: Typography.fontSize.xs,
      color: colors.text,
      fontWeight: Typography.fontWeight.medium,
    },
    distTrack: {
      flex: 1,
      height: 10,
      borderRadius: Layout.borderRadius.full,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    distFill: {
      height: '100%',
      borderRadius: Layout.borderRadius.full,
    },
    distCount: {
      width: 28,
      textAlign: 'right',
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
    },
    reviewCard: {
      marginBottom: Layout.spacing.md,
    },
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Layout.spacing.sm,
    },
    reviewerName: {
      flexShrink: 1,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
    },
    reviewDate: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.muted,
    },
    reviewProduct: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.primary,
      fontWeight: Typography.fontWeight.semibold,
      marginTop: 2,
    },
    reviewRating: {
      marginTop: Layout.spacing.sm,
    },
    reviewComment: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.textSecondary,
      marginTop: Layout.spacing.sm,
    },
  }), [colors]);

  useEffect(() => {
    validateRoleAndLoad();
    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushToken(token);
    });
  }, []);

  const validateRoleAndLoad = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const token = await AsyncStorage.getItem('token');
      if (!userData || !token) {
        router.replace('/auth/login');
        return;
      }
      const user = JSON.parse(userData);
      if (user?.role !== 'farmer') {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
        return;
      }
      setUserName(user?.name || 'Farmer');
      fetchStats();
    } catch (error) {
      logApiError('Farmer role validation', error);
      router.replace('/auth/login');
    }
  };

  const fetchStats = async () => {
    try {
      const [productsRes, ordersRes, reviewsRes] = await Promise.all([
        api.get('/products/farmer/my-products'),
        api.get('/orders/farmer'),
        api.get('/reviews/farmer'),
      ]);

      if (productsRes.data.success) {
        setProductsCount(Array.isArray(productsRes.data.products) ? productsRes.data.products.length : 0);
      }
      if (ordersRes.data.success) {
        setOrdersCount(Array.isArray(ordersRes.data.orders) ? ordersRes.data.orders.length : 0);
      }
      if (reviewsRes.data.success) {
        setAverageRating(Number(reviewsRes.data.averageRating) || 0);
        setTotalReviews(Number(reviewsRes.data.totalReviews) || 0);
        setReviews(Array.isArray(reviewsRes.data.reviews) ? reviewsRes.data.reviews : []);
      }
    } catch (error) {
      logApiError('Farmer stats', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
      } catch (error) {
        logApiError('Farmer logout', error);
      }
    };

    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Are you sure you want to logout?');
      if (confirmLogout) {
        performLogout();
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Welcome, ${userName}!`}
        subtitle="Farmer"
        align="left"
        actions={
          <>
            <ThemeToggle />
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.headerIconButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <Ionicons name="log-out-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <SectionHeader title="Your farm at a glance" subtitle="Live numbers from your listings" />

        {statsLoading ? (
          <View style={styles.skeletonStack}>
            <StatRowSkeleton />
            <StatRowSkeleton />
          </View>
        ) : (
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <StatCard
                icon="cube-outline"
                value={productsCount}
                label="Products Listed"
                accent={colors.primary}
                tint={colors.primarySoft}
              />
            </View>
            <View style={styles.gridItem}>
              <StatCard
                icon="receipt-outline"
                value={ordersCount}
                label="Total Orders"
                accent={colors.info}
                tint={colors.tintBlue}
              />
            </View>
            <View style={styles.gridItem}>
              <StatCard
                icon="star-outline"
                value={averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
                label="Average Rating"
                accent={colors.star}
                tint={colors.tintAmber}
              />
            </View>
            <View style={styles.gridItem}>
              <StatCard
                icon="chatbubble-ellipses-outline"
                value={totalReviews}
                label={`Review${totalReviews !== 1 ? 's' : ''}`}
                accent={colors.secondary}
                tint={colors.tintPurple}
              />
            </View>
          </View>
        )}

        <View style={styles.sectionSpacer}>
          <SectionHeader title="Quick actions" />
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Card onPress={() => router.push('/farmer/add-product')} style={styles.actionTile}>
                <View style={[styles.actionIconWell, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel} numberOfLines={2}>
                  Add New Product
                </Text>
              </Card>
            </View>
            <View style={styles.gridItem}>
              <Card onPress={() => router.push('/farmer/products')} style={styles.actionTile}>
                <View style={[styles.actionIconWell, { backgroundColor: colors.tintBlue }]}>
                  <Ionicons name="list-outline" size={22} color={colors.info} />
                </View>
                <Text style={styles.actionLabel} numberOfLines={2}>
                  View Products
                </Text>
              </Card>
            </View>
            <View style={styles.gridItem}>
              <Card onPress={() => router.push('/farmer/orders')} style={styles.actionTile}>
                <View style={[styles.actionIconWell, { backgroundColor: colors.tintAmber }]}>
                  <Ionicons name="receipt-outline" size={22} color={colors.warning} />
                </View>
                <Text style={styles.actionLabel} numberOfLines={2}>
                  Manage Orders
                </Text>
              </Card>
            </View>
          </View>
        </View>

        {/* Farmer Review Analytics Section */}
        <View style={styles.sectionSpacer}>
          <SectionHeader
            title="Review Analytics"
            subtitle={`${totalReviews} review${totalReviews !== 1 ? 's' : ''} from your buyers`}
          />

          {reviews.length === 0 ? (
            <EmptyState
              compact
              icon="chatbubble-ellipses-outline"
              title="No reviews received yet."
              description="Ratings left by buyers on your produce will show up here."
            />
          ) : (
            <>
              {/* Review Summary Card */}
              <Card style={styles.analyticsCard}>
                <Text style={styles.summaryTitle}>Review Summary</Text>

                {topRated && (
                  <View style={styles.topRatedBanner}>
                    <Ionicons name="trophy" size={18} color={colors.accent} />
                    <Text style={styles.topRatedText} numberOfLines={1}>
                      Top Rated: {topRated.name} ★ {topRated.average.toFixed(1)}
                    </Text>
                  </View>
                )}

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{totalReviews}</Text>
                    <Text style={styles.summaryLabel}>Total Reviews</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{averageRating.toFixed(1)}</Text>
                    <Text style={styles.summaryLabel}>Average Rating</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { fontSize: Typography.fontSize.md, lineHeight: Typography.leading.md }]} numberOfLines={1}>
                      {topRated ? topRated.name : '—'}
                    </Text>
                    <Text style={styles.summaryLabel}>Highest Rated Product</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { fontSize: Typography.fontSize.md, lineHeight: Typography.leading.md }]} numberOfLines={1}>
                      {lowestRated ? lowestRated.name : '—'}
                    </Text>
                    <Text style={styles.summaryLabel}>Lowest Rated Product</Text>
                  </View>
                </View>
              </Card>

              {/* Average farmer rating */}
              <Card style={styles.thinCard}>
                <View style={styles.avgRow}>
                  <Rating value={averageRating} size={20} expanded showValue={false} />
                  <Text style={styles.avgValue}>{averageRating.toFixed(1)}</Text>
                  <Text style={styles.avgCount}>({totalReviews})</Text>
                </View>
              </Card>

              {/* Top Rated Product badge */}
              {topRated && (
                <Card style={[styles.thinCard, { backgroundColor: colors.tintAmber }]}>
                  <View style={styles.badgeRow}>
                    <Ionicons name="trophy" size={20} color={colors.accent} />
                    <Text style={styles.badgeText}>🏆 Top Rated Product</Text>
                    <Text style={styles.badgeName} numberOfLines={1}>
                      {topRated.name}
                    </Text>
                    <Rating value={topRated.average} size={14} />
                  </View>
                </Card>
              )}

              {/* Product-wise ratings (highest rated first) */}
              <Card style={styles.analyticsCard}>
                <Text style={styles.cardHeading}>Product-wise Ratings</Text>
                {productRatings.map((p) => (
                  <View key={p.name} style={styles.productRatingRow}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Rating value={p.average} size={13} showValue={false} expanded />
                      <Text style={styles.productCount}>({p.count})</Text>
                    </View>
                  </View>
                ))}
              </Card>

              {/* Rating distribution with bars */}
              <Card style={styles.analyticsCard}>
                <Text style={styles.cardHeading}>Rating Distribution</Text>
                {ratingDistribution.map((d) => {
                  const widthPct = Math.round((d.count / maxDistCount) * 100);
                  return (
                    <View key={d.stars} style={styles.distRow}>
                      <Text style={styles.distLabel}>{'★'.repeat(d.stars)}</Text>
                      <View style={styles.distTrack}>
                        {d.count > 0 && (
                          <View
                            style={[
                              styles.distFill,
                              { width: `${widthPct}%` as `${number}%`, backgroundColor: colors.star },
                            ]}
                          />
                        )}
                      </View>
                      <Text style={styles.distCount}>{d.count}</Text>
                    </View>
                  );
                })}
              </Card>

              {/* Recent reviews (newest first) */}
              <Text style={styles.cardHeading}>Recent Reviews</Text>
              {reviews.slice(0, 5).map((review) => (
              <Card key={review._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName} numberOfLines={1}>
                    {review.buyer?.name || 'Anonymous'}
                  </Text>
                  <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                </View>
                {review.product?.name && (
                  <Text style={styles.reviewProduct} numberOfLines={1}>
                    Product: {review.product.name}
                  </Text>
                )}
                <Rating
                  value={review.rating}
                  size={15}
                  showValue={false}
                  expanded
                  style={styles.reviewRating}
                />
                <Text style={styles.reviewComment} numberOfLines={3}>
                  {review.comment}
                </Text>
              </Card>
            ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
