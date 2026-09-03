import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import {
  ScreenHeader,
  Card,
  Badge,
  StatCard,
  SectionHeader,
  ErrorState,
  ListSkeleton,
  StatRowSkeleton,
  LanguageSelector,
} from '../../components/ui';

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

/** Splits the stat tiles into rows of two so the grid never overflows. */
const chunkPairs = <T,>(items: T[]): T[][] => {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
};

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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.xs,
    },
    logoutButton: {
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
    welcomeCard: {
      alignItems: 'center',
      paddingVertical: Layout.spacing.xl,
      marginBottom: Layout.spacing.lg,
    },
    welcomeIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeText: {
      fontSize: Typography.fontSize.xxl,
      lineHeight: Typography.leading.xxl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
      marginTop: Layout.spacing.md,
      marginBottom: Layout.spacing.sm,
      textAlign: 'center',
    },
    statsBlock: {
      marginBottom: Layout.spacing.lg,
      gap: Layout.spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      gap: Layout.spacing.md,
    },
    statSpacer: {
      flex: 1,
    },
    errorBlock: {
      marginBottom: Layout.spacing.lg,
    },
    navList: {
      gap: Layout.spacing.sm + 2,
      marginBottom: Layout.spacing.xl,
    },
    navCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.md,
      minHeight: Layout.touchTarget + 12,
    },
    navIcon: {
      width: 44,
      height: 44,
      borderRadius: Layout.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitle: {
      fontSize: Typography.fontSize.md,
      lineHeight: Typography.leading.md,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
      flex: 1,
      flexShrink: 1,
    },
    activityCard: {
      marginBottom: Layout.spacing.sm + 2,
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.md,
    },
    activityIcon: {
      width: 38,
      height: 38,
      borderRadius: Layout.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityText: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
    },
    activityMeta: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    activityAmount: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
      flexShrink: 0,
    },
    emptyActivity: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.textSecondary,
      textAlign: 'center',
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
      if (token === 'admin-token-hardcoded' || token === 'admin-local-token') {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
        return;
      }
      const user = JSON.parse(userData);
      if (user?.role !== 'admin') {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
        return;
      }
      setUserName(user?.name || 'Admin');
      await fetchAnalytics();
    } catch (error) {
      logApiError('Admin role validation', error);
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
      logApiError('Admin fetch analytics', error);
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
        logApiError('Admin analytics fallback', e);
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
        logApiError('Admin logout', error);
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
    { icon: 'people-outline' as const, value: cards.totalFarmers, label: 'Farmers', color: colors.primary, bgColor: colors.primarySoft },
    { icon: 'person-outline' as const, value: cards.totalBuyers, label: 'Buyers', color: colors.secondary, bgColor: colors.secondarySoft },
    { icon: 'cube-outline' as const, value: cards.totalProducts, label: 'Products', color: colors.info, bgColor: colors.tintBlue },
    { icon: 'receipt-outline' as const, value: cards.totalOrders, label: 'Orders', color: colors.accent, bgColor: colors.tintAmber },
    { icon: 'time-outline' as const, value: cards.pendingOrders, label: 'Pending', color: colors.warning, bgColor: colors.warningSoft },
    { icon: 'checkmark-done-outline' as const, value: cards.deliveredOrders, label: 'Delivered', color: colors.success, bgColor: colors.successSoft },
    { icon: 'close-circle-outline' as const, value: cards.cancelledOrders, label: 'Cancelled', color: colors.error, bgColor: colors.errorSoft },
    { icon: 'cash-outline' as const, value: `₹${(cards.revenue / 1000).toFixed(1)}k`, label: 'Revenue', color: colors.primaryDark, bgColor: colors.tintGreen },
    { icon: 'link-outline' as const, value: cards.blockchainTransactions, label: 'Chain Tx', color: colors.info, bgColor: colors.tintSky },
  ];

  const statRows = chunkPairs(statItems);

  const navItems = [
    {
      icon: 'people-outline' as const,
      label: 'Users',
      route: '/admin/users' as const,
      accent: colors.primary,
      tint: colors.primarySoft,
      badge: 0,
    },
    {
      icon: 'cube-outline' as const,
      label: 'Products',
      route: '/admin/products' as const,
      accent: colors.secondary,
      tint: colors.secondarySoft,
      badge: 0,
    },
    {
      icon: 'receipt-outline' as const,
      label: 'Orders',
      route: '/admin/orders' as const,
      accent: colors.accent,
      tint: colors.tintAmber,
      badge: cards.pendingOrders,
    },
    {
      icon: 'bar-chart-outline' as const,
      label: 'Analytics',
      route: '/admin/analytics' as const,
      accent: colors.info,
      tint: colors.tintBlue,
      badge: 0,
    },
    {
      icon: 'warning-outline' as const,
      label: 'Disputes',
      route: '/admin/disputes' as const,
      accent: colors.error,
      tint: colors.errorSoft,
      badge: cards.disputedOrders,
    },
    {
      icon: 'settings-outline' as const,
      label: 'Settings',
      route: '/admin/settings' as const,
      accent: colors.admin,
      tint: colors.lighterGray,
      badge: 0,
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Admin Dashboard"
        align="left"
        actions={
          <View style={styles.headerActions}>
            <LanguageSelector />
            <ThemeToggle />
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <Ionicons name="log-out-outline" size={20} color={colors.admin} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />
        }
      >
        <Card style={styles.welcomeCard} elevation="sm">
          <View style={styles.welcomeIcon}>
            <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.welcomeText} numberOfLines={2}>
            Welcome, {userName}!
          </Text>
          <Badge label="Administrator" tone="primary" size="md" icon="ribbon-outline" />
        </Card>

        {error && (
          <View style={styles.errorBlock}>
            <ErrorState
              compact
              icon="alert-circle-outline"
              title="Live data unavailable"
              message={error}
              onRetry={fetchAnalytics}
            />
          </View>
        )}

        <SectionHeader title="Overview" subtitle="Marketplace at a glance" />

        {loading ? (
          <View style={styles.statsBlock}>
            {[0, 1, 2, 3, 4].map((key) => (
              <StatRowSkeleton key={key} count={2} />
            ))}
          </View>
        ) : (
          <View style={styles.statsBlock}>
            {statRows.map((row, rowIdx) => (
              <View key={`stat-row-${rowIdx}`} style={styles.statsRow}>
                {row.map((item) => (
                  <StatCard
                    key={item.label}
                    icon={item.icon}
                    value={item.value}
                    label={item.label}
                    accent={item.color}
                    tint={item.bgColor}
                  />
                ))}
                {row.length === 1 && <View style={styles.statSpacer} />}
              </View>
            ))}
          </View>
        )}

        <SectionHeader title="Management" subtitle="Jump into a section" />

        <View style={styles.navList}>
          {navItems.map((item) => (
            <Card key={item.label} onPress={() => router.push(item.route as any)} elevation="xs">
              <View style={styles.navCard}>
                <View style={[styles.navIcon, { backgroundColor: item.tint }]}>
                  <Ionicons name={item.icon} size={22} color={item.accent} />
                </View>
                <Text style={styles.navTitle} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.badge > 0 && (
                  <Badge
                    label={String(item.badge)}
                    tone={item.label === 'Disputes' ? 'error' : 'warning'}
                  />
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </View>
            </Card>
          ))}
        </View>

        <SectionHeader
          title="Latest Activities"
          actionLabel="View All"
          onAction={() => router.push('/admin/analytics')}
        />

        {loading ? (
          <ListSkeleton count={3} />
        ) : (
          <>
            {activities.slice(0, 8).map((a, idx) => {
              const icon = getActivityIcon(a.type);
              return (
                <Card key={idx} style={styles.activityCard} elevation="xs">
                  <View style={styles.activityRow}>
                    <View style={[styles.activityIcon, { backgroundColor: colors.surfaceAlt }]}>
                      <Ionicons name={icon.name} size={18} color={icon.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.activityText} numberOfLines={2}>
                        {a.message}
                      </Text>
                      <Text style={styles.activityMeta} numberOfLines={1}>
                        {a.type} · {new Date(a.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    {a.amount !== undefined && (
                      <Text style={styles.activityAmount}>₹{a.amount}</Text>
                    )}
                  </View>
                </Card>
              );
            })}
            {activities.length === 0 && (
              <Card style={styles.activityCard} elevation="xs">
                <Text style={styles.emptyActivity}>No recent activity</Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
