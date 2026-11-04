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
  Image,
  Dimensions,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import { fetchSchemeAnalytics } from '../../services/schemes';
import { fetchBusinessAnalytics, formatINRShort } from '../../services/businessAnalytics';
import type { BusinessAnalytics } from '../../types/analytics.types';
import type { SchemeAnalytics } from '../../types/scheme.types';
import ThemeToggle from '../../components/ThemeToggle';
import EditProfileModal from '../../components/profile/EditProfileModal';
import LanguageSelector from '../../components/LanguageSelector';
import { ErrorState } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';

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

interface DeliveryMetrics {
  ordersAssigned: number;
  ordersInTransit: number;
  deliveredOrders: number;
  failedDeliveries: number;
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('admin@farm.com');
  const [userLocation, setUserLocation] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
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
  const [schemeStats, setSchemeStats] = useState<SchemeAnalytics | null>(null);
  const [bizStats, setBizStats] = useState<BusinessAnalytics | null>(null);
  const [delivery, setDelivery] = useState<DeliveryMetrics | null>(null);

  const validateRoleAndLoad = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const token = await AsyncStorage.getItem('token');
      if (!userData || !token) {
        router.replace('/auth/login');
        return;
      }
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
      setUserName(user?.name || 'Administrator');
      if (user?.email) setUserEmail(user.email);
      if (user?.mobile) setUserMobile(user.mobile);
      if (user?.address) setUserLocation(typeof user.address === 'string' ? user.address : '');
      if (user?.profileImage || user?.avatar) setUserAvatar(user.profileImage || user.avatar);
      await fetchAnalytics();
    } catch (err) {
      logApiError('Admin role validation', err);
      router.replace('/auth/login');
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    fetchSchemeAnalytics()
      .then(setSchemeStats)
      .catch((e) => logApiError('Admin scheme analytics', e));
    fetchBusinessAnalytics()
      .then(setBizStats)
      .catch((e) => logApiError('Admin business analytics', e));
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
        setDelivery(analytics.delivery || null);
      }
    } catch (err) {
      logApiError('Admin fetch analytics', err);
      setError('Failed to load live data. Showing fallback metrics.');
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
    setProfileMenuVisible(false);
    const performLogout = async () => {
      try {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
      } catch (err) {
        logApiError('Admin logout', err);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Log out from Admin Dashboard?')) performLogout();
    } else {
      Alert.alert('Sign Out', 'Log out from Admin Dashboard?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  const totalUsersCount = cards.totalFarmers + cards.totalBuyers;
  const cardWidth = (Dimensions.get('window').width - Layout.spacing.lg * 2 - (Layout.spacing.sm + 2)) / 2;

  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0
  );
  const safeTopPadding = safeTop > 0 ? safeTop + Layout.spacing.sm : (Platform.OS === 'ios' ? 44 : Layout.spacing.md);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: '#F2FCF1',
        },
        headerBar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: safeTopPadding,
          paddingBottom: Layout.spacing.sm,
          backgroundColor: 'rgba(242, 252, 241, 0.95)',
          borderBottomWidth: 1,
          borderBottomColor: '#E6F1E5',
        },
        headerLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs + 2,
          flexShrink: 1,
          minWidth: 0,
        },
        headerIconWell: {
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: '#0D631B',
          alignItems: 'center',
          justifyContent: 'center',
          ...Layout.shadow.xs,
        },
        headerTitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        headerTitleText: {
          fontSize: 18,
          fontWeight: Typography.fontWeight.bold,
          color: '#151E17',
        },
        portalBadge: {
          backgroundColor: '#ABF4AC',
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 10,
        },
        portalBadgeText: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
          color: '#07521D',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        statusRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 2,
        },
        liveDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#0D631B',
        },
        statusText: {
          fontSize: 12,
          color: '#40493D',
          fontWeight: Typography.fontWeight.medium,
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        iconBtn: {
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          ...Layout.shadow.xs,
        },
        notifBadge: {
          position: 'absolute',
          top: 2,
          right: 2,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: '#C24300',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
        },
        notifText: {
          fontSize: 9,
          fontWeight: Typography.fontWeight.bold,
          color: '#FFFFFF',
        },
        scrollContent: {
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.md,
          paddingBottom: Layout.spacing.xxl + 30,
          gap: Layout.spacing.md,
        },
        // Section Headings
        sectionHeadingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: Layout.spacing.xs,
        },
        sectionHeading: {
          fontSize: 17,
          fontWeight: Typography.fontWeight.bold,
          color: '#151E17',
        },
        sectionSubText: {
          fontSize: 11,
          color: '#40493D',
          fontWeight: Typography.fontWeight.medium,
        },
        // Pulse KPI Grid (2x2)
        kpiGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: Layout.spacing.sm + 2,
        },
        kpiCard: {
          width: cardWidth,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: Layout.spacing.md,
          justifyContent: 'space-between',
          minHeight: 125,
          ...Layout.shadow.xs,
        },
        kpiTop: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        kpiIconWell: {
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: '#E1EBE0',
          alignItems: 'center',
          justifyContent: 'center',
        },
        kpiTrendChip: {
          backgroundColor: '#ABF4AC',
          paddingHorizontal: 7,
          paddingVertical: 3,
          borderRadius: 10,
        },
        kpiTrendText: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
          color: '#2E7238',
        },
        kpiValText: {
          fontSize: 22,
          fontWeight: Typography.fontWeight.extrabold,
          color: '#151E17',
          marginTop: 6,
          letterSpacing: -0.5,
        },
        kpiLabelText: {
          fontSize: 12,
          color: '#40493D',
        },
        kpiSubText: {
          fontSize: 10,
          color: '#707A6C',
          marginTop: 2,
        },
        // Action Feed Banner
        actionFeedCard: {
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: Layout.spacing.md,
          ...Layout.shadow.xs,
        },
        actionFeedHead: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: Layout.spacing.xs,
        },
        priorityDotRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        priorityDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#993300',
        },
        priorityLabel: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
          color: '#993300',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        actionTimeText: {
          fontSize: 11,
          color: '#707A6C',
        },
        actionBody: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.xs,
        },
        actionImg: {
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: '#E6F1E5',
        },
        actionMeta: {
          flex: 1,
          minWidth: 0,
        },
        actionTitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        actionTitle: {
          fontSize: 14,
          fontWeight: Typography.fontWeight.bold,
          color: '#151E17',
        },
        holdBadge: {
          backgroundColor: '#FFDBCF',
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 8,
        },
        holdText: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
          color: '#802A00',
        },
        actionDesc: {
          fontSize: 11,
          color: '#40493D',
          marginTop: 2,
        },
        actionBtnRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs + 2,
          marginTop: Layout.spacing.md,
        },
        primaryActionBtn: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: '#0D631B',
          paddingVertical: 9,
          borderRadius: 20,
        },
        primaryActionText: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.bold,
          color: '#FFFFFF',
        },
        secondaryActionBtn: {
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 20,
          backgroundColor: '#E1EBE0',
          alignItems: 'center',
          justifyContent: 'center',
        },
        secondaryActionText: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.semibold,
          color: '#151E17',
        },
        // Module Grid
        moduleGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: Layout.spacing.sm + 2,
        },
        moduleCard: {
          width: cardWidth,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: Layout.spacing.md,
          justifyContent: 'space-between',
          minHeight: 145,
          ...Layout.shadow.xs,
        },
        moduleCardFull: {
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: Layout.spacing.md,
          minHeight: 74,
          ...Layout.shadow.xs,
        },
        moduleTop: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        moduleIconWell: {
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: '#ECF6EB',
          alignItems: 'center',
          justifyContent: 'center',
        },
        moduleBadge: {
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 10,
        },
        moduleBadgeText: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
        },
        moduleTitle: {
          fontSize: 15,
          fontWeight: Typography.fontWeight.bold,
          color: '#151E17',
          marginTop: Layout.spacing.xs,
        },
        moduleDesc: {
          fontSize: 11,
          color: '#40493D',
          marginTop: 2,
          lineHeight: 15,
        },
        moduleLinkRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: Layout.spacing.xs,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: '#ECF6EB',
        },
        moduleLinkText: {
          fontSize: 11,
          fontWeight: Typography.fontWeight.bold,
          color: '#0D631B',
        },
        // Memo Box
        memoBox: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          backgroundColor: '#E1EBE0',
          borderRadius: 18,
          padding: Layout.spacing.md,
        },
        memoIconWell: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(13, 99, 27, 0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        memoTitle: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.bold,
          color: '#151E17',
        },
        memoDesc: {
          fontSize: 11,
          color: '#40493D',
          marginTop: 1,
        },
        // Header Profile Button
        profileAvatarBtn: {
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: isDark ? '#1C261F' : '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: isDark ? '#2E7D32' : '#ABF4AC',
          position: 'relative',
          ...Layout.shadow.xs,
        },
        profileAvatarBtnActive: {
          borderColor: '#0D631B',
          backgroundColor: isDark ? '#283D2C' : '#E6F8E5',
        },
        profileAvatarDot: {
          position: 'absolute',
          bottom: 1,
          right: 1,
          width: 9,
          height: 9,
          borderRadius: 4.5,
          backgroundColor: '#0D631B',
          borderWidth: 1.5,
          borderColor: isDark ? '#1C261F' : '#FFFFFF',
        },
        // In-Page Admin Profile Strip
        adminProfileStrip: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isDark ? '#18241B' : '#ECF6EB',
          borderRadius: 20,
          paddingVertical: Layout.spacing.sm + 2,
          paddingHorizontal: Layout.spacing.md,
          ...Layout.shadow.xs,
          borderWidth: 1,
          borderColor: isDark ? '#253B2A' : '#E0EFE0',
          gap: Layout.spacing.sm,
        },
        adminProfileLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs + 4,
          flex: 1,
          minWidth: 0,
        },
        adminAvatarWell: {
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: '#0D631B',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        },
        adminOnlineDot: {
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#ABF4AC',
          borderWidth: 2,
          borderColor: isDark ? '#18241B' : '#ECF6EB',
        },
        adminProfileMeta: {
          flex: 1,
          minWidth: 0,
        },
        adminNameRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        adminNameText: {
          fontSize: 15,
          fontWeight: Typography.fontWeight.bold,
          color: isDark ? '#F1F5F2' : '#151E17',
        },
        superAdminBadge: {
          backgroundColor: isDark ? '#254B2A' : '#ABF4AC',
          paddingHorizontal: 6,
          paddingVertical: 1.5,
          borderRadius: 8,
        },
        superAdminBadgeText: {
          fontSize: 9,
          fontWeight: Typography.fontWeight.bold,
          color: isDark ? '#A1F0A2' : '#07521D',
        },
        adminEmailText: {
          fontSize: 11,
          color: isDark ? '#A0AFA2' : '#40493D',
          marginTop: 1,
        },
        adminProfileActions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        profileMenuBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 14,
          backgroundColor: isDark ? '#223226' : '#FFFFFF',
          borderWidth: 1,
          borderColor: isDark ? '#2F4934' : '#CCE6CA',
        },
        profileMenuBtnText: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.semibold,
          color: isDark ? '#81C784' : '#0D631B',
        },
        directSignOutBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 14,
          backgroundColor: isDark ? '#3E1C1C' : '#FEF2F2',
          borderWidth: 1,
          borderColor: isDark ? '#5C2828' : '#FECACA',
        },
        directSignOutText: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.semibold,
          color: isDark ? '#EF5350' : '#BA1A1A',
        },
        // Modal Dropdown
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
        },
        dropdownAnchor: {
          position: 'absolute',
          top: safeTopPadding + 52,
          right: Layout.spacing.md,
          width: Math.min(Dimensions.get('window').width - Layout.spacing.md * 2, 290),
          maxWidth: '100%',
        },
        dropdownCard: {
          backgroundColor: isDark ? '#1C261F' : '#FFFFFF',
          borderRadius: 18,
          padding: Layout.spacing.md,
          borderWidth: 1,
          borderColor: isDark ? '#2A3A2C' : '#E6F1E5',
          ...Layout.shadow.lg,
          elevation: 12,
        },
        profileHeaderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          paddingBottom: 2,
        },
        topAvatarImg: {
          width: 32,
          height: 32,
          borderRadius: 16,
        },
        dropdownAvatarImg: {
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 1.5,
          borderColor: '#6CC51D',
        },
        dropdownEditBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          backgroundColor: isDark ? '#223826' : '#E8F8EE',
          borderRadius: 8,
          paddingVertical: 5,
          paddingHorizontal: 10,
          marginTop: 6,
          borderWidth: 1,
          borderColor: isDark ? '#2E5033' : '#C8F0D3',
          alignSelf: 'flex-start',
        },
        dropdownEditBtnText: {
          fontSize: 11,
          fontWeight: Typography.fontWeight.semibold,
          color: isDark ? '#81C784' : '#0D631B',
        },
        dropdownAvatarWell: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: '#0D631B',
          alignItems: 'center',
          justifyContent: 'center',
        },
        dropdownHeaderMeta: {
          flex: 1,
          minWidth: 0,
        },
        dropdownNameRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        dropdownNameText: {
          fontSize: 15,
          fontWeight: Typography.fontWeight.bold,
          color: isDark ? '#F1F5F2' : '#151E17',
        },
        dropdownRoleTag: {
          backgroundColor: isDark ? '#254B2A' : '#ABF4AC',
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6,
        },
        dropdownRoleTagText: {
          fontSize: 9,
          fontWeight: Typography.fontWeight.bold,
          color: isDark ? '#A1F0A2' : '#07521D',
        },
        dropdownEmailText: {
          fontSize: 11,
          color: isDark ? '#A0AFA2' : '#40493D',
          marginTop: 1,
        },
        dropdownActiveRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          marginTop: 3,
        },
        dropdownActiveText: {
          fontSize: 11,
          color: isDark ? '#81C784' : '#0D631B',
          fontWeight: Typography.fontWeight.medium,
        },
        menuDivider: {
          height: 1,
          backgroundColor: isDark ? '#2A3A2C' : '#E6F1E5',
          marginVertical: Layout.spacing.sm + 2,
        },
        dropdownMenuItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          paddingVertical: 9,
          paddingHorizontal: 6,
          borderRadius: 10,
        },
        menuItemIconWell: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        menuItemTextCol: {
          flex: 1,
          minWidth: 0,
        },
        menuItemTitle: {
          fontSize: 13,
          fontWeight: Typography.fontWeight.semibold,
          color: isDark ? '#F1F5F2' : '#151E17',
        },
        menuItemSub: {
          fontSize: 11,
          color: isDark ? '#A0AFA2' : '#40493D',
        },
        dropdownLogoutBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          backgroundColor: isDark ? '#3E1C1C' : '#FEF2F2',
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: isDark ? '#5C2828' : '#FEE2E2',
          marginTop: 2,
        },
        dropdownLogoutIconWell: {
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: isDark ? '#522323' : '#FEE2E2',
          alignItems: 'center',
          justifyContent: 'center',
        },
        dropdownLogoutTitle: {
          fontSize: 14,
          fontWeight: Typography.fontWeight.bold,
          color: isDark ? '#EF5350' : '#BA1A1A',
        },
        dropdownLogoutSub: {
          fontSize: 11,
          color: isDark ? '#E57373' : '#DC2626',
          marginTop: 1,
        },
      }),
    [colors, cardWidth, safeTopPadding, isDark]
  );

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWell}>
            <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
          </View>
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitleText}>Overview</Text>
              <View style={styles.portalBadge}>
                <Text style={styles.portalBadgeText}>Portal</Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>Node: Mainnet Active</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <LanguageSelector />
          <ThemeToggle />
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/admin/disputes')}
            accessibilityLabel="Disputes & Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={isDark ? '#F1F5F2' : '#151E17'} />
            {cards.disputedOrders > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifText}>{cards.disputedOrders}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.profileAvatarBtn, profileMenuVisible && styles.profileAvatarBtnActive]}
            onPress={() => setProfileMenuVisible((prev) => !prev)}
            accessibilityLabel="Admin Profile & Menu"
            accessibilityState={{ expanded: profileMenuVisible }}
          >
            {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.topAvatarImg} />
          ) : (
            <Ionicons name="person-circle" size={24} color="#0D631B" />
          )}
            <View style={styles.profileAvatarDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D631B']} />}
      >
        {/* Admin Profile & Session Strip */}
        <View style={styles.adminProfileStrip}>
          <TouchableOpacity
            style={styles.adminProfileLeft}
            onPress={() => setProfileMenuVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Admin Profile Details"
          >
            <View style={styles.adminAvatarWell}>
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              <View style={styles.adminOnlineDot} />
            </View>
            <View style={styles.adminProfileMeta}>
              <View style={styles.adminNameRow}>
                <Text style={styles.adminNameText} numberOfLines={1}>
                  Hi, {userName}
                </Text>
                <View style={styles.superAdminBadge}>
                  <Text style={styles.superAdminBadgeText}>Super Admin</Text>
                </View>
              </View>
              <Text style={styles.adminEmailText} numberOfLines={1}>
                🛡️ {userEmail}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.adminProfileActions}>
            <TouchableOpacity
              style={styles.profileMenuBtn}
              onPress={() => setProfileMenuVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="Open Profile Menu"
            >
              <Ionicons name="person-outline" size={14} color={isDark ? '#81C784' : '#0D631B'} />
              <Text style={styles.profileMenuBtnText}>Menu</Text>
              <Ionicons name="chevron-down" size={12} color={isDark ? '#81C784' : '#0D631B'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.directSignOutBtn}
              onPress={handleLogout}
              activeOpacity={0.7}
              accessibilityLabel="Sign Out"
            >
              <Ionicons name="log-out-outline" size={14} color={isDark ? '#EF5350' : '#BA1A1A'} />
              <Text style={styles.directSignOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
        {error && (
          <ErrorState
            compact
            icon="alert-circle-outline"
            title="System Alert"
            message={error}
            onRetry={fetchAnalytics}
          />
        )}

        {/* Marketplace Pulse (2x2 KPI Grid) */}
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Marketplace Pulse</Text>
          <Text style={styles.sectionSubText}>Real-time sync</Text>
        </View>

        <View style={styles.kpiGrid}>
          {/* Tile 1: Total Users */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={styles.kpiIconWell}>
                <Ionicons name="people-outline" size={20} color="#0D631B" />
              </View>
              <View style={styles.kpiTrendChip}>
                <Text style={styles.kpiTrendText}>+12.4%</Text>
              </View>
            </View>
            <View>
              <Text style={styles.kpiLabelText}>Total Users</Text>
              <Text style={styles.kpiValText}>{totalUsersCount || 24850}</Text>
              <Text style={styles.kpiSubText}>
                {cards.totalBuyers || '18.4k'} Buyers • {cards.totalFarmers || '6.4k'} Farmers
              </Text>
            </View>
          </View>

          {/* Tile 2: Total Orders */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={styles.kpiIconWell}>
                <Ionicons name="cart-outline" size={20} color="#286B33" />
              </View>
              <View style={styles.kpiTrendChip}>
                <Text style={styles.kpiTrendText}>+8.6%</Text>
              </View>
            </View>
            <View>
              <Text style={styles.kpiLabelText}>Orders Fulfilled</Text>
              <Text style={styles.kpiValText}>{cards.totalOrders || 142680}</Text>
              <Text style={styles.kpiSubText}>
                {bizStats ? formatINRShort(bizStats.revenue.total) : '₹1.84 Cr'} Total Volume
              </Text>
            </View>
          </View>

          {/* Tile 3: Platform Revenue */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={styles.kpiIconWell}>
                <Ionicons name="cash-outline" size={20} color="#0D631B" />
              </View>
              <View style={styles.kpiTrendChip}>
                <Text style={styles.kpiTrendText}>+22.1%</Text>
              </View>
            </View>
            <View>
              <Text style={styles.kpiLabelText}>Platform Revenue</Text>
              <Text style={styles.kpiValText}>
                {cards.revenue > 0 ? `₹${(cards.revenue / 100000).toFixed(1)}L` : '₹48.6L'}
              </Text>
              <Text style={styles.kpiSubText}>
                {bizStats ? `${bizStats.commission.ratePercent}% Fee` : '1.5% Fee'} Commission
              </Text>
            </View>
          </View>

          {/* Tile 4: Secured Escrows */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={styles.kpiIconWell}>
                <Ionicons name="lock-closed-outline" size={20} color="#993300" />
              </View>
              <View style={[styles.kpiTrendChip, { backgroundColor: '#E1EBE0' }]}>
                <Text style={[styles.kpiTrendText, { color: '#151E17' }]}>0 Failed</Text>
              </View>
            </View>
            <View>
              <Text style={styles.kpiLabelText}>Secured Escrows</Text>
              <Text style={styles.kpiValText}>{cards.blockchainTransactions || 98410}</Text>
              <Text style={styles.kpiSubText}>On-Chain Polygon Ledger</Text>
            </View>
          </View>
        </View>

        {/* Priority Action Feed / Escalation Preview */}
        <View style={styles.actionFeedCard}>
          <View style={styles.actionFeedHead}>
            <View style={styles.priorityDotRow}>
              <View style={styles.priorityDot} />
              <Text style={styles.priorityLabel}>High Priority Action</Text>
            </View>
            <Text style={styles.actionTimeText}>14 mins ago</Text>
          </View>

          <View style={styles.actionBody}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=200&auto=format&fit=crop' }}
              style={styles.actionImg}
            />
            <View style={styles.actionMeta}>
              <View style={styles.actionTitleRow}>
                <Text style={styles.actionTitle}>Dispute #D-842</Text>
                <View style={styles.holdBadge}>
                  <Text style={styles.holdText}>₹42,000 Hold</Text>
                </View>
              </View>
              <Text style={styles.actionDesc} numberOfLines={2}>
                Quality discrepancy on 500kg Alphonso Mango lot from Ratnagiri Hub.
              </Text>
            </View>
          </View>

          <View style={styles.actionBtnRow}>
            <TouchableOpacity style={styles.primaryActionBtn} onPress={() => router.push('/admin/disputes')}>
              <Text style={styles.primaryActionText}>Review Case</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => router.push('/admin/orders')}>
              <Text style={styles.secondaryActionText}>Inspect Batch</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Administration & Control Workflows Grid (7 Modules) */}
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionHeading}>Administration & Control</Text>
            <Text style={styles.sectionSubText}>7 Active Core Modules</Text>
          </View>
        </View>

        <View style={styles.moduleGrid}>
          {/* 1. User Moderation */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/admin/users')}
            activeOpacity={0.85}
          >
            <View style={styles.moduleTop}>
              <View style={styles.moduleIconWell}>
                <Ionicons name="people-outline" size={22} color="#0D631B" />
              </View>
              <View style={[styles.moduleBadge, { backgroundColor: '#ABF4AC' }]}>
                <Text style={[styles.moduleBadgeText, { color: '#2E7238' }]}>14 KYC</Text>
              </View>
            </View>
            <View>
              <Text style={styles.moduleTitle}>Users</Text>
              <Text style={styles.moduleDesc} numberOfLines={2}>
                KYC verification, farmer onboarding & account status audits.
              </Text>
            </View>
            <View style={styles.moduleLinkRow}>
              <Text style={styles.moduleLinkText}>Manage Users</Text>
              <Ionicons name="chevron-forward" size={14} color="#0D631B" />
            </View>
          </TouchableOpacity>

          {/* 2. Produce Moderation */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/admin/products')}
            activeOpacity={0.85}
          >
            <View style={styles.moduleTop}>
              <View style={styles.moduleIconWell}>
                <Ionicons name="cube-outline" size={22} color="#286B33" />
              </View>
              <View style={[styles.moduleBadge, { backgroundColor: '#FFDBCF' }]}>
                <Text style={[styles.moduleBadgeText, { color: '#802A00' }]}>
                  {cards.totalProducts > 0 ? `${cards.totalProducts} Total` : '28 Review'}
                </Text>
              </View>
            </View>
            <View>
              <Text style={styles.moduleTitle}>Produce</Text>
              <Text style={styles.moduleDesc} numberOfLines={2}>
                Approve harvests, review quality certificates & block bad lots.
              </Text>
            </View>
            <View style={styles.moduleLinkRow}>
              <Text style={styles.moduleLinkText}>Catalog Audit</Text>
              <Ionicons name="chevron-forward" size={14} color="#0D631B" />
            </View>
          </TouchableOpacity>

          {/* 3. Order Audits */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/admin/orders')}
            activeOpacity={0.85}
          >
            <View style={styles.moduleTop}>
              <View style={styles.moduleIconWell}>
                <Ionicons name="receipt-outline" size={22} color="#151E17" />
              </View>
              <View style={[styles.moduleBadge, { backgroundColor: '#FFDAD6' }]}>
                <Text style={[styles.moduleBadgeText, { color: '#BA1A1A' }]}>
                  {cards.pendingOrders > 0 ? `${cards.pendingOrders} Pending` : '3 Flagged'}
                </Text>
              </View>
            </View>
            <View>
              <Text style={styles.moduleTitle}>Orders</Text>
              <Text style={styles.moduleDesc} numberOfLines={2}>
                Route trace, delivery escrows & forced cancellation logs.
              </Text>
            </View>
            <View style={styles.moduleLinkRow}>
              <Text style={styles.moduleLinkText}>Audit Feed</Text>
              <Ionicons name="chevron-forward" size={14} color="#0D631B" />
            </View>
          </TouchableOpacity>

          {/* 4. Dispute Management */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/admin/disputes')}
            activeOpacity={0.85}
          >
            <View style={styles.moduleTop}>
              <View style={styles.moduleIconWell}>
                <Ionicons name="scale-outline" size={22} color="#993300" />
              </View>
              <View style={[styles.moduleBadge, { backgroundColor: '#FFDBCF' }]}>
                <Text style={[styles.moduleBadgeText, { color: '#802A00' }]}>
                  {cards.disputedOrders > 0 ? `${cards.disputedOrders} Open` : '5 Open'}
                </Text>
              </View>
            </View>
            <View>
              <Text style={styles.moduleTitle}>Disputes</Text>
              <Text style={styles.moduleDesc} numberOfLines={2}>
                Mediate claim tickets, trigger multi-sig releases & refunds.
              </Text>
            </View>
            <View style={styles.moduleLinkRow}>
              <Text style={styles.moduleLinkText}>Arbitration</Text>
              <Ionicons name="chevron-forward" size={14} color="#0D631B" />
            </View>
          </TouchableOpacity>

          {/* 5. Platform Analytics */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/admin/revenue-analytics')}
            activeOpacity={0.85}
          >
            <View style={styles.moduleTop}>
              <View style={styles.moduleIconWell}>
                <Ionicons name="stats-chart-outline" size={22} color="#0D631B" />
              </View>
              <View style={[styles.moduleBadge, { backgroundColor: '#ABF4AC' }]}>
                <Text style={[styles.moduleBadgeText, { color: '#2E7238' }]}>Live</Text>
              </View>
            </View>
            <View>
              <Text style={styles.moduleTitle}>Analytics</Text>
              <Text style={styles.moduleDesc} numberOfLines={2}>
                Category yields, wholesale price discovery & growth charts.
              </Text>
            </View>
            <View style={styles.moduleLinkRow}>
              <Text style={styles.moduleLinkText}>Deep Insights</Text>
              <Ionicons name="chevron-forward" size={14} color="#0D631B" />
            </View>
          </TouchableOpacity>

          {/* 6. Govt Scheme Admin */}
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => router.push('/admin/schemes')}
            activeOpacity={0.85}
          >
            <View style={styles.moduleTop}>
              <View style={styles.moduleIconWell}>
                <Ionicons name="business-outline" size={22} color="#286B33" />
              </View>
              <View style={[styles.moduleBadge, { backgroundColor: '#ABF4AC' }]}>
                <Text style={[styles.moduleBadgeText, { color: '#2E7238' }]}>
                  {schemeStats ? `${schemeStats.totalQueries} Queries` : '9 Enquiries'}
                </Text>
              </View>
            </View>
            <View>
              <Text style={styles.moduleTitle}>Agri Schemes</Text>
              <Text style={styles.moduleDesc} numberOfLines={2}>
                Subsidy allocations, state quota rules & farmer advisories.
              </Text>
            </View>
            <View style={styles.moduleLinkRow}>
              <Text style={styles.moduleLinkText}>Manage Grants</Text>
              <Ionicons name="chevron-forward" size={14} color="#0D631B" />
            </View>
          </TouchableOpacity>

          {/* 7. Global Explorer (Full Width Accent) */}
          <TouchableOpacity
            style={styles.moduleCardFull}
            onPress={() => router.push('/admin/transactions')}
            activeOpacity={0.88}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm, flex: 1, minWidth: 0 }}>
              <View style={[styles.moduleIconWell, { backgroundColor: '#0D631B' }]}>
                <Ionicons name="cube-outline" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.moduleTitle} numberOfLines={1}>
                    Global On-Chain Explorer
                  </Text>
                  <View style={[styles.moduleBadge, { backgroundColor: '#ABF4AC' }]}>
                    <Text style={[styles.moduleBadgeText, { color: '#07521D' }]}>Sync OK</Text>
                  </View>
                </View>
                <Text style={styles.moduleDesc} numberOfLines={1}>
                  Inspect transaction hashes, smart contracts & gas meters
                </Text>
              </View>
            </View>
            <View style={[styles.iconBtn, { backgroundColor: '#0D631B', width: 34, height: 34, borderRadius: 17 }]}>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Operational Field Quick Memo */}
        <View style={styles.memoBox}>
          <View style={styles.memoIconWell}>
            <Ionicons name="leaf" size={20} color="#0D631B" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.memoTitle}>Kharif Season High Volume</Text>
            <Text style={styles.memoDesc}>Nashik & Pune Hubs operating at 94% cold-storage capacity.</Text>
          </View>
          <Ionicons name="information-circle-outline" size={18} color="#40493D" />
        </View>
      </ScrollView>

      {/* Profile & Sign Out Dropdown Menu */}
      <Modal
        visible={profileMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setProfileMenuVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.dropdownAnchor}>
                <View style={styles.dropdownCard}>
                  {/* Profile Header */}
                  <View style={styles.profileHeaderRow}>
                    {userAvatar ? (
                      <Image source={{ uri: userAvatar }} style={styles.dropdownAvatarImg} />
                    ) : (
                      <View style={styles.dropdownAvatarWell}>
                        <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
                      </View>
                    )}
                    <View style={styles.dropdownHeaderMeta}>
                      <View style={styles.dropdownNameRow}>
                        <Text style={styles.dropdownNameText} numberOfLines={1}>
                          {userName}
                        </Text>
                        <View style={styles.dropdownRoleTag}>
                          <Text style={styles.dropdownRoleTagText}>ADMIN</Text>
                        </View>
                      </View>
                      <Text style={styles.dropdownEmailText} numberOfLines={1}>
                        {userEmail}
                      </Text>
                      {userLocation ? (
                        <Text style={styles.dropdownEmailText} numberOfLines={1}>
                          📍 {userLocation}
                        </Text>
                      ) : null}
                      {userMobile ? (
                        <Text style={styles.dropdownEmailText} numberOfLines={1}>
                          📞 {userMobile}
                        </Text>
                      ) : null}
                      <View style={styles.dropdownActiveRow}>
                        <View style={styles.liveDot} />
                        <Text style={styles.dropdownActiveText}>Session Active</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.dropdownEditBtn}
                        onPress={() => {
                          setProfileMenuVisible(false);
                          setEditProfileVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="create-outline" size={13} color="#0D631B" />
                        <Text style={styles.dropdownEditBtnText}>Edit Profile</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.menuDivider} />

                  {/* Quick Admin Actions */}
                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setProfileMenuVisible(false);
                      setEditProfileVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconWell, { backgroundColor: isDark ? '#1E3322' : '#F0FDF4' }]}>
                      <Ionicons name="person-circle-outline" size={18} color="#0D631B" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemTitle}>Edit Profile</Text>
                      <Text style={styles.menuItemSub}>Update picture, contact & address</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setProfileMenuVisible(false);
                      router.push('/admin/settings');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconWell, { backgroundColor: isDark ? '#1E3322' : '#F0FDF4' }]}>
                      <Ionicons name="settings-outline" size={17} color="#0D631B" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemTitle}>System Settings</Text>
                      <Text style={styles.menuItemSub}>Network & configs</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setProfileMenuVisible(false);
                      router.push('/admin/disputes');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconWell, { backgroundColor: isDark ? '#3D2F18' : '#FEF3C7' }]}>
                      <Ionicons name="notifications-outline" size={17} color="#D97706" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemTitle}>Disputes & Alerts</Text>
                      <Text style={styles.menuItemSub}>
                        {cards.disputedOrders > 0 ? `${cards.disputedOrders} open disputes` : 'System notices'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setProfileMenuVisible(false);
                      router.push('/admin/revenue-analytics');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconWell, { backgroundColor: isDark ? '#1C2E4A' : '#EFF6FF' }]}>
                      <Ionicons name="bar-chart-outline" size={17} color="#2563EB" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemTitle}>Revenue & Reports</Text>
                      <Text style={styles.menuItemSub}>Financial metrics</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
                  </TouchableOpacity>

                  <View style={styles.menuDivider} />

                  {/* Sign Out / Logout Option */}
                  <TouchableOpacity
                    style={styles.dropdownLogoutBtn}
                    onPress={handleLogout}
                    activeOpacity={0.8}
                    accessibilityLabel="Sign Out / Logout"
                  >
                    <View style={styles.dropdownLogoutIconWell}>
                      <Ionicons name="log-out-outline" size={18} color="#BA1A1A" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.dropdownLogoutTitle}>Sign Out</Text>
                      <Text style={styles.dropdownLogoutSub}>Exit admin dashboard</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#BA1A1A" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
        initialData={{
          name: userName,
          email: userEmail,
          mobile: userMobile,
          address: userLocation,
          profileImage: userAvatar,
          role: 'admin',
        }}
        onProfileUpdated={(updated) => {
          setUserName(updated.name);
          if (updated.mobile) setUserMobile(updated.mobile);
          if (updated.address) setUserLocation(updated.address);
          if (updated.profileImage) setUserAvatar(updated.profileImage);
        }}
        roleLabel="ADMIN"
      />
    </View>
  );
}
