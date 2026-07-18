import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../services/api';

interface OrderItem {
  product: {
    name: string;
    price: number;
    unit: string;
  };
  quantity: number;
  price: number;
  unit: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'bank_transfer' | 'blockchain';
  blockchainTxHash?: string;
  blockchainOrderId?: number;
  items: OrderItem[];
  buyer: {
    name: string;
    email: string;
  };
  farmer: {
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function ManageOrdersScreen() {
  const colors = useColors();
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lighterGray,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: Layout.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: colors.black,
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
  noOrdersText: {
    fontSize: Typography.fontSize.md,
    color: colors.gray,
    marginTop: Layout.spacing.md,
  },
  listContainer: {
    padding: Layout.spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  orderNumber: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
  },
  orderDate: {
    fontSize: Typography.fontSize.xs,
    color: colors.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  partyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.md,
    backgroundColor: colors.lighterGray,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  partyText: {
    fontSize: Typography.fontSize.xs,
    color: colors.gray,
  },
  partyName: {
    fontWeight: 'bold',
    color: colors.black,
  },
  itemsSection: {
    marginBottom: Layout.spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  itemText: {
    fontSize: Typography.fontSize.sm,
    color: colors.black,
    flex: 1,
    marginRight: Layout.spacing.md,
  },
  itemPrice: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: colors.black,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  paymentMethodLabel: {
    fontSize: Typography.fontSize.xs,
    color: colors.gray,
  },
  paymentMethodValue: {
    fontWeight: 'bold',
    color: colors.black,
  },
  totalPrice: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: colors.admin,
  },
  blockchainDetails: {
    backgroundColor: '#E8F5E9',
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.sm,
    marginVertical: Layout.spacing.sm,
  },
  blockchainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  blockchainTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
    marginLeft: 4,
  },
  blockchainDetailText: {
    fontSize: 10,
    color: '#555',
    marginVertical: 1,
  },
  blockchainValue: {
    fontWeight: '700',
    color: '#2E7D32',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.sm,
    alignItems: 'center',
    marginTop: Layout.spacing.md,
  },
  cancelBtnText: {
    color: '#C62828',
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
  },
}), [colors]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      if (response.data.success) {
        setOrders(response.data.orders);
        setFilteredOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(
        orders.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
            o.status.toLowerCase().includes(search.toLowerCase()) ||
            (o.buyer?.name && o.buyer.name.toLowerCase().includes(search.toLowerCase())) ||
            (o.farmer?.name && o.farmer.name.toLowerCase().includes(search.toLowerCase()))
        )
      );
    }
  }, [search, orders]);

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      // native alert
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const cancelAction = async () => {
      try {
        setLoading(true);
        const response = await api.put(`/orders/${orderId}/cancel`);
        if (response.data.success) {
          showAlert('Success', 'Order cancelled and buyer refunded on-chain (if paid on blockchain).');
          fetchOrders();
        }
      } catch (error: any) {
        console.error('Cancel order failed:', error);
        const errorMsg = error.response?.data?.message || 'Failed to cancel order.';
        showAlert('Error', errorMsg);
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmCancel = window.confirm('Are you sure you want to cancel this order? This will execute an on-chain refund if paid via blockchain.');
      if (confirmCancel) {
        cancelAction();
      }
    } else {
      cancelAction();
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return '#2E7D32';
      case 'pending':
        return '#EF6C00';
      case 'confirmed':
      case 'processing':
      case 'shipped':
        return '#0277BD';
      case 'cancelled':
        return '#C62828';
      default:
        return colors.gray;
    }
  };

  const renderOrderItem = (item: OrderItem, index: number) => (
    <View key={index} style={styles.itemRow}>
      <Text style={styles.itemText} numberOfLines={1}>
        {item.product?.name || 'Product'} x {item.quantity}
      </Text>
      <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
    </View>
  );

  const renderOrderCard = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.orderDate}>Placed on {formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.partyRow}>
        <Text style={styles.partyText}>Buyer: <Text style={styles.partyName}>{item.buyer?.name || 'Unknown'}</Text></Text>
        <Text style={styles.partyText}>Farmer: <Text style={styles.partyName}>{item.farmer?.name || 'Unknown'}</Text></Text>
      </View>

      <View style={styles.itemsSection}>
        {item.items.map((orderItem, idx) => renderOrderItem(orderItem, idx))}
      </View>

      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentMethodLabel}>
          Payment: <Text style={styles.paymentMethodValue}>{item.paymentMethod.replace('_', ' ').toUpperCase()}</Text>
        </Text>
        <Text style={styles.totalPrice}>₹{item.totalAmount.toFixed(2)}</Text>
      </View>

      {/* Blockchain Details Section */}
      {item.paymentMethod === 'blockchain' && (
        <View style={styles.blockchainDetails}>
          <View style={styles.blockchainHeader}>
            <Ionicons name="link-outline" size={14} color="#2E7D32" />
            <Text style={styles.blockchainTitle}>Blockchain Smart Escrow</Text>
          </View>
          {item.blockchainOrderId !== undefined && item.blockchainOrderId !== null && (
            <Text style={styles.blockchainDetailText}>
              Escrow Order ID: <Text style={styles.blockchainValue}>#{item.blockchainOrderId}</Text>
            </Text>
          )}
          {item.blockchainTxHash ? (
            <Text style={styles.blockchainDetailText} numberOfLines={1}>
              Tx Hash: <Text style={styles.blockchainValue}>{item.blockchainTxHash}</Text>
            </Text>
          ) : (
            <Text style={styles.blockchainDetailText}>
              Tx Hash: <Text style={styles.blockchainValue}>Processing...</Text>
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      {(item.status === 'pending' || item.status === 'confirmed') && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => handleCancelOrder(item._id)}
        >
          <Text style={styles.cancelBtnText}>Force Cancel & Refund</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(admin)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.admin} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Orders</Text>
        <TouchableOpacity onPress={fetchOrders} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={colors.admin} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color={colors.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor={colors.gray}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.admin} />
          <Text style={styles.loadingText}>Fetching orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={60} color={colors.gray} />
          <Text style={styles.noOrdersText}>No orders found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

