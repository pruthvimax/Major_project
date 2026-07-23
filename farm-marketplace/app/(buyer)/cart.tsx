import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useCart, CartItem } from '../../context/CartContext';
import EmptyState from '../../components/EmptyState';

export default function CartScreen() {
  const colors = useColors();
  const { items, summary, loading, refreshCart, updateQuantity, removeItem } = useCart();
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
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
        headerTitle: {
          fontSize: Typography.fontSize.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.black,
        },
        card: {
          flexDirection: 'row',
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.sm,
          borderWidth: 1,
          borderColor: colors.border,
        },
        image: {
          width: 72,
          height: 72,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.lighterGray,
        },
        placeholder: {
          width: 72,
          height: 72,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.primary + '12',
          alignItems: 'center',
          justifyContent: 'center',
        },
        info: { flex: 1, marginLeft: Layout.spacing.md },
        name: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.black,
        },
        farmer: { fontSize: Typography.fontSize.xs, color: colors.gray, marginTop: 2 },
        price: {
          fontSize: Typography.fontSize.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.primary,
          marginTop: 4,
        },
        qtyRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: Layout.spacing.sm,
        },
        qtyBtn: {
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: colors.lighterGray,
          alignItems: 'center',
          justifyContent: 'center',
        },
        qtyText: {
          marginHorizontal: Layout.spacing.md,
          fontWeight: '700',
          color: colors.black,
          minWidth: 20,
          textAlign: 'center',
        },
        removeBtn: { padding: 6, marginLeft: 'auto' as any },
        footer: {
          backgroundColor: colors.card,
          padding: Layout.spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: Layout.spacing.xs,
        },
        label: { color: colors.gray, fontSize: Typography.fontSize.sm },
        value: { fontWeight: '700', color: colors.black },
        total: {
          fontSize: Typography.fontSize.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.primary,
        },
        checkoutBtn: {
          backgroundColor: colors.primary,
          borderRadius: Layout.borderRadius.md,
          paddingVertical: Layout.spacing.md,
          alignItems: 'center',
          marginTop: Layout.spacing.md,
        },
        checkoutText: {
          color: colors.white,
          fontWeight: '700',
          fontSize: Typography.fontSize.md,
        },
        list: { padding: Layout.spacing.md },
      } as any),
    [colors]
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
      <View style={styles.card}>
        {product?.images?.[0] ? (
          <Image source={{ uri: product.images[0] }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="leaf" size={28} color={colors.primary} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{product?.name || 'Product'}</Text>
          <Text style={styles.farmer}>by {product?.farmer?.name || 'Farmer'}</Text>
          <Text style={styles.price}>
            ₹{item.price} / {item.unit}
          </Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              disabled={busy}
              onPress={() => handleQty(item, item.quantity - 1)}
            >
              <Ionicons name="remove" size={16} color={colors.black} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{busy ? '…' : item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              disabled={busy}
              onPress={() => handleQty(item, item.quantity + 1)}
            >
              <Ionicons name="add" size={16} color={colors.black} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <TouchableOpacity onPress={refreshCart}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="Your cart is empty"
          description="Browse fresh farm products and add them to your cart."
          actionLabel="Browse Products"
          onAction={() => router.push('/(buyer)/browse')}
        />
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => getProductId(item)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
          <View style={styles.footer}>
            <View style={styles.row}>
              <Text style={styles.label}>Items</Text>
              <Text style={styles.value}>{summary.itemCount}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>₹{summary.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { fontWeight: '700', color: colors.black }]}>Total</Text>
              <Text style={styles.total}>₹{summary.totalAmount.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => router.push({ pathname: '/(buyer)/checkout', params: { fromCart: '1' } })}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
