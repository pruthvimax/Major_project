import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import {
  ScreenHeader,
  ProductCard,
  ProductCardSkeleton,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  friendlyError,
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
  blockchainTxHash?: string;
  images?: string[];
  averageRating?: number;
  reviewCount?: number;
  location: {
    address: string;
  };
}

export default function MyProductsScreen() {
  const colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContainer: {
      padding: Layout.spacing.lg,
      paddingBottom: Layout.spacing.xxl,
    },
    skeletonWrap: {
      padding: Layout.spacing.lg,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
      maxWidth: '100%',
    },
    metaText: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
      flexShrink: 1,
    },
  }), [colors]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  useEffect(() => {
    fetchMyProducts();
  }, []);

  const fetchMyProducts = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await api.get('/products/farmer/my-products');
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      logApiError('Farmer load products', error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/products/farmer/my-products');
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      logApiError('Farmer refresh products', error);
    } finally {
      setRefreshing(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const deleteAction = async () => {
      try {
        setLoading(true);
        const response = await api.delete(`/products/${productId}`);
        if (response.data.success) {
          showAlert('Success', 'Product listing deleted successfully');
          fetchMyProducts();
        }
      } catch (error: any) {
        logApiError('Farmer delete product', error);
        const errMsg = error.response?.data?.message || 'Failed to delete product.';
        showAlert('Error', errMsg);
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('Are you sure you want to delete this product listing?');
      if (confirmDelete) {
        deleteAction();
      }
    } else {
      deleteAction();
    }
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <ProductCard
      name={item.name}
      price={item.price}
      unit={item.unit}
      imageUri={item.images && item.images[0] ? item.images[0] : undefined}
      description={item.description}
      location={item.location?.address}
      stockLabel={`Stock: ${item.quantity} ${item.unit}`}
      isOrganic={item.isOrganic}
      blockchainId={item.blockchainId}
      rating={item.averageRating}
      reviewCount={item.reviewCount || 0}
      outOfStock={item.quantity <= 0}
      meta={
        <>
          <Badge label={item.category.toUpperCase()} tone="primary" />
          {item.blockchainTxHash ? (
            <View style={styles.metaItem}>
              <Ionicons name="link-outline" size={14} color={colors.muted} />
              <Text style={styles.metaText} numberOfLines={1}>
                Tx {item.blockchainTxHash}
              </Text>
            </View>
          ) : null}
        </>
      }
      footer={
        <Button
          title="Delete"
          variant="danger"
          size="sm"
          icon="trash-outline"
          fullWidth={false}
          onPress={() => handleDeleteProduct(item._id)}
        />
      }
    />
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My Products"
        subtitle="Manage your marketplace listings"
        onBack={() => router.replace('/farmer')}
      />

      {loading && !refreshing ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2].map((key) => (
            <ProductCardSkeleton key={key} />
          ))}
        </View>
      ) : loadError ? (
        <ErrorState
          title="Could not load your products"
          message={friendlyError(loadError, 'We could not load your listings. Please try again.')}
          onRetry={fetchMyProducts}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No Products Listed"
          description="Add fresh produce to start listing items on the marketplace."
          actionLabel="Add First Product"
          onAction={() => router.push('/farmer/add-product')}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderProductCard}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
