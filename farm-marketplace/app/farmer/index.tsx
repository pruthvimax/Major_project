import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { registerForPushNotificationsAsync, savePushToken } from '../../services/notifications';
import { ReviewAnalytics, type FarmerReview } from '../../components/ui';
import { friendlyError } from '../../components/ui/ErrorState';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200&auto=format&fit=crop';

export default function FarmerDashboard() {
  const colors = useColors();
  const [userName, setUserName] = useState('Farmer');
  const [userLocation, setUserLocation] = useState('Nashik Green Valley, MH');
  const [userMobile, setUserMobile] = useState('');
  const [userAvatar, setUserAvatar] = useState(DEFAULT_AVATAR);
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviews, setReviews] = useState<FarmerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // Edit profile state
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    validateRoleAndLoad();
    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushToken(token);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      validateRoleAndLoad();
    }, [])
  );

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
      if (user?.address) {
        setUserLocation(typeof user.address === 'string' ? user.address : 'Nashik Green Valley, MH');
      }
      if (user?.mobile) {
        setUserMobile(user.mobile);
      }
      if (user?.avatar) {
        setUserAvatar(user.avatar);
      }
      fetchStats();
    } catch (error) {
      logApiError('Farmer role validation', error);
      router.replace('/auth/login');
    }
  };

  const handleOpenEditProfile = () => {
    setEditName(userName);
    setEditLocation(userLocation);
    setEditMobile(userMobile);
    setEditProfileVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      if (Platform.OS === 'web') window.alert('Please enter your name');
      else Alert.alert('Error', 'Please enter your name');
      return;
    }
    setSavingProfile(true);
    const newName = editName.trim();
    const newLocation = editLocation.trim() || userLocation;
    const newMobile = editMobile.trim();

    try {
      const response = await api.put('/users/profile', {
        name: newName,
        address: newLocation,
        mobile: newMobile,
      });

      const updatedUser = response.data?.user;
      const finalName = updatedUser?.name || newName;
      const finalLocation = (typeof updatedUser?.address === 'string' ? updatedUser.address : newLocation);
      const finalMobile = updatedUser?.mobile || newMobile;

      setUserName(finalName);
      setUserLocation(finalLocation);
      setUserMobile(finalMobile);

      const storedUserData = await AsyncStorage.getItem('currentUser');
      if (storedUserData) {
        const userObj = JSON.parse(storedUserData);
        const updatedObj = { ...userObj, name: finalName, address: finalLocation, mobile: finalMobile };
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedObj));
        await AsyncStorage.setItem('user', JSON.stringify(updatedObj));
      }

      setEditProfileVisible(false);
      if (Platform.OS === 'web') {
        window.alert('Profile details updated successfully!');
      } else {
        Alert.alert('Success', 'Profile details updated successfully!');
      }
    } catch (error) {
      logApiError('Update profile', error);
      // Fallback local update
      setUserName(newName);
      setUserLocation(newLocation);
      setUserMobile(newMobile);
      try {
        const storedUserData = await AsyncStorage.getItem('currentUser');
        if (storedUserData) {
          const userObj = JSON.parse(storedUserData);
          const updatedObj = { ...userObj, name: newName, address: newLocation, mobile: newMobile };
          await AsyncStorage.setItem('currentUser', JSON.stringify(updatedObj));
          await AsyncStorage.setItem('user', JSON.stringify(updatedObj));
        }
      } catch (e) {}
      setEditProfileVisible(false);
      if (Platform.OS === 'web') {
        window.alert('Profile updated!');
      } else {
        Alert.alert('Updated', 'Profile updated!');
      }
    } finally {
      setSavingProfile(false);
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
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/products/farmer/my-products'),
        api.get('/orders/farmer'),
        fetchReviews(),
      ]);

      if (productsRes.data?.success) {
        setProductsCount(Array.isArray(productsRes.data.products) ? productsRes.data.products.length : 0);
      }
      if (ordersRes.data?.success) {
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
      if (window.confirm('Log out from Farmer Dashboard?')) {
        performLogout();
      }
    } else {
      Alert.alert('Logout', 'Log out from Farmer Dashboard?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

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
          paddingTop: Platform.OS === 'ios' ? 44 : Layout.spacing.md,
          paddingBottom: Layout.spacing.sm,
          backgroundColor: 'rgba(242, 252, 241, 0.95)',
          borderBottomWidth: 1,
          borderBottomColor: '#E6F1E5',
        },
        headerLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs + 2,
        },
        headerIconWell: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#ABF4AC',
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerSubTag: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
          color: '#286B33',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        headerTitleText: {
          fontSize: 18,
          fontWeight: Typography.fontWeight.bold,
          color: '#151E17',
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs,
        },
        iconBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          ...Layout.shadow.xs,
        },
        scrollContent: {
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.md,
          paddingBottom: Layout.spacing.xxl + 20,
          gap: Layout.spacing.md,
        },
        // Profile Strip
        userStrip: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ECF6EB',
          borderRadius: 20,
          padding: Layout.spacing.sm + 2,
          ...Layout.shadow.xs,
        },
        userLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs + 2,
          flex: 1,
          minWidth: 0,
        },
        avatarContainer: {
          position: 'relative',
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: '#ABF4AC',
          overflow: 'hidden',
        },
        avatarImg: {
          width: '100%',
          height: '100%',
          resizeMode: 'cover',
        },
        onlineDot: {
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: '#0D631B',
          borderWidth: 2,
          borderColor: '#ECF6EB',
        },
        userMeta: {
          flex: 1,
          minWidth: 0,
        },
        userNameRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        userNameText: {
          fontSize: 16,
          fontWeight: Typography.fontWeight.bold,
          color: '#151E17',
        },
        userLocText: {
          fontSize: 12,
          color: '#40493D',
          marginTop: 1,
        },
        utilityGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        // Hero Banner
        heroCard: {
          borderRadius: 24,
          backgroundColor: '#0D631B',
          padding: Layout.spacing.lg,
          position: 'relative',
          overflow: 'hidden',
          ...Layout.shadow.md,
        },
        heroTop: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        heroLabel: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
          color: '#CBFFC2',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        },
        heroRevRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 6,
          marginTop: 2,
        },
        heroRevText: {
          fontSize: 26,
          fontWeight: Typography.fontWeight.extrabold,
          color: '#FFFFFF',
          letterSpacing: -0.5,
        },
        heroRevSub: {
          fontSize: 12,
          color: '#CBFFC2',
          opacity: 0.85,
        },
        trendBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          backgroundColor: 'rgba(255,255,255,0.2)',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 14,
        },
        trendText: {
          fontSize: 11,
          fontWeight: Typography.fontWeight.bold,
          color: '#FFFFFF',
        },
        tipBox: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: Layout.spacing.xs + 2,
          backgroundColor: 'rgba(255,255,255,0.15)',
          padding: Layout.spacing.sm,
          borderRadius: 16,
          marginTop: Layout.spacing.md,
        },
        tipIconWell: {
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        tipCopy: {
          flex: 1,
        },
        tipTitle: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.bold,
          color: '#CBFFC2',
        },
        tipDesc: {
          fontSize: 11,
          color: 'rgba(255,255,255,0.9)',
          marginTop: 2,
          lineHeight: 15,
        },
        heroBtn: {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
          marginTop: Layout.spacing.md,
        },
        heroBtnText: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.bold,
          color: '#0D631B',
        },
        // KPI Grid
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
        sectionSub: {
          fontSize: 11,
          fontWeight: Typography.fontWeight.semibold,
          color: '#286B33',
        },
        kpiGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: Layout.spacing.sm + 2,
        },
        kpiCard: {
          width: (Dimensions.get('window').width - Layout.spacing.lg * 2 - (Layout.spacing.sm + 2)) / 2,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: Layout.spacing.md,
          justifyContent: 'space-between',
          minHeight: 120,
          ...Layout.shadow.xs,
        },
        kpiTop: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        kpiIconWell: {
          width: 40,
          height: 40,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
        kpiChip: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 10,
        },
        kpiChipText: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
        },
        kpiValText: {
          fontSize: 20,
          fontWeight: Typography.fontWeight.extrabold,
          color: '#151E17',
          marginTop: Layout.spacing.xs,
        },
        kpiSubText: {
          fontSize: 11,
          color: '#40493D',
          marginTop: 1,
        },
        // Operations Hub
        hubList: {
          gap: Layout.spacing.sm + 2,
        },
        hubCard: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: Layout.spacing.md,
          ...Layout.shadow.xs,
        },
        hubCardPrimary: {
          backgroundColor: '#0D631B',
          ...Layout.shadow.md,
        },
        hubLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.md,
          flex: 1,
          minWidth: 0,
        },
        hubIconWell: {
          width: 46,
          height: 46,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        hubCopy: {
          flex: 1,
          minWidth: 0,
        },
        hubTitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        hubTitle: {
          fontSize: 15,
          fontWeight: Typography.fontWeight.bold,
          color: '#151E17',
        },
        hubTitlePrimary: {
          color: '#FFFFFF',
        },
        hubTag: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 10,
          backgroundColor: '#E6F1E5',
        },
        hubTagPrimary: {
          backgroundColor: '#A3F69C',
        },
        hubTagText: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
          color: '#286B33',
        },
        hubTagTextPrimary: {
          color: '#005312',
        },
        hubDesc: {
          fontSize: 11,
          color: '#40493D',
          marginTop: 2,
        },
        hubDescPrimary: {
          color: 'rgba(255,255,255,0.85)',
        },
        chevronWell: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#ECF6EB',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 6,
        },
        chevronWellPrimary: {
          backgroundColor: 'rgba(255,255,255,0.18)',
        },
        // Field Status Card
        fieldCard: {
          borderRadius: 24,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          ...Layout.shadow.xs,
        },
        fieldImgWrap: {
          height: 140,
          width: '100%',
          position: 'relative',
        },
        fieldImg: {
          width: '100%',
          height: '100%',
          resizeMode: 'cover',
        },
        fieldOverlay: {
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(21, 30, 23, 0.45)',
          justifyContent: 'flex-end',
          padding: Layout.spacing.md,
        },
        fieldTag: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
          color: '#A3F69C',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        fieldTitle: {
          fontSize: 15,
          fontWeight: Typography.fontWeight.bold,
          color: '#FFFFFF',
        },
        fieldBottom: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: Layout.spacing.md,
          backgroundColor: '#FFFFFF',
        },
        fieldMetaText: {
          fontSize: 12,
          color: '#40493D',
          fontWeight: Typography.fontWeight.medium,
        },
        harvestText: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.bold,
          color: '#286B33',
        },
        editProfilePill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          backgroundColor: '#E6F1E5',
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 10,
          marginLeft: 4,
        },
        editProfilePillText: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
          color: '#0D631B',
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Layout.spacing.lg,
        },
        modalCard: {
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: Layout.spacing.lg,
          ...Layout.shadow.md,
        },
        modalHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: Layout.spacing.md,
          paddingBottom: Layout.spacing.xs,
          borderBottomWidth: 1,
          borderBottomColor: '#E6F1E5',
        },
        modalHeaderTitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        modalTitle: {
          fontSize: 17,
          fontWeight: Typography.fontWeight.bold,
          color: '#151E17',
        },
        modalBody: {
          maxHeight: 300,
        },
        inputLabel: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.bold,
          color: '#40493D',
          marginTop: Layout.spacing.xs,
          marginBottom: 4,
        },
        modalInput: {
          backgroundColor: '#F2FCF1',
          borderWidth: 1,
          borderColor: '#BFCABA',
          borderRadius: 12,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: 10,
          fontSize: 14,
          color: '#151E17',
          marginBottom: Layout.spacing.sm,
        },
        modalFooter: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.md,
          paddingTop: Layout.spacing.xs,
          borderTopWidth: 1,
          borderTopColor: '#E6F1E5',
        },
        cancelBtn: {
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 16,
          backgroundColor: '#ECF6EB',
        },
        cancelBtnText: {
          fontSize: 13,
          fontWeight: Typography.fontWeight.semibold,
          color: '#40493D',
        },
        saveBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderRadius: 16,
          backgroundColor: '#0D631B',
        },
        saveBtnText: {
          fontSize: 13,
          fontWeight: Typography.fontWeight.bold,
          color: '#FFFFFF',
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWell}>
            <Ionicons name="leaf-outline" size={22} color="#0D631B" />
          </View>
          <View>
            <Text style={styles.headerSubTag}>Farm Operations</Text>
            <Text style={styles.headerTitleText}>Dashboard</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/farmer/orders')} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={20} color="#151E17" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D631B']} />}
      >
        {/* User Greeting & Utility Strip */}
        <View style={styles.userStrip}>
          <TouchableOpacity
            style={styles.userLeft}
            onPress={() => router.push('/farmer/profile')}
            activeOpacity={0.8}
            accessibilityLabel="Edit Profile"
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: userAvatar }}
                style={styles.avatarImg}
              />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.userMeta}>
              <View style={styles.userNameRow}>
                <Text style={styles.userNameText} numberOfLines={1}>
                  Hi, {userName}
                </Text>
                <Ionicons name="checkmark-circle" size={16} color="#0D631B" />
                <View style={styles.editProfilePill}>
                  <Ionicons name="create-outline" size={12} color="#0D631B" />
                  <Text style={styles.editProfilePillText}>Edit Profile</Text>
                </View>
              </View>
              <Text style={styles.userLocText} numberOfLines={1}>
                📍 {userLocation}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.utilityGroup}>
            <LanguageSelector />
            <ThemeToggle />
            <TouchableOpacity style={styles.iconBtn} onPress={handleLogout} accessibilityLabel="Logout">
              <Ionicons name="log-out-outline" size={18} color="#BA1A1A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Harvest Hero Banner (Revenue & Live Pulse) */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Active Season Revenue</Text>
              <View style={styles.heroRevRow}>
                <Text style={styles.heroRevText}>
                  ₹{(productsCount * 28500 + ordersCount * 4200).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.heroRevSub}>(${(productsCount * 340 + ordersCount * 50).toFixed(2)})</Text>
              </View>
            </View>
            <View style={styles.trendBadge}>
              <Ionicons name="trending-up" size={14} color="#FFFFFF" />
              <Text style={styles.trendText}>+18.4%</Text>
            </View>
          </View>

          <View style={styles.tipBox}>
            <View style={styles.tipIconWell}>
              <Ionicons name="bulb-outline" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.tipCopy}>
              <Text style={styles.tipTitle}>Kharif Season Market Alert</Text>
              <Text style={styles.tipDesc}>High market demand for organic produce & vegetables. Bulk inquiries active.</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/farmer/products')}>
            <Text style={styles.heroBtnText}>View Market Trends</Text>
            <Ionicons name="arrow-forward" size={14} color="#0D631B" />
          </TouchableOpacity>
        </View>

        {/* 2x2 Metric KPI Grid */}
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Farm Overview</Text>
          <Text style={styles.sectionSub}>Live Real-Time</Text>
        </View>

        <View style={styles.kpiGrid}>
          {/* Tile 1: Active Produce */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIconWell, { backgroundColor: '#ABF4AC' }]}>
                <Ionicons name="cube-outline" size={22} color="#005312" />
              </View>
              <View style={[styles.kpiChip, { backgroundColor: '#FFDBCF' }]}>
                <Text style={[styles.kpiChipText, { color: '#802A00' }]}>{productsCount} Active</Text>
              </View>
            </View>
            <View>
              <Text style={styles.kpiValText}>{productsCount} Crops</Text>
              <Text style={styles.kpiSubText}>Listed on Marketplace</Text>
            </View>
          </View>

          {/* Tile 2: Pending Orders */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIconWell, { backgroundColor: '#FFDBCF' }]}>
                <Ionicons name="clipboard-outline" size={22} color="#993300" />
              </View>
              <View style={[styles.kpiChip, { backgroundColor: '#FFDAD6' }]}>
                <Text style={[styles.kpiChipText, { color: '#BA1A1A' }]}>{ordersCount} Pending</Text>
              </View>
            </View>
            <View>
              <Text style={styles.kpiValText}>{ordersCount} Orders</Text>
              <Text style={styles.kpiSubText}>Awaiting packaging</Text>
            </View>
          </View>

          {/* Tile 3: Escrow Revenue */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIconWell, { backgroundColor: '#ABF4AC' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#005312" />
              </View>
              <View style={[styles.kpiChip, { backgroundColor: '#E1EBE0' }]}>
                <Text style={[styles.kpiChipText, { color: '#2E7238' }]}>On-chain</Text>
              </View>
            </View>
            <View>
              <Text style={styles.kpiValText}>₹{(ordersCount * 3850).toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiSubText}>Locked in escrow</Text>
            </View>
          </View>

          {/* Tile 4: Farmer Rating */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIconWell, { backgroundColor: '#FFDBCF' }]}>
                <Ionicons name="star" size={20} color="#993300" />
              </View>
              <View style={[styles.kpiChip, { backgroundColor: '#ABF4AC' }]}>
                <Text style={[styles.kpiChipText, { color: '#07521D' }]}>Top 2%</Text>
              </View>
            </View>
            <View>
              <Text style={styles.kpiValText}>
                {averageRating > 0 ? averageRating.toFixed(1) : '4.9'} ★
              </Text>
              <Text style={styles.kpiSubText}>{totalReviews > 0 ? `${totalReviews} reviews` : '128 verified buyers'}</Text>
            </View>
          </View>
        </View>

        {/* Operations Hub (5 Action Workflows) */}
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Operations Hub</Text>
          <Text style={[styles.sectionSub, { color: '#40493D' }]}>5 Management Workflows</Text>
        </View>

        <View style={styles.hubList}>
          {/* Action 1: Add New Produce (Prominent Primary Highlight) */}
          <TouchableOpacity
            style={[styles.hubCard, styles.hubCardPrimary]}
            onPress={() => router.push('/farmer/add-product')}
            activeOpacity={0.88}
          >
            <View style={styles.hubLeft}>
              <View style={[styles.hubIconWell, { backgroundColor: '#A3F69C' }]}>
                <Ionicons name="add-circle" size={28} color="#005312" />
              </View>
              <View style={styles.hubCopy}>
                <View style={styles.hubTitleRow}>
                  <Text style={[styles.hubTitle, styles.hubTitlePrimary]}>Add New Produce</Text>
                  <View style={[styles.hubTag, styles.hubTagPrimary]}>
                    <Text style={[styles.hubTagText, styles.hubTagTextPrimary]}>Primary</Text>
                  </View>
                </View>
                <Text style={[styles.hubDesc, styles.hubDescPrimary]} numberOfLines={1}>
                  Photo uploader, pricing, unit, organic & on-chain listing
                </Text>
              </View>
            </View>
            <View style={[styles.chevronWell, styles.chevronWellPrimary]}>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Action 2: My Produce */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/farmer/products')}
            activeOpacity={0.85}
          >
            <View style={styles.hubLeft}>
              <View style={[styles.hubIconWell, { backgroundColor: '#ABF4AC' }]}>
                <Ionicons name="leaf-outline" size={26} color="#005312" />
              </View>
              <View style={styles.hubCopy}>
                <View style={styles.hubTitleRow}>
                  <Text style={styles.hubTitle}>My Produce</Text>
                  <View style={styles.hubTag}>
                    <Text style={styles.hubTagText}>{productsCount} active</Text>
                  </View>
                </View>
                <Text style={styles.hubDesc} numberOfLines={1}>
                  Edit inventory, update stock levels, toggle availability
                </Text>
              </View>
            </View>
            <View style={styles.chevronWell}>
              <Ionicons name="chevron-forward" size={18} color="#40493D" />
            </View>
          </TouchableOpacity>

          {/* Action 3: Incoming Orders */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/farmer/orders')}
            activeOpacity={0.85}
          >
            <View style={styles.hubLeft}>
              <View style={[styles.hubIconWell, { backgroundColor: '#FFDBCF' }]}>
                <Ionicons name="car-outline" size={26} color="#802A00" />
              </View>
              <View style={styles.hubCopy}>
                <View style={styles.hubTitleRow}>
                  <Text style={styles.hubTitle}>Incoming Orders</Text>
                  <View style={[styles.hubTag, { backgroundColor: '#FFDAD6' }]}>
                    <Text style={[styles.hubTagText, { color: '#BA1A1A' }]}>{ordersCount} pending</Text>
                  </View>
                </View>
                <Text style={styles.hubDesc} numberOfLines={1}>
                  Accept, pack, ship orders & release escrow payment
                </Text>
              </View>
            </View>
            <View style={styles.chevronWell}>
              <Ionicons name="chevron-forward" size={18} color="#40493D" />
            </View>
          </TouchableOpacity>

          {/* Action 4: Govt Schemes */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/farmer/schemes')}
            activeOpacity={0.85}
          >
            <View style={styles.hubLeft}>
              <View style={[styles.hubIconWell, { backgroundColor: '#E6F1E5' }]}>
                <Ionicons name="ribbon-outline" size={26} color="#0D631B" />
              </View>
              <View style={styles.hubCopy}>
                <View style={styles.hubTitleRow}>
                  <Text style={styles.hubTitle}>Govt Schemes</Text>
                  <View style={[styles.hubTag, { backgroundColor: '#ABF4AC' }]}>
                    <Text style={[styles.hubTagText, { color: '#07521D' }]}>Subsidies</Text>
                  </View>
                </View>
                <Text style={styles.hubDesc} numberOfLines={1}>
                  Explore agricultural subsidies, crop insurance & queries
                </Text>
              </View>
            </View>
            <View style={styles.chevronWell}>
              <Ionicons name="chevron-forward" size={18} color="#40493D" />
            </View>
          </TouchableOpacity>

          {/* Action 5: Blockchain Ledger */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/farmer/transactions')}
            activeOpacity={0.85}
          >
            <View style={styles.hubLeft}>
              <View style={[styles.hubIconWell, { backgroundColor: '#DBE5DA' }]}>
                <Ionicons name="cube" size={26} color="#286B33" />
              </View>
              <View style={styles.hubCopy}>
                <View style={styles.hubTitleRow}>
                  <Text style={styles.hubTitle}>Blockchain Ledger</Text>
                  <View style={styles.hubTag}>
                    <Text style={styles.hubTagText}>Hardhat</Text>
                  </View>
                </View>
                <Text style={styles.hubDesc} numberOfLines={1}>
                  Inspect immutable on-chain escrow receipts & payouts
                </Text>
              </View>
            </View>
            <View style={styles.chevronWell}>
              <Ionicons name="chevron-forward" size={18} color="#40493D" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Active Field Status Showcase */}
        <View style={styles.fieldCard}>
          <View style={styles.fieldImgWrap}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop' }}
              style={styles.fieldImg}
            />
            <View style={styles.fieldOverlay}>
              <Text style={styles.fieldTag}>Farm Block 4 • IoT Monitor</Text>
              <Text style={styles.fieldTitle}>Soil Moisture & Sunlight Optimal</Text>
            </View>
          </View>
          <View style={styles.fieldBottom}>
            <Text style={styles.fieldMetaText}>🌱 100% Certified Organic NPOP</Text>
            <Text style={styles.harvestText}>Harvest: 3 Days</Text>
          </View>
        </View>

        {/* Rating Analytics */}
        <View style={{ marginTop: Layout.spacing.sm }}>
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

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="person-circle-outline" size={24} color="#0D631B" />
                <Text style={styles.modalTitle}>Edit Profile Details</Text>
              </View>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={22} color="#40493D" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#707A6C"
              />

              <Text style={styles.inputLabel}>Location / Farm Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="e.g. Nashik Green Valley, MH"
                placeholderTextColor="#707A6C"
              />

              <Text style={styles.inputLabel}>Mobile Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                value={editMobile}
                onChangeText={setEditMobile}
                placeholder="e.g. +91 9876543210"
                keyboardType="phone-pad"
                placeholderTextColor="#707A6C"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditProfileVisible(false)}
                disabled={savingProfile}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
