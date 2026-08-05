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
import { AdminStatCardSkeleton } from '../../components/admin/AdminSkeleton';

interface DashboardCards {
  totalFarmers: number;
  totalBuyers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenue: number;
  blockchainTransactions: number;
  disputedOrders: number;
}

interface Activity {
  type: string;
  message: string;
  amount?: number;
  createdAt: string;
}

export default function AdminDashboard() {
  const colors = useColors();
  const [userName, setUserName] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<DashboardCards>({
    totalFarmers: 0,
    totalBuyers: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    revenue: 0,
    blockchainTransactions: 0,
    disputedOrders: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);

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
      borderWidth: 1,
      borderColor: colors.border,
    },
    welcomeText: {
      fontSize: Typography.fontSize.xxl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
      marginTop: Layout.spacing.md,
      marginBottom: Layout.spacing.sm,
    },
    roleBadge: {
      backgroundColor: colors.admin + '15',
      paddingHorizontal: Layout.spacing.md,
      paddingVertical: Layout.spacing.xs,
      borderRadius: Layout.borderRadius.md,
    },
    roleBadgeText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.admin,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
      marginBottom: Layout.spacing.md,
    },
    statCard: {
      width: '33.33%',
      padding: 4,
    },
    statInner: {
      borderRadius: Layout.borderRadius.lg,
      padding: Layout.spacing.md,
      alignItems: 'center',
      minHeight: 110,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    statNumber: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
      marginTop: Layout.spacing.xs,
    },
    statLabel: {
      fontSize: 10,
      color: colors.gray,
      marginTop: 2,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
      marginBottom: Layout.spacing.sm,
      marginTop: Layout.spacing.sm,
    },
    activityCard: {
      backgroundColor: colors.card,
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.md,
      marginBottom: Layout.spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    activityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    activityText: { color: colors.black, fontSize: 13, fontWeight: '600', flex: 1 },
    activityMeta: { color: colors.gray, fontSize: 11, marginTop: 2 },
    actionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Layout.spacing.sm,
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
    actionButtonPrimary: { backgroundColor: colors.admin },
    actionButtonSecondary: { backgroundColor: colors.primary },
    actionButtonTertiary: { backgroundColor: colors.secondary },
    actionButtonQuaternary: { backgroundColor: colors.primaryDark },
    actionButtonQuinary: { backgroundColor: '#7B1FA2' },
    actionButtonText: {
      color: colors.white,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      marginLeft: Layout.spacing.sm,
    },
    errorCard: {
      backgroundColor: '#FFEBEE',
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.md,
      marginBottom: Layout.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    errorText: {
      color: '#C62828',
      fontSize: Typography.fontSize.sm,
      flex: 1,
      marginLeft: Layout.spacing.sm,
    },
    viewAllButton: {
      alignSelf: 'flex-end',
      paddingVertical: Layout.spacing.xs,
      paddingHorizontal: Layout.spacing.sm,
    },
    viewAllText: {
      color: colors.admin,
      fontSize: Typography.fontSize.xs,
      fontWeight: '700',
    },
  }), [colors]);

  const validateRoleAndLoad = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const token = await AsyncStorage.getItem('token');
      if (!userData || !token) {
        router.replace('/auth/login');
        return;
      }
      // Detect stale hardcoded admin token from old login bypass
      if (token === 'admin-token-hardcoded') {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
        return;
      }
      const user = JSON.parse(userData);
      if (user.role !== 'admin') {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
        return;
      }
      setUserName(user.name || 'Admin');
      await fetchAnalytics();
    } catch (error) {
      console.error('Role validation error:', error);
      router.replace('/auth/login');
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/admin/analytics');
      if (res.data.success) {
        const analytics = res.data.analytics;
        const c = analytics.cards || {};
        setCards({
          totalFarmers: c.totalFarmers || 0,
          totalBuyers: c.totalBuyers || 0,
          totalProducts: c.totalProducts || 0,
          totalOrders: c.totalOrders || 0,
          pendingOrders: c.pendingOrders || 0,
          deliveredOrders: c.deliveredOrders || 0,
          cancelledOrders: c.cancelledOrders || 0,
          revenue: c.revenue || 0,
          blockchainTransactions: c.blockchainTransactions || 0,
          disputedOrders: c.disputedOrders || 0,
        });
        setActivities(analytics.latestActivities || []);
      }
    } catch (error) {
      console.error('Error fetching admin analytics:', error);
      setError('Failed to load dashboard data. Showing fallback data.');
      // Fallback to basic counts
      try {
        const [usersRes, productsRes, ordersRes] = await Promise.all([
          api.get('/users'),
          api.get('/products?all=true'),
          api.get('/orders'),
        ]);
        const users = usersRes.data.users || [];
        const orders = ordersRes.data.orders || [];
        setCards((prev) => ({
          ...prev,
          totalFarmers: users.filter((u: any) => u.role === 'farmer').length,
          totalBuyers: users.filter((u: any) => u.role === 'buyer').length,
          totalProducts: productsRes.data.products?.length || 0,
          totalOrders: orders.length,
          pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
          deliveredOrders: orders.filter((o: any) => o.status === 'delivered').length,
          cancelledOrders: orders.filter((o: any) => o.status === 'cancelled').length,
        }));
      } catch (e) {
        console.error(e);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    validateRoleAndLoad();
  }, [validateRoleAndLoad]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

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
      if (window.confirm('Are you sure you want to logout?')) performLogout();
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return { name: 'receipt-outline' as const, color: colors.secondary };
      case 'user':
        return { name: 'person-add-outline' as const, color: colors.primary };
      case 'blockchain':
        return { name: 'link-outline' as const, color: colors.info };
      case 'product':
        return { name: 'cube-outline' as const, color: colors.warning };
      default:
        return { name: 'notifications-outline' as const, color: colors.gray };
    }
  };

  const statItems = [
    { icon: 'people-outline' as const, value: cards.totalFarmers, label: 'Farmers', color: colors.primary, bgColor: colors.primary + '15' },
    { icon: 'person-outline' as const, value: cards.totalBuyers, label: 'Buyers', color: colors.secondary, bgColor: colors.secondary + '15' },
    { icon: 'cube-outline' as const, value: cards.totalProducts, label: 'Products', color: colors.admin, bgColor: colors.admin + '15' },
    { icon: 'receipt-outline' as const, value: cards.totalOrders, label: 'Orders', color: colors.warning, bgColor: colors.warning + '15' },
    { icon: 'time-outline' as const, value: cards.pendingOrders, label: 'Pending', color: '#EF6C00', bgColor: '#FFF3E0' },
    { icon: 'checkmark-done-outline' as const, value: cards.deliveredOrders, label: 'Delivered', color: '#2E7D32', bgColor: '#E8F5E9' },
    { icon: 'close-circle-outline' as const, value: cards.cancelledOrders, label: 'Cancelled', color: '#C62828', bgColor: '#FFEBEE' },
    { icon: 'cash-outline' as const, value: `₹${(cards.revenue / 1000).toFixed(1)}k`, label: 'Revenue', color: colors.success, bgColor: colors.success + '15' },
    { icon: 'link-outline' as const, value: cards.blockchainTransactions, label: 'Chain Tx', color: colors.info, bgColor: colors.info + '15' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={styles.headerActions}>
          <ThemeToggle />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={colors.admin} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />
        }
      >
        <View style={styles.welcomeCard}>
          <Ionicons name="shield-checkmark-outline" size={40} color={colors.admin} />
          <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Administrator</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color="#C62828" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <AdminStatCardSkeleton count={9} />
        ) : (
          <View style={styles.statsGrid}>
            {statItems.map((item) => (
              <View key={item.label} style={styles.statCard}>
                <View style={[styles.statInner, { backgroundColor: item.bgColor }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                  <Text style={[styles.statNumber, { color: item.color }]}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push('/admin/users')}
          >
            <Ionicons name="people-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/admin/products')}
          >
            <Ionicons name="cube-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Products</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonTertiary]}
            onPress={() => router.push('/admin/orders')}
          >
            <Ionicons name="receipt-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonQuaternary]}
            onPress={() => router.push('/admin/analytics')}
          >
            <Ionicons name="bar-chart-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonQuinary]}
            onPress={() => router.push('/admin/disputes')}
          >
            <Ionicons name="warning-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Disputes</Text>
            {cards.disputedOrders > 0 && (
              <View style={{
                backgroundColor: '#FFEBEE',
                borderRadius: 10,
                paddingHorizontal: 6,
                paddingVertical: 2,
                marginLeft: 6,
              }}>
                <Text style={{ color: '#C62828', fontSize: 10, fontWeight: '700' }}>
                  {cards.disputedOrders}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.gray }]}
            onPress={() => router.push('/admin/settings')}
          >
            <Ionicons name="settings-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Latest Activities</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/admin/analytics')}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {activities.slice(0, 8).map((a, idx) => {
          const icon = getActivityIcon(a.type);
          return (
            <View key={idx} style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name={icon.name} size={16} color={icon.color} style={{ marginRight: 6 }} />
                  <Text style={styles.activityText} numberOfLines={1}>{a.message}</Text>
                </View>
                {a.amount !== undefined && (
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                    ₹{a.amount}
                  </Text>
                )}
              </View>
              <Text style={styles.activityMeta}>
                {a.type} · {new Date(a.createdAt).toLocaleString()}
              </Text>
            </View>
          );
        })}
        {activities.length === 0 && !loading && (
          <View style={styles.activityCard}>
            <Text style={styles.activityMeta}>No recent activity</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}