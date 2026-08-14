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
      if (user.role !== 'farmer') {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
        return;
      }
      setUserName(user.name || 'Farmer');
      fetchStats();
    } catch (error) {
      console.error('Role validation error:', error);
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
        setProductsCount(productsRes.data.products.length);
      }
      if (ordersRes.data.success) {
        setOrdersCount(ordersRes.data.orders.length);
      }
      if (reviewsRes.data.success) {
        setAverageRating(reviewsRes.data.averageRating || 0);
        setTotalReviews(reviewsRes.data.totalReviews || 0);
        setReviews(reviewsRes.data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching farmer stats:', error);
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
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
      } catch (error) {
        console.error('Logout error:', error);
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

        {/* Reviews & Ratings Section */}
        <View style={styles.sectionSpacer}>
          <SectionHeader
            title="Reviews & Ratings"
            subtitle={`${totalReviews} review${totalReviews !== 1 ? 's' : ''} from your buyers`}
          />

          {reviews.length > 0 ? (
            reviews.slice(0, 5).map((review) => (
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
            ))
          ) : (
            <EmptyState
              compact
              icon="chatbubble-ellipses-outline"
              title="No reviews yet."
              description="Ratings left by buyers on your produce will show up here."
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
