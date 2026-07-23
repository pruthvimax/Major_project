import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';

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
  location: {
    address: string;
  };
  farmer: {
    name: string;
    email: string;
  };
}

const CATEGORIES = ['all', 'vegetables', 'fruits', 'grains', 'dairy', 'organic'];

export default function BrowseScreen() {
  const colors = useColors();
  const { addToCart, summary } = useCart();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: Layout.spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: Layout.spacing.xs,
  },
  refreshButton: {
    padding: Layout.spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
  },
  searchContainer: {
    padding: Layout.spacing.md,
    backgroundColor: colors.card,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lighterGray,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: Layout.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    color: colors.black,
  },
  categoryContainer: {
    backgroundColor: colors.card,
    paddingBottom: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryList: {
    paddingHorizontal: Layout.spacing.md,
  },
  categoryTab: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.xl,
    backgroundColor: colors.lighterGray,
    marginRight: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  categoryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.gray,
  },
  categoryTextActive: {
    color: colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    color: colors.gray,
  },
  noProductsTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
    marginTop: Layout.spacing.md,
  },
  noProductsDesc: {
    color: colors.gray,
    textAlign: 'center',
    marginTop: Layout.spacing.xs,
  },
  productList: {
    padding: Layout.spacing.md,
  },
  buyButtonText: {
    color: colors.white,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
  },
  productImage: {
    width: '120%',
    height: 180,
    marginLeft: '-10%',
    marginTop: '-10%',
    marginBottom: Layout.spacing.md,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '120%',
    height: 120,
    marginLeft: '-10%',
    marginTop: '-10%',
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  placeholderText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: 'bold',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.sm,
  },
  productName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
  },
  farmerName: {
    fontSize: Typography.fontSize.xs,
    color: colors.gray,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 11,
    color: colors.gray,
    fontWeight: '600',
  },
  organicBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.xs,
  },
  organicText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: colors.gray,
    lineHeight: 20,
    marginBottom: Layout.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.sm,
  },
  infoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoText: {
    fontSize: Typography.fontSize.xs,
    color: colors.gray,
    marginLeft: 4,
  },
  blockchainBadgeContainer: {
    marginBottom: Layout.spacing.md,
  },
  blockchainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  dbBadge: {
    backgroundColor: colors.lighterGray,
  },
  blockchainText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
    marginLeft: 4,
  },
  dbText: {
    color: colors.gray,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Layout.spacing.md,
  },
  price: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
  },
  unit: {
    fontSize: Typography.fontSize.xs,
    color: colors.gray,
    fontWeight: 'normal',
  },
  buyButton: {
    backgroundColor: colors.secondary,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },
  cartButton: {
    backgroundColor: colors.primary,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    marginRight: Layout.spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}), [colors]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      if (response.data.success) {
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to load products. Make sure backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = products;

    // Filter by search query
    if (search.trim() !== '') {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'organic') {
        result = result.filter((p) => p.isOrganic);
      } else {
        result = result.filter((p) => p.category === selectedCategory);
      }
    }

    setFilteredProducts(result);
  }, [search, selectedCategory, products]);

  const handleBuy = (product: Product) => {
    router.push({
      pathname: '/(buyer)/checkout',
      params: {
        productId: product._id,
        name: product.name,
        price: product.price.toString(),
        unit: product.unit,
        farmerName: product.farmer.name,
        availableQuantity: product.quantity.toString(),
      },
    });
  };

  const handleAddToCart = async (product: Product) => {
    try {
      setAddingId(product._id);
      const result = await addToCart(product._id, 1);
      if (result.success) {
        if (Platform.OS === 'web') {
          window.alert('Added to cart');
        } else {
          Alert.alert('Cart', 'Added to cart');
        }
      } else {
        Alert.alert('Cart', result.message);
      }
    } finally {
      setAddingId(null);
    }
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      {item.images && item.images[0] ? (
        <Image source={{ uri: item.images[0] }} style={styles.productImage} />
      ) : (
        <View style={styles.placeholderImage}>
          <Ionicons name="storefront-outline" size={40} color={colors.secondary} />
          <Text style={styles.placeholderText}>Farm Fresh Produce</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Text style={styles.farmerName}>by {item.farmer.name}</Text>
            {item.averageRating !== undefined && item.averageRating > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color="#FFD700" style={{ marginLeft: 6, marginRight: 2 }} />
                <Text style={styles.ratingText}>{item.averageRating} ({item.reviewCount || 0})</Text>
              </View>
            )}
          </View>
        </View>
        {item.isOrganic && (
          <View style={styles.organicBadge}>
            <Text style={styles.organicText}>Organic</Text>
          </View>
        )}
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoCol}>
          <Ionicons name="location-outline" size={16} color={colors.gray} />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.location.address}
          </Text>
        </View>
        <View style={styles.infoCol}>
          <Ionicons name="cube-outline" size={16} color={colors.gray} />
          <Text style={styles.infoText}>
            Stock: {item.quantity} {item.unit}
          </Text>
        </View>
      </View>

      <View style={styles.blockchainBadgeContainer}>
        {item.blockchainId !== undefined && item.blockchainId !== null ? (
          <View style={styles.blockchainBadge}>
            <Ionicons name="link-outline" size={14} color="#2E7D32" />
            <Text style={styles.blockchainText}>On-Chain Verified (ID: {item.blockchainId})</Text>
          </View>
        ) : (
          <View style={[styles.blockchainBadge, styles.dbBadge]}>
            <Ionicons name="server-outline" size={14} color="#666" />
            <Text style={[styles.blockchainText, styles.dbText]}>Database Only</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.price}>
          ₹{item.price} <Text style={styles.unit}>/ {item.unit}</Text>
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => handleAddToCart(item)}
            disabled={item.quantity <= 0 || addingId === item._id}
          >
            {addingId === item._id ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.buyButtonText}>Add</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => handleBuy(item)}
            disabled={item.quantity <= 0}
          >
            <Text style={styles.buyButtonText}>
              {item.quantity > 0 ? 'Buy' : 'Out'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Marketplace</Text>
        <TouchableOpacity onPress={() => router.push('/(buyer)/cart')} style={styles.refreshButton}>
          <View>
            <Ionicons name="cart-outline" size={22} color={colors.secondary} />
            {summary.itemCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  right: -6,
                  top: -4,
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {summary.itemCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color={colors.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search fresh products..."
            placeholderTextColor={colors.gray}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryTab,
                selectedCategory === item && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item && styles.categoryTextActive,
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Fetching farm fresh products...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={60} color={colors.gray} />
          <Text style={styles.noProductsTitle}>No Products Found</Text>
          <Text style={styles.noProductsDesc}>Try selecting another category or check your search keyword.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          renderItem={renderProductCard}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

