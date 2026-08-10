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

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Layout.spacing.xl,
      paddingTop: Layout.spacing.xxl * 2,
      paddingBottom: Layout.spacing.lg,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
    },
    logoutButton: {
      padding: Layout.spacing.sm,
    },
    scrollContent: {
      padding: Layout.spacing.lg,
      paddingBottom: Layout.spacing.xxl,
    },
    welcomeCard: {
      backgroundColor: colors.card,
      borderRadius: Layout.borderRadius.lg,
      padding: Layout.spacing.xl,
      alignItems: 'center',
      marginBottom: Layout.spacing.lg,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    welcomeText: {
      fontSize: Typography.fontSize.xxl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
      marginTop: Layout.spacing.md,
      marginBottom: Layout.spacing.sm,
    },
    roleBadge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: Layout.spacing.md,
      paddingVertical: Layout.spacing.xs,
      borderRadius: Layout.borderRadius.md,
    },
    roleBadgeText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primary,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Layout.spacing.lg,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.primary + '10',
      borderRadius: Layout.borderRadius.lg,
      padding: Layout.spacing.lg,
      alignItems: 'center',
      marginHorizontal: Layout.spacing.xs,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    statNumber: {
      fontSize: Typography.fontSize.xxl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
      marginTop: Layout.spacing.sm,
    },
    statLabel: {
      fontSize: Typography.fontSize.sm,
      color: colors.gray,
      marginTop: Layout.spacing.xs,
    },
    actionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    actionButton: {
      flex: 1,
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.md,
      alignItems: 'center',
      marginHorizontal: Layout.spacing.xs,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    actionButtonPrimary: {
      backgroundColor: colors.primary,
    },
    actionButtonSecondary: {
      backgroundColor: colors.primaryDark,
    },
    actionButtonText: {
      color: colors.white,
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.semibold,
      marginLeft: Layout.spacing.sm,
    },
    sectionTitle: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
      marginBottom: Layout.spacing.sm,
      marginTop: Layout.spacing.lg,
    },
    ratingCard: {
      backgroundColor: colors.card,
      borderRadius: Layout.borderRadius.lg,
      padding: Layout.spacing.lg,
      alignItems: 'center',
      marginBottom: Layout.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bigRating: {
      fontSize: Typography.fontSize.xxxl,
      fontWeight: Typography.fontWeight.bold,
      color: '#FFD700',
    },
    ratingLabel: {
      fontSize: Typography.fontSize.sm,
      color: colors.gray,
      marginTop: 4,
    },
    starsRow: {
      flexDirection: 'row',
      marginVertical: 4,
    },
    reviewCard: {
      backgroundColor: colors.card,
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.md,
      marginBottom: Layout.spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    reviewerName: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
    },
    reviewDate: {
      fontSize: Typography.fontSize.xs,
      color: colors.gray,
    },
    reviewProduct: {
      fontSize: Typography.fontSize.xs,
      color: colors.primary,
      fontWeight: '600',
      marginBottom: 4,
    },
    reviewComment: {
      fontSize: Typography.fontSize.sm,
      color: colors.gray,
      lineHeight: 18,
    },
    emptyText: {
      fontSize: Typography.fontSize.sm,
      color: colors.gray,
      textAlign: 'center',
      padding: Layout.spacing.md,
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
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color="#FFD700"
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Farm Dashboard</Text>
        <View style={styles.headerActions}>
          <ThemeToggle />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.welcomeCard}>
          <Ionicons name="leaf-outline" size={40} color={colors.primary} />
          <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Farmer</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={32} color={colors.primary} />
            <Text style={styles.statNumber}>{productsCount}</Text>
            <Text style={styles.statLabel}>Products Listed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="receipt-outline" size={32} color={colors.primary} />
            <Text style={styles.statNumber}>{ordersCount}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push('/farmer/add-product')}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.white} />
            <Text style={styles.actionButtonText}>Add New Product</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/farmer/products')}
          >
            <Ionicons name="list-outline" size={24} color={colors.white} />
            <Text style={styles.actionButtonText}>View Products</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionContainer, { marginTop: Layout.spacing.lg }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push('/farmer/orders')}
          >
            <Ionicons name="receipt-outline" size={24} color={colors.white} />
            <Text style={styles.actionButtonText}>Manage Orders</Text>
          </TouchableOpacity>
        </View>

        {/* Reviews & Ratings Section */}
        <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
        <View style={styles.ratingCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.bigRating}>{averageRating > 0 ? averageRating.toFixed(1) : '0.0'}</Text>
            <View style={{ marginLeft: Layout.spacing.md }}>
              {renderStars(Math.round(averageRating))}
              <Text style={styles.ratingLabel}>{totalReviews} review{totalReviews !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>

        {reviews.length > 0 ? (
          reviews.slice(0, 5).map((review) => (
            <View key={review._id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{review.buyer?.name || 'Anonymous'}</Text>
                <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
              </View>
              {review.product?.name && (
                <Text style={styles.reviewProduct}>Product: {review.product.name}</Text>
              )}
              {renderStars(review.rating)}
              <Text style={styles.reviewComment} numberOfLines={3}>{review.comment}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No reviews yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}