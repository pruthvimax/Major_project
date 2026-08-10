import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import AdminHeader from '../../components/admin/AdminHeader';
import SearchBar from '../../components/admin/SearchBar';
import FilterChips from '../../components/admin/FilterChips';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { AdminListSkeleton } from '../../components/admin/AdminSkeleton';

interface OrderItem {
  product: {
    _id: string;
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
  status: 'pending' | 'accepted' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'bank_transfer' | 'blockchain' | 'razorpay';
  blockchainTxHash?: string;
  blockchainOrderId?: number | null;
  escrowStatus?: string;
  verificationStatus?: string;
  cancellationReason?: string;
  cancelledBy?: 'buyer' | 'admin';
  cancelledAt?: string;
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items: OrderItem[];
  buyer: {
    _id: string;
    name: string;
    email: string;
    mobile?: string;
  };
  farmer: {
    _id: string;
    name: string;
    email: string;
    mobile?: string;
  };
  createdAt: string;
  estimatedDelivery?: string;
  deliveryDate?: string;
}

export default function ManageOrdersScreen() {
  const colors = useColors();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Layout.spacing.xl,
    },
    loadingText: { marginTop: Layout.spacing.md, color: colors.gray },
    listContainer: { padding: Layout.spacing.md },
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
    orderDate: { fontSize: Typography.fontSize.xs, color: colors.gray, marginTop: 2 },
    partyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Layout.spacing.md,
      backgroundColor: colors.lighterGray,
      padding: Layout.spacing.sm,
      borderRadius: Layout.borderRadius.sm,
    },
    partyText: { fontSize: Typography.fontSize.xs, color: colors.gray },
    partyName: { fontWeight: 'bold', color: colors.black },
    itemsSection: { marginBottom: Layout.spacing.md },
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
    itemPrice: { fontSize: Typography.fontSize.sm, fontWeight: '500', color: colors.black },
    paymentInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: Layout.spacing.sm,
      marginBottom: Layout.spacing.sm,
    },
    paymentMethodLabel: { fontSize: Typography.fontSize.xs, color: colors.gray },
    paymentMethodValue: { fontWeight: 'bold', color: colors.black },
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
    blockchainDetailText: { fontSize: 10, color: '#555', marginVertical: 1 },
    blockchainValue: { fontWeight: '700', color: '#2E7D32' },
    cancelBtn: {
      borderWidth: 1,
      borderColor: '#C62828',
      borderRadius: Layout.borderRadius.md,
      paddingVertical: Layout.spacing.sm,
      alignItems: 'center',
      marginTop: Layout.spacing.md,
    },
    cancelBtnText: { color: '#C62828', fontWeight: '700', fontSize: Typography.fontSize.sm },
    cancelledNote: {
      color: '#C62828',
      fontSize: Typography.fontSize.xs,
      fontWeight: '600',
      marginTop: Layout.spacing.xs,
    },
    viewButton: {
      borderWidth: 1,
      borderColor: colors.admin,
      borderRadius: Layout.borderRadius.md,
      paddingVertical: Layout.spacing.sm,
      alignItems: 'center',
      marginTop: Layout.spacing.md,
    },
    viewButtonText: { color: colors.admin, fontWeight: '700', fontSize: Typography.fontSize.sm },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: Layout.borderRadius.xl,
      borderTopRightRadius: Layout.borderRadius.xl,
      padding: Layout.spacing.xl,
      maxHeight: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Layout.spacing.md,
    },
    modalTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
    },
    closeButton: { padding: Layout.spacing.xs },
    detailSection: {
      marginTop: Layout.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: Layout.spacing.md,
    },
    sectionLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: '700',
      color: colors.black,
      marginBottom: Layout.spacing.xs,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 4,
    },
    detailLabel: { fontSize: Typography.fontSize.xs, color: colors.gray },
    detailValue: {
      fontSize: Typography.fontSize.sm,
      color: colors.black,
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    addressBox: {
      backgroundColor: colors.lighterGray,
      borderRadius: Layout.borderRadius.sm,
      padding: Layout.spacing.md,
      marginTop: Layout.spacing.xs,
    },
    addressText: { fontSize: Typography.fontSize.sm, color: colors.black, lineHeight: 20 },
    errorCard: {
      backgroundColor: '#FFEBEE',
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.md,
      margin: Layout.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    errorText: { color: '#C62828', fontSize: Typography.fontSize.sm, flex: 1, marginLeft: Layout.spacing.sm },
  }), [colors]);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/orders');
      if (response.data.success) {
        setOrders(response.data.orders);
        setFilteredOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const next = orders.filter((order) => {
      const matchesFilter = selectedFilter === 'all' || order.status === selectedFilter;
      const matchesSearch =
        normalizedSearch === '' ||
        order.orderNumber.toLowerCase().includes(normalizedSearch) ||
        order.status.toLowerCase().includes(normalizedSearch) ||
        (order.buyer?.name && order.buyer.name.toLowerCase().includes(normalizedSearch)) ||
        (order.farmer?.name && order.farmer.name.toLowerCase().includes(normalizedSearch)) ||
        (order.paymentMethod && order.paymentMethod.toLowerCase().includes(normalizedSearch));
      return matchesFilter && matchesSearch;
    });
    setFilteredOrders(next);
  }, [search, orders, selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    try {
      setCancelLoading(true);
      const response = await api.put(`/orders/${selectedOrder._id}/cancel`, {
        reason: 'Cancelled by administrator',
      });
      if (response.data.success) {
        setDetailVisible(false);
        setSelectedOrder(null);
        fetchOrders();
      }
    } catch (error: any) {
      console.error('Cancel order failed:', error);
      setError(error.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancelLoading(false);
      setConfirmVisible(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.partyRow}>
        <Text style={styles.partyText}>
          Buyer: <Text style={styles.partyName}>{item.buyer?.name || 'Unknown'}</Text>
        </Text>
        <Text style={styles.partyText}>
          Farmer: <Text style={styles.partyName}>{item.farmer?.name || 'Unknown'}</Text>
        </Text>
      </View>

      <View style={styles.itemsSection}>
        {item.items.map((orderItem, idx) => renderOrderItem(orderItem, idx))}
      </View>

      <View style={styles.paymentInfoRow}>
        <View>
          <Text style={styles.paymentMethodLabel}>
            Payment: <Text style={styles.paymentMethodValue}>{item.paymentMethod?.replace('_', ' ').toUpperCase()}</Text>
          </Text>
          <Text style={styles.paymentMethodLabel}>
            Status: <StatusBadge status={item.paymentStatus} />
          </Text>
        </View>
        <Text style={styles.totalPrice}>₹{item.totalAmount?.toFixed(2)}</Text>
      </View>

      {item.status === 'cancelled' && (
        <Text style={styles.cancelledNote}>
          Cancelled {item.cancelledBy === 'admin' ? 'by admin' : 'by buyer'}
          {item.cancellationReason ? ` — ${item.cancellationReason}` : ''}
        </Text>
      )}

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
          {item.escrowStatus && (
            <Text style={styles.blockchainDetailText}>
              Escrow: <Text style={styles.blockchainValue}>{item.escrowStatus.toUpperCase()}</Text>
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => {
          setSelectedOrder(item);
          setDetailVisible(true);
        }}
      >
        <Text style={styles.viewButtonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader
        title="Order Management"
        subtitle={`${orders.length} orders`}
        onRefresh={fetchOrders}
      />

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by order number, buyer, farmer..."
      />

      <FilterChips
        options={[
          { label: 'All', value: 'all' },
          { label: 'Pending', value: 'pending' },
          { label: 'Accepted', value: 'accepted' },
          { label: 'Packed', value: 'packed' },
          { label: 'Shipped', value: 'shipped' },
          { label: 'Delivered', value: 'delivered' },
          { label: 'Cancelled', value: 'cancelled' },
        ]}
        selected={selectedFilter}
        onSelect={setSelectedFilter}
      />

      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={20} color="#C62828" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <AdminListSkeleton count={4} />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No orders found"
          description={search ? 'Try a different search term' : 'No orders placed yet'}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />
          }
        />
      )}

      {/* Order Detail Modal */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.gray} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order Number</Text>
                  <Text style={styles.detailValue}>{selectedOrder.orderNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <StatusBadge status={selectedOrder.status} />
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Placed On</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedOrder.createdAt)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estimated Delivery</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedOrder.estimatedDelivery)}</Text>
                </View>
                {selectedOrder.deliveryDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Delivered On</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedOrder.deliveryDate)}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>Buyer</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{selectedOrder.buyer?.name || 'Unknown'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedOrder.buyer?.email || 'N/A'}</Text>
                  </View>
                  {selectedOrder.buyer?.mobile && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mobile</Text>
                      <Text style={styles.detailValue}>{selectedOrder.buyer.mobile}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>Farmer</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{selectedOrder.farmer?.name || 'Unknown'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedOrder.farmer?.email || 'N/A'}</Text>
                  </View>
                  {selectedOrder.farmer?.mobile && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mobile</Text>
                      <Text style={styles.detailValue}>{selectedOrder.farmer.mobile}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>Items</Text>
                  {selectedOrder.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemText} numberOfLines={1}>
                        {item.product?.name || 'Product'} x {item.quantity}
                      </Text>
                      <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Layout.spacing.sm, marginTop: Layout.spacing.sm }]}>
                    <Text style={styles.detailLabel}>Total Amount</Text>
                    <Text style={[styles.detailValue, { color: colors.admin, fontWeight: '700' }]}>
                      ₹{selectedOrder.totalAmount?.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>Payment</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Method</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.paymentMethod?.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <StatusBadge status={selectedOrder.paymentStatus} />
                  </View>
                  {selectedOrder.verificationStatus && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Verification</Text>
                      <StatusBadge status={selectedOrder.verificationStatus} />
                    </View>
                  )}
                  {selectedOrder.escrowStatus && selectedOrder.escrowStatus !== 'none' && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Escrow</Text>
                      <StatusBadge status={selectedOrder.escrowStatus} />
                    </View>
                  )}
                  {selectedOrder.blockchainTxHash && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tx Hash</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {selectedOrder.blockchainTxHash}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>Delivery Address</Text>
                  {selectedOrder.shippingAddress ? (
                    <View style={styles.addressBox}>
                      <Text style={styles.addressText}>
                        {selectedOrder.shippingAddress.address}
                        {'\n'}
                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                        {selectedOrder.shippingAddress.pincode}
                        {'\n'}
                        {selectedOrder.shippingAddress.country}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.detailValue}>No address provided</Text>
                  )}
                </View>

                {selectedOrder.status === 'cancelled' && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionLabel}>Cancellation</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Cancelled By</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.cancelledBy === 'admin' ? 'Administrator' : 'Buyer'}
                      </Text>
                    </View>
                    {selectedOrder.cancellationReason && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reason</Text>
                        <Text style={styles.detailValue}>{selectedOrder.cancellationReason}</Text>
                      </View>
                    )}
                  </View>
                )}

                {(selectedOrder.status === 'pending' || selectedOrder.status === 'accepted') && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setConfirmVisible(true)}
                  >
                    <Text style={styles.cancelBtnText}>Force Cancel & Refund</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmVisible}
        title="Cancel Order"
        message={`Are you sure you want to cancel order ${selectedOrder?.orderNumber || ''}? This will execute an on-chain refund if paid via blockchain.`}
        confirmLabel="Cancel Order"
        destructive
        loading={cancelLoading}
        icon="close-circle-outline"
        onConfirm={handleCancelOrder}
        onCancel={() => setConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}