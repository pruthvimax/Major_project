import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import { useCart, type CartItem } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import LanguageSelector from '../../components/LanguageSelector';
import ThemeToggle from '../../components/ThemeToggle';
import EditProfileModal from '../../components/profile/EditProfileModal';
import { Badge, Button, Input } from '../../components/ui';
import type { BadgeTone } from '../../components/ui';

interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  isOrganic: boolean;
  blockchainId?: number;
  images?: string[];
  averageRating?: number;
  reviewCount?: number;
  location?: {
    address?: string;
  };
  farmer?: {
    name?: string;
    email?: string;
  };
}

interface OrderItem {
  product?: {
    _id?: string;
    name?: string;
    price?: number;
    unit?: string;
  };
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'confirmed' | 'packed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'bank_transfer' | 'blockchain' | 'razorpay';
  blockchainTxHash?: string;
  items: OrderItem[];
  createdAt: string;
}

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'apps-outline', bg: '#e8f8ee', color: '#6cc51d' },
  { id: 'vegetables', name: 'Vegetables', icon: 'leaf-outline', bg: '#e8f8ee', color: '#2ec572' },
  { id: 'fruits', name: 'Fruits', icon: 'nutrition-outline', bg: '#feebee', color: '#fa6365' },
  { id: 'beverages', name: 'Beverages', icon: 'wine-outline', bg: '#fef7e3', color: '#f7b828' },
  { id: 'grocery', name: 'Grocery', icon: 'basket-outline', bg: '#f4effc', color: '#a874e8' },
  { id: 'edible_oil', name: 'Edible oil', icon: 'water-outline', bg: '#e3f9fb', color: '#22c7d9' },
  { id: 'household', name: 'Household', icon: 'sparkles-outline', bg: '#fdebf3', color: '#f163a3' },
];

const HALO_COLORS = ['#fedccf', '#f4fbce', '#e8f8ee', '#feebee', '#fef7e3', '#f4effc', '#e3f9fb'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Placed',
  confirmed: 'Confirmed',
  accepted: 'Confirmed',
  processing: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const TRACKING_STEPS = [
  { key: 'placed', label: 'Placed', icon: 'receipt-outline' as const },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' as const },
  { key: 'shipped', label: 'Shipped', icon: 'car-outline' as const },
  { key: 'delivered', label: 'Delivered', icon: 'home-outline' as const },
];

const getMilestoneIndex = (status: string) => {
  if (status === 'delivered') return 3;
  if (status === 'shipped') return 2;
  if (['accepted', 'confirmed', 'packed', 'processing'].includes(status)) return 1;
  return 0; // pending / placed
};

export default function BuyerDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { addToCart, items: cartItems, updateQuantity, removeItem, summary } = useCart();
  const { t } = useLanguage();

  const [userName, setUserName] = useState('Buyer');
  const [userEmail, setUserEmail] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [addingId, setAddingId] = useState<string | null>(null);

  // Rating Modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingProductId, setRatingProductId] = useState<string | null>(null);
  const [ratingProductName, setRatingProductName] = useState('');
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [reviewedProductIds, setReviewedProductIds] = useState<string[]>([]);

  useEffect(() => {
    validateRoleAndLoad();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
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
      if (user.role !== 'buyer') {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
        return;
      }
      setUserName(user.name || 'Buyer');
      if (user.email) setUserEmail(user.email);
      if (user.mobile) setUserMobile(user.mobile);
      if (user.address) setUserLocation(typeof user.address === 'string' ? user.address : '');
      if (user.profileImage || user.avatar) setUserAvatar(user.profileImage || user.avatar);
      fetchProducts();
      fetchOrders();
    } catch (error) {
      logApiError('Buyer role validation', error);
      router.replace('/auth/login');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      logApiError('Buyer load products', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await api.get('/orders/buyer');
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (error) {
      logApiError('Buyer load orders', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleLogout = () => {
    setProfileMenuVisible(false);
    const performLogout = async () => {
      try {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
      } catch (error) {
        logApiError('Buyer logout', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Log out from Buyer Dashboard?')) {
        performLogout();
      }
    } else {
      Alert.alert('Sign Out', 'Log out from Buyer Dashboard?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleAddToCart = async (product: Product) => {
    try {
      setAddingId(product._id);
      const res = await addToCart(product._id, 1);
      if (res.success) {
        if (Platform.OS === 'web') {
          window.alert(`Added "${product.name}" to cart`);
        } else {
          Alert.alert('Cart', `Added "${product.name}" to cart`);
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(res.message);
        } else {
          Alert.alert('Cart', res.message);
        }
      }
    } finally {
      setAddingId(null);
    }
  };

  // Get current quantity of item in cart safely
  const getCartQuantity = (productId: string) => {
    if (!Array.isArray(cartItems)) return 0;
    const item = cartItems.find((i: CartItem) =>
      typeof i.product === 'string' ? i.product === productId : i.product?._id === productId
    );
    return item ? item.quantity : 0;
  };

  const handleIncrement = async (productId: string) => {
    if (!Array.isArray(cartItems)) {
      await addToCart(productId, 1);
      return;
    }
    const item = cartItems.find((i: CartItem) =>
      typeof i.product === 'string' ? i.product === productId : i.product?._id === productId
    );
    if (item) {
      await updateQuantity(productId, item.quantity + 1);
    } else {
      await addToCart(productId, 1);
    }
  };

  const handleDecrement = async (productId: string) => {
    if (!Array.isArray(cartItems)) return;
    const item = cartItems.find((i: CartItem) =>
      typeof i.product === 'string' ? i.product === productId : i.product?._id === productId
    );
    if (item) {
      if (item.quantity <= 1) {
        await removeItem(productId);
      } else {
        await updateQuantity(productId, item.quantity - 1);
      }
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products;

    if (search.trim() !== '') {
      const query = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      if (selectedCategory === 'organic') {
        result = result.filter((p) => p.isOrganic);
      } else {
        result = result.filter((p) => p.category?.toLowerCase() === selectedCategory.toLowerCase());
      }
    }

    return result;
  }, [products, search, selectedCategory]);

  // Active / recent orders calculation
  const activeOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    // Prefer non-cancelled and in-progress order
    const inProgress = orders.find((o) =>
      ['pending', 'accepted', 'confirmed', 'packed', 'processing', 'shipped'].includes(o.status)
    );
    return inProgress || orders[0];
  }, [orders]);

  // Format date helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Status badge tone
  const getStatusTone = (status: string): BadgeTone => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'pending':
        return 'warning';
      case 'accepted':
      case 'confirmed':
      case 'packed':
      case 'processing':
      case 'shipped':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'neutral';
    }
  };

  // Open review modal
  const handleOpenReview = (productId: string, productName: string) => {
    setRatingProductId(productId);
    setRatingProductName(productName);
    setRatingValue(5);
    setRatingComment('');
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (!ratingProductId) return;
    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
      const msg = 'Please choose a rating between 1 and 5 stars';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Rating', msg);
      return;
    }

    try {
      setSubmittingRating(true);
      const res = await api.post('/reviews', {
        productId: ratingProductId,
        rating: ratingValue,
        comment: ratingComment.trim(),
      });

      if (res.data.success) {
        const successMsg = 'Thank you for your rating and review!';
        if (Platform.OS === 'web') window.alert(successMsg);
        else Alert.alert('Review Submitted', successMsg);
        setReviewedProductIds((prev) => [...prev, ratingProductId]);
        setRatingModalVisible(false);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Could not submit review.';
      if (Platform.OS === 'web') window.alert(errMsg);
      else Alert.alert('Review Error', errMsg);
    } finally {
      setSubmittingRating(false);
    }
  };

  // Safe area & responsive dimensions
  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0
  );
  const safeTopPadding = safeTop > 0 ? safeTop + Layout.spacing.sm : (Platform.OS === 'ios' ? 44 : Layout.spacing.md);

  const isDesktop = windowWidth >= 960;
  const isTablet = windowWidth >= 640 && windowWidth < 960;

  // Responsive product card width
  const cardWidth = useMemo(() => {
    if (isDesktop) {
      // 4 columns constrained to 1200px container
      const containerWidth = Math.min(windowWidth, 1200);
      return Math.floor((containerWidth - Layout.spacing.lg * 2 - Layout.spacing.md * 3) / 4);
    }
    if (isTablet) {
      // 3 columns
      return Math.floor((windowWidth - Layout.spacing.lg * 2 - Layout.spacing.md * 2) / 3);
    }
    // Mobile: 2 columns
    return Math.floor((windowWidth - Layout.spacing.lg * 2 - Layout.spacing.md) / 2);
  }, [windowWidth, isDesktop, isTablet]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: '#F7F9FA',
        },
        headerBar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: safeTopPadding,
          paddingBottom: Layout.spacing.xs,
          backgroundColor: colors.card,
        },
        greetingTitle: {
          fontSize: Typography.fontSize.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        greetingSub: {
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs,
        },
        searchSection: {
          paddingHorizontal: Layout.spacing.lg,
          paddingVertical: Layout.spacing.sm,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        searchContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F0F3F6',
          borderRadius: Layout.borderRadius.lg,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Platform.OS === 'ios' ? 10 : 6,
        },
        searchInput: {
          flex: 1,
          fontSize: Typography.fontSize.sm,
          color: colors.text,
          marginLeft: Layout.spacing.xs,
          padding: 0,
        },
        scrollContent: {
          paddingBottom: 110,
        },
        contentWrapper: {
          width: '100%',
          maxWidth: 1200,
          alignSelf: 'center',
        },
        // Banner
        bannerSection: {
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.md,
        },
        bannerCard: {
          height: 160,
          borderRadius: Layout.borderRadius.xl,
          overflow: 'hidden',
          backgroundColor: '#CDE4E8',
          position: 'relative',
        },
        bannerImage: {
          width: '100%',
          height: '100%',
          position: 'absolute',
        },
        bannerOverlay: {
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(255,255,255,0.45)',
          justifyContent: 'center',
          paddingHorizontal: Layout.spacing.xl,
        },
        bannerTitle: {
          fontSize: 22,
          fontWeight: Typography.fontWeight.bold,
          color: '#1A202C',
          lineHeight: 28,
          maxWidth: 170,
        },
        dotsRow: {
          position: 'absolute',
          bottom: 14,
          left: Layout.spacing.xl,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        dotActive: {
          width: 24,
          height: 6,
          borderRadius: 3,
          backgroundColor: '#6CC51D',
        },
        dotInactive: {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.8)',
        },
        // Section Headers
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Layout.spacing.lg,
          marginTop: Layout.spacing.lg,
          marginBottom: Layout.spacing.sm,
        },
        sectionTitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs,
        },
        sectionTitle: {
          fontSize: 17,
          fontWeight: Typography.fontWeight.bold,
          color: '#1A202C',
        },
        seeAllText: {
          fontSize: Typography.fontSize.xs,
          color: colors.primary,
          fontWeight: Typography.fontWeight.semibold,
        },

        // Track Order Card
        trackOrderSection: {
          paddingHorizontal: Layout.spacing.lg,
          marginTop: Layout.spacing.md,
        },
        trackOrderCard: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          ...Layout.shadow.sm,
        },
        trackOrderHeader: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingBottom: Layout.spacing.sm,
        },
        trackOrderNumber: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        trackOrderDate: {
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
          marginTop: 2,
        },
        // Stepper
        stepperContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginVertical: Layout.spacing.md,
          paddingHorizontal: Layout.spacing.xs,
        },
        stepItem: {
          alignItems: 'center',
          zIndex: 2,
        },
        stepDot: {
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
          borderWidth: 2,
          borderColor: colors.border,
        },
        stepDotActive: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        stepDotDone: {
          backgroundColor: colors.primarySoft,
          borderColor: colors.primary,
        },
        stepLabel: {
          fontSize: 10,
          color: colors.textSecondary,
          marginTop: 4,
          fontWeight: Typography.fontWeight.medium,
        },
        stepLabelActive: {
          color: colors.primary,
          fontWeight: Typography.fontWeight.bold,
        },
        stepLine: {
          flex: 1,
          height: 3,
          backgroundColor: colors.border,
          marginHorizontal: -6,
          marginBottom: 16,
          zIndex: 1,
        },
        stepLineDone: {
          backgroundColor: colors.primary,
        },
        trackOrderFooter: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.xs,
          paddingTop: Layout.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        trackOrderSummary: {
          flex: 1,
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
        },
        trackOrderBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: colors.primary,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: 8,
          borderRadius: Layout.borderRadius.md,
        },
        trackOrderBtnText: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.bold,
          color: '#FFFFFF',
        },
        noOrderCard: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.lg,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          ...Layout.shadow.xs,
        },
        noOrderTitle: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          marginTop: Layout.spacing.xs,
        },
        noOrderSub: {
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: 2,
          marginBottom: Layout.spacing.md,
        },

        // Categories
        categoryList: {
          paddingHorizontal: Layout.spacing.lg,
          gap: Layout.spacing.md,
        },
        categoryItem: {
          alignItems: 'center',
          marginRight: Layout.spacing.sm,
        },
        categoryCircle: {
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: 'center',
          justifyContent: 'center',
        },
        categoryCircleActive: {
          borderWidth: 2,
          borderColor: '#6CC51D',
        },
        categoryName: {
          fontSize: 11,
          fontWeight: Typography.fontWeight.medium,
          color: colors.textSecondary,
          marginTop: 6,
        },
        categoryNameActive: {
          color: '#6CC51D',
          fontWeight: Typography.fontWeight.bold,
        },

        // Products Grid
        productsGrid: {
          paddingHorizontal: Layout.spacing.lg,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: Layout.spacing.md,
          justifyContent: isDesktop ? 'flex-start' : 'space-between',
        },
        productCard: {
          width: cardWidth,
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          justifyContent: 'space-between',
          ...Layout.shadow.xs,
        },
        badgeNew: {
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: '#FEDBA0',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderBottomRightRadius: 6,
          zIndex: 10,
        },
        badgeNewText: {
          fontSize: 9,
          fontWeight: Typography.fontWeight.bold,
          color: '#C47F00',
          textTransform: 'uppercase',
        },
        favBtn: {
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
        },
        cardTop: {
          paddingTop: Layout.spacing.md,
          paddingBottom: Layout.spacing.xs,
          paddingHorizontal: Layout.spacing.sm,
          alignItems: 'center',
          width: '100%',
        },
        haloCircle: {
          width: 88,
          height: 88,
          borderRadius: 44,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          alignSelf: 'center',
          padding: 8,
          marginBottom: Layout.spacing.xs,
        },
        productImage: {
          width: '100%',
          height: '100%',
          resizeMode: 'contain',
          alignSelf: 'center',
        },
        productPrice: {
          fontSize: 13,
          fontWeight: Typography.fontWeight.bold,
          color: '#6CC51D',
          marginTop: Layout.spacing.xs,
        },
        productTitle: {
          fontSize: 14,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
          marginTop: 2,
        },
        productUnit: {
          fontSize: 11,
          color: colors.textSecondary,
          marginTop: 2,
        },
        cardActionArea: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          marginTop: Layout.spacing.xs,
        },
        addToCartBtn: {
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        },
        addToCartText: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
        },
        qtyRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 10,
          paddingVertical: 6,
        },
        qtyBtn: {
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        qtyBtnText: {
          fontSize: 16,
          fontWeight: Typography.fontWeight.bold,
          color: '#6CC51D',
        },
        qtyValue: {
          fontSize: 13,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
        },

        // Transaction History Section
        transactionsSection: {
          paddingHorizontal: Layout.spacing.lg,
          marginTop: Layout.spacing.xs,
          gap: Layout.spacing.sm,
        },
        txCard: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          ...Layout.shadow.xs,
        },
        txTopRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
        },
        txRefRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
        },
        txIconWell: {
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        txRefText: {
          fontSize: Typography.fontSize.sm,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        txDateText: {
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
        },
        txAmount: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.primary,
        },
        txMetaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: Layout.spacing.xs,
          marginVertical: Layout.spacing.sm,
        },
        txItemsSummary: {
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
          lineHeight: Typography.leading.xs,
        },
        txActionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: Layout.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: Layout.spacing.xs + 2,
          marginTop: Layout.spacing.xs,
        },
        txSmallBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: 5,
          paddingHorizontal: 10,
          borderRadius: Layout.borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        txSmallBtnText: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
        },
        rateBtn: {
          backgroundColor: colors.primarySoft,
          borderColor: colors.primarySoft,
        },
        rateBtnText: {
          color: colors.primary,
          fontWeight: Typography.fontWeight.bold,
        },

        // Floating Cart FAB
        fabCart: {
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: '#6CC51D',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#6CC51D',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 999,
        },
        badgeCount: {
          position: 'absolute',
          top: -2,
          right: -2,
          backgroundColor: '#E53E3E',
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
          borderWidth: 2,
          borderColor: '#FFF',
        },
        badgeCountText: {
          color: '#FFF',
          fontSize: 10,
          fontWeight: Typography.fontWeight.bold,
        },
        emptyState: {
          padding: Layout.spacing.xxl,
          alignItems: 'center',
        },
        emptyText: {
          fontSize: 14,
          color: colors.textSecondary,
          marginTop: Layout.spacing.sm,
        },

        // Header Profile Button
        profileAvatarBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
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
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#0D631B',
          borderWidth: 1.5,
          borderColor: isDark ? '#1C261F' : '#FFFFFF',
        },

        // Modal Dropdown
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
        },
        dropdownAnchor: {
          position: 'absolute',
          top: safeTopPadding + 50,
          right: Layout.spacing.md,
          width: Math.min(windowWidth - Layout.spacing.md * 2, 290),
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
        dropdownActiveDot: {
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: '#0D631B',
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

        // Rating Modal
        ratingModalOverlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: Layout.spacing.lg,
        },
        ratingModalCard: {
          width: '100%',
          maxWidth: 420,
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.xl,
          padding: Layout.spacing.xl,
          ...Layout.shadow.lg,
        },
        ratingModalTitle: {
          fontSize: Typography.fontSize.xl,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
        },
        ratingModalSub: {
          fontSize: Typography.fontSize.sm,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: Layout.spacing.xs,
        },
        starsRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          marginVertical: Layout.spacing.lg,
        },
        starBtn: {
          padding: Layout.spacing.xs,
        },
        ratingModalButtons: {
          flexDirection: 'row',
          gap: Layout.spacing.md,
          marginTop: Layout.spacing.md,
        },
        ratingModalBtn: {
          flex: 1,
        },
      }),
    [colors, safeTopPadding, isDark, cardWidth, windowWidth, isDesktop]
  );

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: Layout.spacing.xs }}>
          <Text style={styles.greetingTitle} numberOfLines={1}>Hi, {userName}</Text>
          <Text style={styles.greetingSub} numberOfLines={1}>Fresh farm produce, straight to you</Text>
        </View>
        <View style={styles.headerRight}>
          <LanguageSelector />
          <ThemeToggle />
          <TouchableOpacity
            style={[styles.profileAvatarBtn, profileMenuVisible && styles.profileAvatarBtnActive]}
            onPress={() => setProfileMenuVisible((prev) => !prev)}
            accessibilityLabel="Buyer Profile & Menu"
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

      {/* Search Header */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search fresh produce, fruits, grains..."
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity onPress={() => router.push('/buyer/browse')}>
            <Ionicons name="options-outline" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          {/* Promotional Banner */}
          <View style={styles.bannerSection}>
            <View style={styles.bannerCard}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600&auto=format&fit=crop',
                }}
                style={styles.bannerImage}
              />
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle}>20% off on your{'\n'}first purchase</Text>
              </View>
              <View style={styles.dotsRow}>
                <View style={styles.dotActive} />
                <View style={styles.dotInactive} />
                <View style={styles.dotInactive} />
                <View style={styles.dotInactive} />
              </View>
            </View>
          </View>

          {/* ────────────────────────────────────────────── */}
          {/* 1. TRACK ORDER SECTION */}
          {/* ────────────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="navigate-outline" size={20} color="#6CC51D" />
              <Text style={styles.sectionTitle}>Track Order</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/buyer/orders')}>
              <Text style={styles.seeAllText}>All Orders</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trackOrderSection}>
            {loadingOrders ? (
              <ActivityIndicator size="small" color="#6CC51D" style={{ marginVertical: 12 }} />
            ) : activeOrder ? (
              <View style={styles.trackOrderCard}>
                <View style={styles.trackOrderHeader}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.trackOrderNumber} numberOfLines={1}>
                      {activeOrder.orderNumber}
                    </Text>
                    <Text style={styles.trackOrderDate}>
                      Placed on {formatDate(activeOrder.createdAt)}
                    </Text>
                  </View>
                  <Badge
                    label={(STATUS_LABELS[activeOrder.status] || activeOrder.status).toUpperCase()}
                    tone={getStatusTone(activeOrder.status)}
                    size="sm"
                  />
                </View>

                {/* Progress Stepper */}
                {activeOrder.status !== 'cancelled' ? (
                  <View style={styles.stepperContainer}>
                    {TRACKING_STEPS.map((step, idx) => {
                      const curIndex = getMilestoneIndex(activeOrder.status);
                      const isDone = idx <= curIndex;
                      const isActive = idx === curIndex;
                      return (
                        <React.Fragment key={step.key}>
                          <View style={styles.stepItem}>
                            <View
                              style={[
                                styles.stepDot,
                                isDone && styles.stepDotDone,
                                isActive && styles.stepDotActive,
                              ]}
                            >
                              <Ionicons
                                name={isDone ? 'checkmark' : step.icon}
                                size={14}
                                color={isActive ? '#FFFFFF' : isDone ? '#0D631B' : '#94A3B8'}
                              />
                            </View>
                            <Text
                              style={[
                                styles.stepLabel,
                                isActive && styles.stepLabelActive,
                              ]}
                            >
                              {step.label}
                            </Text>
                          </View>
                          {idx < TRACKING_STEPS.length - 1 && (
                            <View
                              style={[
                                styles.stepLine,
                                idx < curIndex && styles.stepLineDone,
                              ]}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={{ fontSize: Typography.fontSize.xs, color: colors.error, marginVertical: 8 }}>
                    This order was cancelled.
                  </Text>
                )}

                {/* Summary & Action */}
                <View style={styles.trackOrderFooter}>
                  <Text style={styles.trackOrderSummary} numberOfLines={1}>
                    {activeOrder.items?.length || 1} item(s) · ₹{activeOrder.totalAmount?.toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    style={styles.trackOrderBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/buyer/track-order',
                        params: { orderId: activeOrder._id },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Track live order status"
                  >
                    <Ionicons name="location-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.trackOrderBtnText}>Track Order</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.noOrderCard}>
                <Ionicons name="cube-outline" size={32} color="#94A3B8" />
                <Text style={styles.noOrderTitle}>No Active Orders</Text>
                <Text style={styles.noOrderSub}>
                  When you purchase fresh produce, live tracking updates will appear right here.
                </Text>
                <Button
                  title="Browse Marketplace"
                  size="sm"
                  onPress={() => router.push('/buyer/browse')}
                />
              </View>
            )}
          </View>

          {/* Categories Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => router.push('/buyer/browse')}>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryItem}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categoryCircle,
                      { backgroundColor: cat.bg },
                      isSelected && styles.categoryCircleActive,
                    ]}
                  >
                    <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                  </View>
                  <Text style={[styles.categoryName, isSelected && styles.categoryNameActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ────────────────────────────────────────────── */}
          {/* 2. FEATURED PRODUCTS (Fixed Image & Responsiveness) */}
          {/* ────────────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity onPress={() => router.push('/buyer/browse')}>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6CC51D" style={{ marginTop: 20 }} />
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="leaf-outline" size={42} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No products available in this category.</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product, index) => {
                const isFav = !!favorites[product._id];
                const qtyInCart = getCartQuantity(product._id);
                const haloColor = HALO_COLORS[index % HALO_COLORS.length];
                const imgUri =
                  product.images && product.images[0]
                    ? product.images[0]
                    : 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&auto=format&fit=crop';

                return (
                  <View key={product._id} style={styles.productCard}>
                    {product.isOrganic && (
                      <View style={styles.badgeNew}>
                        <Text style={styles.badgeNewText}>ORGANIC</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.favBtn}
                      onPress={() => toggleFavorite(product._id)}
                    >
                      <Ionicons
                        name={isFav ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isFav ? '#E53E3E' : '#CBD5E1'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cardTop}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: '/buyer/checkout',
                          params: {
                            productId: product._id,
                            name: product.name,
                            price: product.price.toString(),
                            unit: product.unit,
                            farmerName: product.farmer?.name || 'Farmer',
                            availableQuantity: product.quantity.toString(),
                          },
                        })
                      }
                    >
                      <View style={[styles.haloCircle, { backgroundColor: haloColor }]}>
                        <Image source={{ uri: imgUri }} style={styles.productImage} />
                      </View>
                      <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
                      <Text style={styles.productTitle} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.productUnit}>{product.unit || 'kg'}</Text>
                    </TouchableOpacity>

                    {/* Quantity controls or Add to Cart button */}
                    <View style={styles.cardActionArea}>
                      {qtyInCart > 0 ? (
                        <View style={styles.qtyRow}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => handleDecrement(product._id)}
                          >
                            <Text style={styles.qtyBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyValue}>{qtyInCart}</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => handleIncrement(product._id)}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addToCartBtn}
                          onPress={() => handleAddToCart(product)}
                          disabled={addingId === product._id}
                        >
                          <Ionicons name="bag-handle-outline" size={16} color="#475569" />
                          <Text style={styles.addToCartText}>Add to cart</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ────────────────────────────────────────────── */}
          {/* 3. TRANSACTION HISTORY SECTION */}
          {/* ────────────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="wallet-outline" size={20} color="#D97706" />
              <Text style={styles.sectionTitle}>Transaction History</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/buyer/transactions')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsSection}>
            {loadingOrders ? (
              <ActivityIndicator size="small" color="#D97706" style={{ marginVertical: 12 }} />
            ) : orders.length === 0 ? (
              <View style={styles.noOrderCard}>
                <Ionicons name="receipt-outline" size={30} color="#94A3B8" />
                <Text style={styles.noOrderTitle}>No Transactions Yet</Text>
                <Text style={styles.noOrderSub}>
                  Your purchases, payment statuses, and escrow records will be listed here.
                </Text>
              </View>
            ) : (
              orders.slice(0, 3).map((order) => {
                const firstItem = order.items?.[0];
                const prodId = firstItem?.product?._id;
                const prodName = firstItem?.product?.name || 'Produce Item';
                const hasReviewed = prodId ? reviewedProductIds.includes(prodId) : false;

                const paymentBadgeTone: BadgeTone =
                  order.paymentStatus === 'paid'
                    ? 'success'
                    : order.paymentStatus === 'failed'
                    ? 'error'
                    : 'warning';

                return (
                  <View key={order._id} style={styles.txCard}>
                    <View style={styles.txTopRow}>
                      <View style={styles.txRefRow}>
                        <View style={styles.txIconWell}>
                          <Ionicons name="receipt-outline" size={17} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.txRefText} numberOfLines={1}>
                            {order.orderNumber}
                          </Text>
                          <Text style={styles.txDateText}>{formatDate(order.createdAt)}</Text>
                        </View>
                      </View>
                      <Text style={styles.txAmount}>₹{order.totalAmount.toFixed(2)}</Text>
                    </View>

                    <View style={styles.txMetaRow}>
                      <Badge
                        label={order.paymentStatus.toUpperCase()}
                        tone={paymentBadgeTone}
                        size="sm"
                      />
                      <Badge
                        label={order.paymentMethod.replace('_', ' ').toUpperCase()}
                        tone="neutral"
                        size="sm"
                      />
                      <Badge
                        label={(STATUS_LABELS[order.status] || order.status).toUpperCase()}
                        tone={getStatusTone(order.status)}
                        size="sm"
                      />
                    </View>

                    <Text style={styles.txItemsSummary} numberOfLines={2}>
                      {order.items?.map((it) => `${it.product?.name || 'Item'} (x${it.quantity})`).join(', ')}
                    </Text>

                    <View style={styles.txActionRow}>
                      {/* Product Rating Option */}
                      {prodId && order.status !== 'cancelled' && (
                        hasReviewed ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 'auto' }}>
                            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Reviewed</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.txSmallBtn, styles.rateBtn, { marginRight: 'auto' }]}
                            onPress={() => handleOpenReview(prodId, prodName)}
                          >
                            <Ionicons name="star-outline" size={13} color={colors.primary} />
                            <Text style={[styles.txSmallBtnText, styles.rateBtnText]}>Rate Product</Text>
                          </TouchableOpacity>
                        )
                      )}

                      <TouchableOpacity
                        style={styles.txSmallBtn}
                        onPress={() =>
                          router.push({
                            pathname: '/buyer/track-order',
                            params: { orderId: order._id },
                          })
                        }
                      >
                        <Ionicons name="navigate-outline" size={13} color={colors.text} />
                        <Text style={styles.txSmallBtnText}>Track</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button (Cart) */}
      <TouchableOpacity
        style={styles.fabCart}
        onPress={() => router.push('/buyer/cart')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open Cart"
      >
        <Ionicons name="bag-handle-outline" size={24} color="#FFFFFF" />
        {summary && summary.itemCount > 0 && (
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{summary.itemCount}</Text>
          </View>
        )}
      </TouchableOpacity>

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
                        <Ionicons name="person" size={22} color="#FFFFFF" />
                      </View>
                    )}
                    <View style={styles.dropdownHeaderMeta}>
                      <View style={styles.dropdownNameRow}>
                        <Text style={styles.dropdownNameText} numberOfLines={1}>
                          {userName}
                        </Text>
                        <View style={styles.dropdownRoleTag}>
                          <Text style={styles.dropdownRoleTagText}>BUYER</Text>
                        </View>
                      </View>
                      {userEmail ? (
                        <Text style={styles.dropdownEmailText} numberOfLines={1}>
                          ✉️ {userEmail}
                        </Text>
                      ) : (
                        <Text style={styles.dropdownEmailText} numberOfLines={1}>
                          Farm Produce Buyer
                        </Text>
                      )}
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
                        <View style={styles.dropdownActiveDot} />
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

                  {/* Quick Buyer Actions */}
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
                      router.push('/buyer/cart');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconWell, { backgroundColor: isDark ? '#1E3322' : '#F0FDF4' }]}>
                      <Ionicons name="basket-outline" size={17} color="#0D631B" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemTitle}>My Cart</Text>
                      <Text style={styles.menuItemSub}>
                        {summary?.itemCount ? `${summary.itemCount} items ready` : 'View cart & checkout'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setProfileMenuVisible(false);
                      router.push('/buyer/orders');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconWell, { backgroundColor: isDark ? '#1C2E4A' : '#EFF6FF' }]}>
                      <Ionicons name="receipt-outline" size={17} color="#2563EB" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemTitle}>Track & Orders</Text>
                      <Text style={styles.menuItemSub}>Live status & deliveries</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setProfileMenuVisible(false);
                      router.push('/buyer/transactions');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconWell, { backgroundColor: isDark ? '#3D2F18' : '#FEF3C7' }]}>
                      <Ionicons name="wallet-outline" size={17} color="#D97706" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemTitle}>Transaction History</Text>
                      <Text style={styles.menuItemSub}>Payments & blockchain escrow</Text>
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
                      <Text style={styles.dropdownLogoutSub}>Exit buyer dashboard</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#BA1A1A" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ────────────────────────────────────────────── */}
      {/* Product Rating & Review Modal */}
      {/* ────────────────────────────────────────────── */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.ratingModalOverlay}>
          <View style={styles.ratingModalCard}>
            <Text style={styles.ratingModalTitle}>Rate & Review Product</Text>
            <Text style={styles.ratingModalSub} numberOfLines={2}>
              {ratingProductName}
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRatingValue(star)}
                  style={styles.starBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Ionicons
                    name={star <= ratingValue ? 'star' : 'star-outline'}
                    size={34}
                    color={colors.star}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Your review (optional)"
              placeholder="Share your experience with this produce..."
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline={true}
              numberOfLines={4}
              containerStyle={{ marginBottom: 0 }}
            />

            <View style={styles.ratingModalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setRatingModalVisible(false)}
                disabled={submittingRating}
                style={styles.ratingModalBtn}
              />
              <Button
                title="Submit Review"
                onPress={handleSubmitRating}
                loading={submittingRating}
                disabled={submittingRating}
                style={styles.ratingModalBtn}
              />
            </View>
          </View>
        </View>
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
          role: 'buyer',
        }}
        onProfileUpdated={(updated) => {
          setUserName(updated.name);
          if (updated.mobile) setUserMobile(updated.mobile);
          if (updated.address) setUserLocation(updated.address);
          if (updated.profileImage) setUserAvatar(updated.profileImage);
        }}
        roleLabel="BUYER"
      />
    </View>
  );
}
