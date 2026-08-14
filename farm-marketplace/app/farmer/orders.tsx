import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import {
  ScreenHeader,
  OrderCard,
  Button,
  EmptyState,
  ErrorState,
  friendlyError,
  ListSkeleton,
} from '../../components/ui';
import type { BadgeTone, OrderMetaRow } from '../../components/ui';

type OrderStatus = 'pending' | 'accepted' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: string;
  escrowStatus?: string;
  blockchainTxHash?: string;
  cancellationReason?: string;
  cancelledBy?: 'buyer' | 'admin';
  cancelledAt?: string;
  buyer: { name: string; email: string; mobile?: string };
  items: { product: { name: string }; quantity: number; price: number; unit: string }[];
  createdAt: string;
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'accepted',
  accepted: 'packed',
  packed: 'shipped',
  shipped: 'delivered',
};

const STATUS_TONES: Record<string, BadgeTone> = {
  pending: 'warning',
  accepted: 'info',
  packed: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error',
};

export default function FarmerOrdersScreen() {
  const colors = useColors();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        list: {
          padding: Layout.spacing.lg,
          paddingBottom: Layout.spacing.xxl,
        },
        skeletonWrap: { padding: Layout.spacing.lg },
        items: {
          marginTop: Layout.spacing.md,
          gap: Layout.spacing.xs + 2,
        },
        itemLine: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
        },
        itemText: {
          flex: 1,
          flexShrink: 1,
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.text,
        },
        cancelledNote: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: Layout.spacing.sm,
          backgroundColor: colors.errorSoft,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.sm + 2,
          marginTop: Layout.spacing.md,
        },
        cancelledText: {
          flex: 1,
          flexShrink: 1,
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.error,
        },
        actions: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          gap: Layout.spacing.sm,
          flexShrink: 1,
        },
      }),
    [colors]
  );

  const fetchOrders = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await api.get('/orders/farmer');
      if (res.data.success) setOrders(res.data.orders);
    } catch (e) {
      console.error(e);
      setLoadError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      setActionId(orderId);
      await api.put(`/orders/${orderId}/status`, { status });
      await fetchOrders();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not update order');
    } finally {
      setActionId(null);
    }
  };

  const confirmAction = (order: Order, status: string, label: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${label} order ${order.orderNumber}?`)) {
        updateStatus(order._id, status);
      }
      return;
    }
    Alert.alert(label, `${label} order ${order.orderNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, onPress: () => updateStatus(order._id, status) },
    ]);
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const next = NEXT_STATUS[item.status];
    const busy = actionId === item._id;

    const rows: OrderMetaRow[] = [
      { icon: 'person-outline', label: 'Buyer', value: item.buyer?.name ?? '' },
      { icon: 'card-outline', label: 'Payment', value: item.paymentMethod },
    ];
    if (item.escrowStatus && item.escrowStatus !== 'none') {
      rows.push({ icon: 'lock-closed-outline', label: 'Escrow', value: item.escrowStatus });
    }

    return (
      <OrderCard
        reference={item.orderNumber}
        date={new Date(item.createdAt).toLocaleDateString()}
        statusLabel={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        statusTone={STATUS_TONES[item.status] || 'neutral'}
        rows={rows}
        totalLabel="Order total"
        total={`₹${item.totalAmount.toFixed(2)}`}
        actions={
          <View style={styles.actions}>
            {item.status === 'pending' && (
              <>
                <Button
                  title="Accept"
                  variant="primary"
                  size="sm"
                  icon="checkmark"
                  fullWidth={false}
                  disabled={busy}
                  onPress={() => confirmAction(item, 'accepted', 'Accept')}
                />
                <Button
                  title="Reject"
                  variant="danger"
                  size="sm"
                  icon="close"
                  fullWidth={false}
                  disabled={busy}
                  onPress={() => confirmAction(item, 'cancelled', 'Reject')}
                />
              </>
            )}
            {next && item.status !== 'pending' && (
              <Button
                title={`Mark ${next}`}
                variant="primary"
                size="sm"
                icon="arrow-forward"
                fullWidth={false}
                loading={busy}
                onPress={() => confirmAction(item, next, `Mark ${next}`)}
              />
            )}
          </View>
        }
      >
        {item.items?.length ? (
          <View style={styles.items}>
            {item.items.map((it, idx) => (
              <View key={idx} style={styles.itemLine}>
                <Ionicons name="ellipse" size={6} color={colors.primary} />
                <Text style={styles.itemText} numberOfLines={2}>
                  {it.product?.name || 'Product'} — {it.quantity} {it.unit} @ ₹{it.price}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {item.status === 'cancelled' && (
          <View style={styles.cancelledNote}>
            <Ionicons name="alert-circle-outline" size={15} color={colors.error} />
            <Text style={styles.cancelledText}>
              Cancelled {item.cancelledBy === 'admin' ? 'by admin' : 'by buyer'}
              {item.cancellationReason ? ` — ${item.cancellationReason}` : ''}
            </Text>
          </View>
        )}
      </OrderCard>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Incoming Orders"
        subtitle="Orders placed for your produce"
        onBack={() => router.back()}
        iconActions={[
          {
            icon: 'refresh',
            onPress: () => {
              fetchOrders();
            },
            accessibilityLabel: 'Refresh orders',
          },
        ]}
      />

      {loading ? (
        <View style={styles.skeletonWrap}>
          <ListSkeleton count={3} />
        </View>
      ) : loadError ? (
        <ErrorState
          title="Could not load orders"
          message={friendlyError(loadError, 'We could not load your incoming orders. Please try again.')}
          onRetry={fetchOrders}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o._id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchOrders(); }}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No orders yet"
              description="When buyers place orders for your products, they will appear here."
            />
          }
        />
      )}
    </View>
  );
}
