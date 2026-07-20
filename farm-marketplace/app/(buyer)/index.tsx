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

export default function BuyerDashboard() {
  const colors = useColors();
  const [userName, setUserName] = useState('Buyer');
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
      backgroundColor: colors.secondary + '15',
      paddingHorizontal: Layout.spacing.md,
      paddingVertical: Layout.spacing.xs,
      borderRadius: Layout.borderRadius.md,
    },
    roleBadgeText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.secondary,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Layout.spacing.lg,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: Layout.borderRadius.lg,
      padding: Layout.spacing.lg,
      alignItems: 'center',
      marginHorizontal: Layout.spacing.xs,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    statNumber: {
      fontSize: Typography.fontSize.xxl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
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
      backgroundColor: colors.secondary,
    },
    actionButtonSecondary: {
      backgroundColor: colors.primary,
    },
    actionButtonText: {
      color: colors.white,
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.semibold,
      marginLeft: Layout.spacing.sm,
    },
  }), [colors]);

  useEffect(() => {
    getUserName();
    fetchStats();
    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushToken(token);
    });
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/orders/buyer');
      if (response.data.success) {
        setOrdersCount(response.data.orders.length);
      }
    } catch (error) {
      console.error('Error fetching order stats:', error);
    }
  };

  const getUserName = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'Buyer');
      }
    } catch (error) {
      console.error('Error getting user name:', error);
    }
  };

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await AsyncStorage.removeItem('currentUser');
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
        <Text style={styles.headerTitle}>Buyer Dashboard</Text>
        <View style={styles.headerActions}>
          <ThemeToggle />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={colors.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeCard}>
          <Ionicons name="storefront-outline" size={40} color={colors.secondary} />
          <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Buyer</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="cart-outline" size={32} color={colors.secondary} />
            <Text style={styles.statNumber}>{ordersCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="heart-outline" size={32} color={colors.secondary} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Wishlist</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push('/(buyer)/browse')}
          >
            <Ionicons name="search-outline" size={24} color={colors.white} />
            <Text style={styles.actionButtonText}>Browse Products</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/(buyer)/orders')}
          >
            <Ionicons name="cart-outline" size={24} color={colors.white} />
            <Text style={styles.actionButtonText}>My Orders</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}