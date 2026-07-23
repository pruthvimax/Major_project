import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';

type OrderStatus = 'pending' | 'accepted' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: string;
  escrowStatus?: string;
  blockchainTxHash?: string;
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

const STATUS_COLORS: Record<string, string> = {
  pending: '#F57C00',
  accepted: '#1976D2',
  packed: '#7B1FA2',
  shipped: '#0288D1',
  delivered: '#388E3C',
  cancelled: '#D32F2F',
};

export default function FarmerOrdersScreen() {
  const colors = useColors();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

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
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.lg,
          marginBottom: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        orderNumber: {
          fontWeight: Typography.fontWeight.bold,
          fontSize: Typography.fontSize.md,
          color: colors.black,
        },
        badge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
        },
        badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
        meta: { color: colors.gray, fontSize: 12, marginTop: 6 },
        amount: {
          fontSize: Typography.fontSize.lg,
          fontWeight: '700',
          color: colors.primary,
          marginTop: 8,
        },
        itemLine: { color: colors.black, fontSize: 13, marginTop: 4 },
        actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
        btn: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
        },
        btnText: { color: '#fff', fontWeight: '700', fontSize: 12, marginLeft: 4 },
        list: { padding: Layout.spacing.md },
      } as any),
    [colors]
  );

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders/farmer');
      if (res.data.success) setOrders(res.data.orders);
    } catch (e) {
      console.error(e);
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

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || colors.gray }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          Buyer: {item.buyer?.name} · {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.meta}>Payment: {item.paymentMethod}</Text>
        {item.escrowStatus && item.escrowStatus !== 'none' && (
          <Text style={styles.meta}>Escrow: {item.escrowStatus}</Text>
        )}
        {item.items?.map((it, idx) => (
          <Text key={idx} style={styles.itemLine}>
            • {it.product?.name || 'Product'} — {it.quantity} {it.unit} @ ₹{it.price}
          </Text>
        ))}
        <Text style={styles.amount}>₹{item.totalAmount.toFixed(2)}</Text>

        <View style={styles.actions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.success }]}
                disabled={busy}
                onPress={() => confirmAction(item, 'accepted', 'Accept')}
              >
                <Ionicons name="checkmark" size={14} color="#fff" />
                <Text style={styles.btnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.error }]}
                disabled={busy}
                onPress={() => confirmAction(item, 'cancelled', 'Reject')}
              >
                <Ionicons name="close" size={14} color="#fff" />
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {next && item.status !== 'pending' && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              disabled={busy}
              onPress={() => confirmAction(item, next, `Mark ${next}`)}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                  <Text style={styles.btnText}>Mark {next}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
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
        <Text style={styles.headerTitle}>Incoming Orders</Text>
        <TouchableOpacity onPress={fetchOrders}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o._id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />
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
    </SafeAreaView>
  );
}
