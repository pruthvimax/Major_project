import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useCart, CartItem } from '../../context/CartContext';
import {
  ScreenHeader,
  Card,
  Button,
  QuantityStepper,
  EmptyState,
  ListSkeleton,
} from '../../components/ui';

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, summary, loading, refreshCart, updateQuantity, removeItem } = useCart();
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        list: {
          padding: Layout.spacing.lg,
          paddingBottom: Layout.spacing.xxl,
        },
        skeletonWrap: { padding: Layout.spacing.lg },
        card: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: Layout.spacing.md,
          marginBottom: Layout.spacing.md,
          padding: Layout.spacing.md,
        },
        thumbWell: {
          width: 76,
          height: 76,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        image: {
          width: '100%',
          height: '100%',
          resizeMode: 'cover',
        },
        info: { flex: 1, minWidth: 0 },
        nameRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: Layout.spacing.sm,
        },
        name: {
          flex: 1,
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        farmer: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          marginTop: 2,
        },
        price: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.primary,
          marginTop: Layout.spacing.xs,
        },
        priceUnit: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.medium,
          color: colors.textSecondary,
        },
        qtyRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.md,
        },
        removeBtn: {
          width: Layout.touchTarget,
          height: Layout.touchTarget,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.errorSoft,
        },
        bottomBar: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.lg,
          paddingBottom: Math.max(insets.bottom, Layout.spacing.md) + Layout.spacing.md,
          ...Layout.shadow.lg,
        },
        summaryCard: {
          padding: Layout.spacing.lg,
          marginBottom: Layout.spacing.md,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.md,
          marginBottom: Layout.spacing.sm,
        },
        totalRow: {
          marginBottom: 0,
          marginTop: Layout.spacing.sm,
          paddingTop: Layout.spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        label: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          flexShrink: 1,
        },
        value: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
        },
        totalLabel: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        total: {
          fontSize: Typography.fontSize.xl,
          lineHeight: Typography.leading.xl,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.primary,
        },
      }),
    [colors, insets.bottom]
  );

  const getProductId = (item: CartItem) =>
    typeof item.product === 'string' ? item.product : item.product._id;

  const getProduct = (item: CartItem) =>
    typeof item.product === 'string' ? null : item.product;

  const handleQty = async (item: CartItem, next: number) => {
    const id = getProductId(item);
    const product = getProduct(item);
    if (next < 1) return;
    if (product && next > product.quantity) {
      Alert.alert('Stock limit', `Only ${product.quantity} ${item.unit} available`);
      return;
    }
    try {
      setUpdating(id);
      await updateQuantity(id, next);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (item: CartItem) => {
    const id = getProductId(item);
    try {
      setUpdating(id);
      await removeItem(id);
    } finally {
      setUpdating(null);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const product = getProduct(item);
    const id = getProductId(item);
    const busy = updating === id;

    return (
      <Card elevation="sm" padded={false} style={styles.card}>
        <View style={styles.thumbWell}>
          {product?.images?.[0] ? (
            <Image source={{ uri: product.images[0] }} style={styles.image} />
          ) : (
            <Ionicons name="leaf" size={30} color={colors.primary} />
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={2}>
              {product?.name || 'Product'}
            </Text>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(item)}
              accessibilityRole="button"
              accessibilityLabel="Remove from cart"
            >
              <Ionicons name="trash-outline" size={19} color={colors.error} />
            </TouchableOpacity>
          </View>

          <Text style={styles.farmer} numberOfLines={1}>
            by {product?.farmer?.name || 'Farmer'}
          </Text>

          <Text style={styles.price} numberOfLines={1}>
            ₹{item.price} <Text style={styles.priceUnit}>/ {item.unit}</Text>
          </Text>

          <View style={styles.qtyRow}>
            <QuantityStepper
              value={item.quantity}
              disabled={busy}
              onDecrease={() => handleQty(item, item.quantity - 1)}
              onIncrease={() => handleQty(item, item.quantity + 1)}
            />
            {busy && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My Cart"
        onBack={() => router.back()}
        iconActions={[
          {
            icon: 'refresh',
            onPress: refreshCart,
            accessibilityLabel: 'Refresh cart',
          },
        ]}
      />

      {loading && items.length === 0 ? (
        <View style={styles.skeletonWrap}>
          <ListSkeleton count={3} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          description="Browse fresh farm products and add them to your cart."
          actionLabel="Browse Products"
          onAction={() => router.push('/buyer/browse')}
        />
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => getProductId(item)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.bottomBar}>
            <Card elevation="none" bordered padded={false} style={styles.summaryCard}>
              <View style={styles.row}>
                <Text style={styles.label}>Items</Text>
                <Text style={styles.value}>{summary.itemCount}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Subtotal</Text>
                <Text style={styles.value}>₹{summary.subtotal.toFixed(2)}</Text>
              </View>
              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.total} numberOfLines={1}>
                  ₹{summary.totalAmount.toFixed(2)}
                </Text>
              </View>
            </Card>

            <Button
              title="Proceed to Checkout"
              icon="arrow-forward"
              iconPosition="right"
              size="lg"
              onPress={() =>
                router.push({ pathname: '/buyer/checkout', params: { fromCart: '1' } })
              }
            />
          </View>
        </>
      )}
    </View>
  );
}
