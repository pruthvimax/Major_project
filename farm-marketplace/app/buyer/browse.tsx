import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import {
  ScreenHeader,
  SearchField,
  ChipRow,
  ProductCard,
  Button,
  EmptyState,
  ErrorState,
  friendlyError,
  ProductCardSkeleton,
} from '../../components/ui';

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
  filterBar: {
    backgroundColor: colors.card,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchWrap: {
    paddingHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
  },
  productList: {
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  skeletonWrap: {
    padding: Layout.spacing.lg,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    flexShrink: 0,
  },
}), [colors]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await api.get('/products');
      if (response.data.success) {
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoadError(error);
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
      pathname: '/buyer/checkout',
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

  const categoryOptions = useMemo(
    () =>
      CATEGORIES.map((item) => ({
        label: item.charAt(0).toUpperCase() + item.slice(1),
        value: item,
      })),
    []
  );

  const hasFilters = search.trim() !== '' || selectedCategory !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <ProductCard
      name={item.name}
      price={item.price}
      unit={item.unit}
      imageUri={item.images && item.images[0] ? item.images[0] : undefined}
      subtitle={`by ${item.farmer.name}`}
      description={item.description}
      location={item.location.address}
      stockLabel={`Stock: ${item.quantity} ${item.unit}`}
      isOrganic={item.isOrganic}
      blockchainId={item.blockchainId}
      rating={item.averageRating}
      reviewCount={item.reviewCount || 0}
      outOfStock={item.quantity <= 0}
      footer={
        <View style={styles.cardActions}>
          <Button
            title="Add"
            variant="ghost"
            size="sm"
            icon="cart-outline"
            fullWidth={false}
            loading={addingId === item._id}
            disabled={item.quantity <= 0 || addingId === item._id}
            onPress={() => handleAddToCart(item)}
          />
          <Button
            title={item.quantity > 0 ? 'Buy' : 'Out'}
            variant="primary"
            size="sm"
            fullWidth={false}
            disabled={item.quantity <= 0}
            onPress={() => handleBuy(item)}
          />
        </View>
      }
    />
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Browse Marketplace"
        onBack={() => router.back()}
        iconActions={[
          {
            icon: 'cart-outline',
            onPress: () => router.push('/buyer/cart'),
            badge: summary.itemCount,
            accessibilityLabel: 'Open cart',
          },
        ]}
      />

      <View style={styles.filterBar}>
        <View style={styles.searchWrap}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Search fresh products…"
          />
        </View>
        <ChipRow
          options={categoryOptions}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </View>

      {loading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((key) => (
            <ProductCardSkeleton key={key} />
          ))}
        </View>
      ) : loadError ? (
        <ErrorState
          title="Could not load products"
          message={friendlyError(loadError, 'We could not load the marketplace. Please try again.')}
          onRetry={fetchProducts}
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No Products Found"
          description="Try selecting another category or check your search keyword."
          actionLabel={hasFilters ? 'Clear filters' : undefined}
          onAction={hasFilters ? clearFilters : undefined}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          renderItem={renderProductCard}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
