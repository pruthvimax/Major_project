import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
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

export default function FarmerDashboard() {
  const colors = useColors();
  const [userName, setUserName] = useState('Farmer');
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);

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
        router.replace('/(auth)/login');
        return;
      }
      const user = JSON.parse(userData);
      if (user.role !== 'farmer') {
        // Stale session — role mismatch, redirect to login
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/(auth)/login');
        return;
      }
      setUserName(user.name || 'Farmer');
      fetchStats();
    } catch (error) {
      console.error('Role validation error:', error);
      router.replace('/(auth)/login');
    }
  };

  const fetchStats = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/products/farmer/my-products'),
        api.get('/orders/farmer'),
      ]);

      if (productsRes.data.success) {
        setProductsCount(productsRes.data.products.length);
      }
      if (ordersRes.data.success) {
        setOrdersCount(ordersRes.data.orders.length);
      }
    } catch (error) {
      console.error('Error fetching farmer stats:', error);
    }
  };

  const getUserName = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'Farmer');
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            onPress={() => router.push('/(farmer)/add-product')}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.white} />
            <Text style={styles.actionButtonText}>Add New Product</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/(farmer)/products')}
          >
            <Ionicons name="list-outline" size={24} color={colors.white} />
            <Text style={styles.actionButtonText}>View Products</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionContainer, { marginTop: Layout.spacing.lg }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push('/(farmer)/orders')}
          >
            <Ionicons name="receipt-outline" size={24} color={colors.white} />
            <Text style={styles.actionButtonText}>Manage Orders</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}