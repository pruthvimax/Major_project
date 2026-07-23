import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';
import { StatCardSkeleton } from '../../components/SkeletonLoader';

export default function AdminDashboard() {
  const colors = useColors();
  const [userName, setUserName] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState({
    totalFarmers: 0,
    totalBuyers: 0,
    totalProducts: 0,
    totalOrders: 0,
    revenue: 0,
    blockchainTransactions: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);

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
    activityText: { color: colors.black, fontSize: 13, fontWeight: '600' },
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
    actionButtonText: {
      color: colors.white,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      marginLeft: Layout.spacing.sm,
    },
  }), [colors]);

  useEffect(() => {
    validateRoleAndLoad();
  }, []);

  const validateRoleAndLoad = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const token = await AsyncStorage.getItem('token');
      if (!userData || !token) {
        router.replace('/(auth)/login');
        return;
      }
      const user = JSON.parse(userData);
      if (user.role !== 'admin') {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/(auth)/login');
        return;
      }
      setUserName(user.name || 'Admin');
      fetchAnalytics();
    } catch (error) {
      console.error('Role validation error:', error);
      router.replace('/(auth)/login');
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/analytics');
      if (res.data.success) {
        setCards(res.data.analytics.cards);
        setActivities(res.data.analytics.latestActivities || []);
      }
    } catch (error) {
      console.error('Error fetching admin analytics:', error);
      // Fallback to basic counts
      try {
        const [usersRes, productsRes, ordersRes] = await Promise.all([
          api.get('/users'),
          api.get('/products?all=true'),
          api.get('/orders'),
        ]);
        const users = usersRes.data.users || [];
        setCards((prev) => ({
          ...prev,
          totalFarmers: users.filter((u: any) => u.role === 'farmer').length,
          totalBuyers: users.filter((u: any) => u.role === 'buyer').length,
          totalProducts: productsRes.data.products?.length || 0,
          totalOrders: ordersRes.data.orders?.length || 0,
        }));
      } catch (e) {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  const getUserName = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'Admin');
      }
    } catch (error) {
      console.error('Error getting user name:', error);
    }
  };

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/(auth)/login');
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

  const statItems = [
    { icon: 'people-outline' as const, value: cards.totalFarmers, label: 'Farmers', color: colors.primary, bgColor: colors.primary + '15' },
    { icon: 'person-outline' as const, value: cards.totalBuyers, label: 'Buyers', color: colors.secondary, bgColor: colors.secondary + '15' },
    { icon: 'cube-outline' as const, value: cards.totalProducts, label: 'Products', color: colors.admin, bgColor: colors.admin + '15' },
    { icon: 'receipt-outline' as const, value: cards.totalOrders, label: 'Orders', color: colors.warning, bgColor: colors.warning + '15' },
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeCard}>
          <Ionicons name="shield-checkmark-outline" size={40} color={colors.admin} />
          <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Administrator</Text>
          </View>
        </View>

        {loading ? (
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </View>
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

        <Text style={styles.sectionTitle}>Latest Activities</Text>
        {activities.slice(0, 5).map((a, idx) => (
          <View key={idx} style={styles.activityCard}>
            <Text style={styles.activityText}>{a.message}</Text>
            <Text style={styles.activityMeta}>
              {a.type} · {new Date(a.createdAt).toLocaleString()}
            </Text>
          </View>
        ))}
        {activities.length === 0 && !loading && (
          <Text style={styles.activityMeta}>No recent activity</Text>
        )}

        <View style={[styles.actionContainer, { marginTop: 16 }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push('/(admin)/users')}
          >
            <Ionicons name="people-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/(admin)/products')}
          >
            <Ionicons name="cube-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Products</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonTertiary]}
            onPress={() => router.push('/(admin)/orders')}
          >
            <Ionicons name="receipt-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonQuaternary]}
            onPress={() => router.push('/(admin)/analytics')}
          >
            <Ionicons name="bar-chart-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.gray }]}
            onPress={() => router.push('/(admin)/settings')}
          >
            <Ionicons name="settings-outline" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
