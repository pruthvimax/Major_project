import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { useCart } from '../../context/CartContext';
import { ScreenHeader, Card, Badge, StatCard, SectionHeader } from '../../components/ui';

export default function BuyerDashboard() {
  const colors = useColors();
  const { summary } = useCart();
  const [userName, setUserName] = useState('Buyer');
  const [ordersCount, setOrdersCount] = useState(0);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: Layout.spacing.lg,
      paddingBottom: Layout.spacing.xxl,
    },
    welcomeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.md,
      marginBottom: Layout.spacing.lg,
      padding: Layout.spacing.lg,
    },
    welcomeIconWell: {
      width: 56,
      height: 56,
      borderRadius: Layout.borderRadius.lg,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeCopy: {
      flex: 1,
      minWidth: 0,
    },
    welcomeText: {
      fontSize: Typography.fontSize.xl,
      lineHeight: Typography.leading.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
    },
    welcomeHint: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.textSecondary,
      marginTop: 2,
      marginBottom: Layout.spacing.sm,
    },
    statsRow: {
      flexDirection: 'row',
      gap: Layout.spacing.md,
      marginBottom: Layout.spacing.xl,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -Layout.spacing.sm,
    },
    tileCell: {
      width: '50%',
      paddingHorizontal: Layout.spacing.sm,
      paddingBottom: Layout.spacing.md,
    },
    tile: {
      minHeight: 124,
      justifyContent: 'space-between',
      padding: Layout.spacing.lg,
    },
    tileIconWell: {
      width: 48,
      height: 48,
      borderRadius: Layout.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Layout.spacing.md,
    },
    tileLabel: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
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
      if (user.role !== 'buyer') {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
        return;
      }
      setUserName(user.name || 'Buyer');
      fetchStats();
    } catch (error) {
      console.error('Role validation error:', error);
      router.replace('/auth/login');
    }
  };

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

  const quickActions: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    accent: string;
    onPress: () => void;
  }[] = [
    {
      label: 'Browse Products',
      icon: 'search-outline',
      tint: colors.primarySoft,
      accent: colors.primary,
      onPress: () => router.push('/buyer/browse'),
    },
    {
      label: 'My Cart',
      icon: 'cart-outline',
      tint: colors.tintBlue,
      accent: colors.info,
      onPress: () => router.push('/buyer/cart'),
    },
    {
      label: 'My Orders',
      icon: 'receipt-outline',
      tint: colors.tintAmber,
      accent: colors.warning,
      onPress: () => router.push('/buyer/orders'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Hi, ${userName}`}
        subtitle="Fresh from the farm, straight to you"
        align="left"
        iconActions={[
          {
            icon: 'log-out-outline',
            onPress: handleLogout,
            color: colors.error,
            accessibilityLabel: 'Logout',
          },
        ]}
        actions={<ThemeToggle />}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card elevation="sm" padded={false} style={styles.welcomeCard}>
          <View style={styles.welcomeIconWell}>
            <Ionicons name="storefront-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.welcomeCopy}>
            <Text style={styles.welcomeText} numberOfLines={2}>
              Welcome, {userName}!
            </Text>
            <Text style={styles.welcomeHint} numberOfLines={2}>
              Your marketplace for verified farm produce.
            </Text>
            <Badge label="Buyer" tone="primary" icon="person-outline" />
          </View>
        </Card>

        <View style={styles.statsRow}>
          <StatCard
            icon="receipt-outline"
            value={ordersCount}
            label="Orders"
            accent={colors.primary}
            tint={colors.primarySoft}
          />
          <StatCard
            icon="cart-outline"
            value={summary.itemCount}
            label="Cart Items"
            accent={colors.info}
            tint={colors.tintBlue}
          />
        </View>

        <SectionHeader title="Quick Actions" />

        <View style={styles.grid}>
          {quickActions.map((action) => (
            <View key={action.label} style={styles.tileCell}>
              <Card elevation="sm" padded={false} onPress={action.onPress} style={styles.tile}>
                <View style={[styles.tileIconWell, { backgroundColor: action.tint }]}>
                  <Ionicons name={action.icon} size={24} color={action.accent} />
                </View>
                <Text style={styles.tileLabel} numberOfLines={2}>
                  {action.label}
                </Text>
              </Card>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
