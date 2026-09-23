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
  LanguageSelector,
  ReviewAnalytics,
  type FarmerReview,
} from '../../components/ui';
import { friendlyError } from '../../components/ui/ErrorState';

export default function FarmerDashboard() {
  const colors = useColors();
  const [userName, setUserName] = useState('Farmer');
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviews, setReviews] = useState<FarmerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

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
    gridItemWide: {
      flexBasis: '100%',
    },
    schemeTileText: {
      flex: 1,
      minWidth: 0,
    },
    schemeTileSub: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
      marginTop: 2,
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

  const fetchReviews = async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const reviewsRes = await api.get('/reviews/farmer');
      if (reviewsRes.data?.success) {
        setAverageRating(Number(reviewsRes.data.averageRating) || 0);
        setTotalReviews(Number(reviewsRes.data.totalReviews) || 0);
        setReviews(Array.isArray(reviewsRes.data.reviews) ? reviewsRes.data.reviews : []);
      } else {
        setReviewsError(friendlyError(reviewsRes.data?.message, 'We could not load your reviews right now.'));
      }
    } catch (error) {
      logApiError('Farmer reviews', error);
      setReviewsError(friendlyError(error, 'We could not load your reviews right now.'));
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Reviews load independently so a review-API failure never hides
      // products / orders, and the analytics section can retry on its own.
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/products/farmer/my-products'),
        api.get('/orders/farmer'),
        fetchReviews(),
      ]);

      if (productsRes.data.success) {
        setProductsCount(Array.isArray(productsRes.data.products) ? productsRes.data.products.length : 0);
      }
      if (ordersRes.data.success) {
        setOrdersCount(Array.isArray(ordersRes.data.orders) ? ordersRes.data.orders.length : 0);
      }
    } catch (error) {
      logApiError('Farmer stats', error);
    } finally {
      setStatsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <LanguageSelector />
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
          </View>
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
            <View style={styles.gridItem}>
              <Card onPress={() => router.push('/farmer/transactions')} style={styles.actionTile}>
                <View style={[styles.actionIconWell, { backgroundColor: colors.secondarySoft }]}>
                  <Ionicons name="link-outline" size={22} color={colors.secondary} />
                </View>
                <Text style={styles.actionLabel} numberOfLines={2}>
                  Blockchain Transactions
                </Text>
              </Card>
            </View>
            {/* Government Schemes — subsidies, insurance & benefits (see app/farmer/schemes.tsx) */}
            <View style={[styles.gridItem, styles.gridItemWide]}>
              <Card onPress={() => router.push('/farmer/schemes' as any)} style={styles.actionTile}>
                <View style={[styles.actionIconWell, { backgroundColor: colors.tintGreen }]}>
                  <Ionicons name="ribbon-outline" size={22} color={colors.primaryDark} />
                </View>
                <View style={styles.schemeTileText}>
                  <Text style={styles.actionLabel} numberOfLines={1}>
                    🌾 Government Schemes
                  </Text>
                  <Text style={styles.schemeTileSub} numberOfLines={1}>
                    Subsidies, crop insurance & benefits
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            </View>
          </View>
        </View>

        {/* Farmer Rating Analytics — computed from GET /reviews/farmer */}
        <View style={styles.sectionSpacer}>
          <SectionHeader
            title="Rating Analytics"
            subtitle={
              reviewsLoading || reviewsError
                ? 'How buyers rate your produce'
                : `${totalReviews} review${totalReviews !== 1 ? 's' : ''} from your buyers`
            }
          />
          <ReviewAnalytics
            reviews={reviews}
            averageRating={averageRating}
            totalReviews={totalReviews}
            loading={reviewsLoading}
            error={reviewsError}
            onRetry={fetchReviews}
          />
        </View>
      </ScrollView>
    </View>
  );
}
