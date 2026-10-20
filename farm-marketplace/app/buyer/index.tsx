import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSelector from '../../components/LanguageSelector';
import ThemeToggle from '../../components/ThemeToggle';

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

export default function BuyerDashboard() {
  const colors = useColors();
  const { addToCart, cart, updateQuantity, removeFromCart, summary } = useCart();
  const { t } = useLanguage();

  const [userName, setUserName] = useState('Buyer');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    validateRoleAndLoad();
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
      fetchProducts();
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

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
        router.replace('/auth/login');
      } catch (error) {
        logApiError('Buyer logout', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        performLogout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: performLogout },
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
    if (!cart || !Array.isArray(cart.items)) return 0;
    const item = cart.items.find((i) =>
      typeof i.product === 'string' ? i.product === productId : i.product?._id === productId
    );
    return item ? item.quantity : 0;
  };

  const handleIncrement = async (productId: string) => {
    if (!cart || !Array.isArray(cart.items)) {
      await addToCart(productId, 1);
      return;
    }
    const item = cart.items.find((i) =>
      typeof i.product === 'string' ? i.product === productId : i.product?._id === productId
    );
    if (item) {
      await updateQuantity(productId, item.quantity + 1);
    } else {
      await addToCart(productId, 1);
    }
  };

  const handleDecrement = async (productId: string) => {
    if (!cart || !Array.isArray(cart.items)) return;
    const item = cart.items.find((i) =>
      typeof i.product === 'string' ? i.product === productId : i.product?._id === productId
    );
    if (item) {
      if (item.quantity <= 1) {
        await removeFromCart(productId);
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
          paddingTop: Platform.OS === 'ios' ? 44 : Layout.spacing.md,
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
        iconBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
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
          paddingBottom: 100,
        },
        // Banner
        bannerSection: {
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.md,
        },
        bannerCard: {
          height: 170,
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
        // Categories
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Layout.spacing.lg,
          marginTop: Layout.spacing.lg,
          marginBottom: Layout.spacing.sm,
        },
        sectionTitle: {
          fontSize: 17,
          fontWeight: Typography.fontWeight.bold,
          color: '#1A202C',
        },
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
          justifyContent: 'space-between',
          rowGap: Layout.spacing.md,
        },
        productCard: {
          width: (Dimensions.get('window').width - Layout.spacing.lg * 2 - Layout.spacing.md) / 2,
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
          paddingTop: Layout.spacing.lg,
          paddingBottom: Layout.spacing.xs,
          paddingHorizontal: Layout.spacing.sm,
          alignItems: 'center',
        },
        haloCircle: {
          width: 84,
          height: 84,
          borderRadius: 42,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 6,
        },
        productImage: {
          width: 70,
          height: 70,
          resizeMode: 'contain',
        },
        productPrice: {
          fontSize: 13,
          fontWeight: Typography.fontWeight.bold,
          color: '#6CC51D',
          marginTop: Layout.spacing.sm,
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
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.greetingTitle}>Hi, {userName}</Text>
          <Text style={styles.greetingSub}>Fresh farm produce, straight to you</Text>
        </View>
        <View style={styles.headerRight}>
          <LanguageSelector />
          <ThemeToggle />
          <TouchableOpacity style={styles.iconBtn} onPress={handleLogout} accessibilityLabel="Logout">
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
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
            placeholder="Search keywords..."
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity onPress={() => router.push('/buyer/browse')}>
            <Ionicons name="options-outline" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => router.push('/buyer/browse')}>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
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

        {/* Featured Products Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured products</Text>
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
              const imgUri = product.images && product.images[0] ? product.images[0] : 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&auto=format&fit=crop';

              return (
                <View key={product._id} style={styles.productCard}>
                  {product.isOrganic && (
                    <View style={styles.badgeNew}>
                      <Text style={styles.badgeNewText}>ORGANIC</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.favBtn} onPress={() => toggleFavorite(product._id)}>
                    <Ionicons
                      name={isFav ? 'heart' : 'heart-outline'}
                      size={20}
                      color={isFav ? '#E53E3E' : '#CBD5E1'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardTop}
                    onPress={() => router.push({ pathname: '/buyer/checkout', params: { productId: product._id, name: product.name, price: product.price.toString(), unit: product.unit, farmerName: product.farmer?.name || 'Farmer', availableQuantity: product.quantity.toString() } })}
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
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleDecrement(product._id)}>
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{qtyInCart}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleIncrement(product._id)}>
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
    </View>
  );
}
