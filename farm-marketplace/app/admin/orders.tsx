import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import AdminHeader from '../../components/admin/AdminHeader';
import SearchBar from '../../components/admin/SearchBar';
import FilterChips from '../../components/admin/FilterChips';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { AdminListSkeleton } from '../../components/admin/AdminSkeleton';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  friendlyError,
} from '../../components/ui';

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
  const insets = useSafeAreaInsets();
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
    listContainer: {
      paddingHorizontal: Layout.spacing.md,
      paddingTop: Layout.spacing.sm,
      paddingBottom: Layout.spacing.xxl,
    },

    // List card
    card: { marginBottom: Layout.spacing.md - 2 },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Layout.spacing.md,
    },
    iconWell: {
      width: 46,
      height: 46,
      borderRadius: Layout.borderRadius.md,
      backgroundColor: colors.tintBlue,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    cardHeadings: { flex: 1, minWidth: 0 },
    orderNumber: {
      fontSize: Typography.fontSize.md,
      lineHeight: Typography.leading.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
    },
    orderDate: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.muted,
      marginTop: 2,
    },
    partyBlock: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: Layout.borderRadius.md,
      paddingHorizontal: Layout.spacing.md,
      paddingVertical: Layout.spacing.sm,
      marginTop: Layout.spacing.md,
      gap: Layout.spacing.xs,
    },
    partyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
    },
    partyLabel: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      flexShrink: 0,
    },
    partyName: {
      flex: 1,
      minWidth: 0,
      fontSize: Typography.fontSize.sm,
      color: colors.text,
      fontWeight: Typography.fontWeight.semibold,
      textAlign: 'right',
    },
    itemsSection: { marginTop: Layout.spacing.md, gap: Layout.spacing.xs },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Layout.spacing.md,
    },
    itemText: {
      flex: 1,
      minWidth: 0,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.text,
    },
    itemPrice: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
      flexShrink: 0,
    },
    paymentInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: Layout.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: Layout.spacing.md,
      marginTop: Layout.spacing.md,
    },
    paymentCol: { flex: 1, minWidth: 0, gap: Layout.spacing.xs },
    paymentMethodLabel: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
    },
    paymentMethodValue: {
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
    },
    paymentStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
      flexWrap: 'wrap',
    },
    totalCol: { alignItems: 'flex-end', flexShrink: 0 },
    totalLabel: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
    },
    totalPrice: {
      fontSize: Typography.fontSize.xl,
      lineHeight: Typography.leading.xl,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.primary,
    },
    noteBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Layout.spacing.sm,
      backgroundColor: colors.errorSoft,
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.md,
      marginTop: Layout.spacing.md,
    },
    cancelledNote: {
      flex: 1,
      minWidth: 0,
      color: colors.error,
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      fontWeight: Typography.fontWeight.semibold,
    },
    blockchainDetails: {
      backgroundColor: colors.primarySoft,
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.md,
      marginTop: Layout.spacing.md,
      gap: 2,
    },
    blockchainHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.xs,
      marginBottom: Layout.spacing.xs,
    },
    blockchainTitle: {
      fontSize: Typography.fontSize.xxs,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.primaryDark,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    blockchainDetailText: {
      fontSize: Typography.fontSize.xxs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
    },
    blockchainValue: {
      fontWeight: Typography.fontWeight.bold,
      color: colors.primaryDark,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Layout.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: Layout.spacing.md,
      paddingTop: Layout.spacing.md,
    },

    errorBanner: { paddingHorizontal: Layout.spacing.md, paddingVertical: Layout.spacing.md },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: Layout.borderRadius.xxl,
      borderTopRightRadius: Layout.borderRadius.xxl,
      paddingHorizontal: Layout.spacing.lg,
      paddingTop: Layout.spacing.sm,
      maxHeight: '88%',
      ...Layout.shadow.lg,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: Layout.borderRadius.full,
      backgroundColor: colors.lightGray,
      marginBottom: Layout.spacing.sm,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Layout.spacing.md,
      paddingBottom: Layout.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      flex: 1,
      fontSize: Typography.fontSize.xl,
      lineHeight: Typography.leading.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sheetBody: {
      paddingTop: Layout.spacing.md,
      paddingBottom: Layout.spacing.xl + insets.bottom,
    },
    detailCard: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: Layout.borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Layout.spacing.md,
      paddingVertical: Layout.spacing.sm,
      marginTop: Layout.spacing.sm,
    },
    sectionLabel: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
      marginTop: Layout.spacing.lg,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Layout.spacing.md,
      paddingVertical: Layout.spacing.sm,
    },
    detailLabel: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
      flexShrink: 0,
    },
    detailValue: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.text,
      fontWeight: Typography.fontWeight.semibold,
      flex: 1,
      flexShrink: 1,
      textAlign: 'right',
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Layout.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: Layout.spacing.md,
      marginTop: Layout.spacing.sm,
    },
    totalValue: {
      fontSize: Typography.fontSize.lg,
      lineHeight: Typography.leading.lg,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.primary,
      flexShrink: 1,
      textAlign: 'right',
    },
    addressText: {
      fontSize: Typography.fontSize.sm,
      color: colors.text,
      lineHeight: Typography.leading.sm,
    },
    modalActions: { marginTop: Layout.spacing.xl },
  }), [colors, insets.bottom]);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/orders');
      if (response.data.success) {
        setOrders(response.data.orders);
        setFilteredOrders(response.data.orders);
      }
    } catch (error) {
      logApiError('Admin fetch orders', error);
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
        (order.orderNumber || '').toLowerCase().includes(normalizedSearch) ||
        (order.status || '').toLowerCase().includes(normalizedSearch) ||
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
      logApiError('Admin cancel order', error);
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

  const hasFilters = search.trim() !== '' || selectedFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSelectedFilter('all');
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
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconWell}>
          <Ionicons name="receipt-outline" size={22} color={colors.info} />
        </View>
        <View style={styles.cardHeadings}>
          <Text style={styles.orderNumber} numberOfLines={1}>
            {item.orderNumber}
          </Text>
          <Text style={styles.orderDate} numberOfLines={1}>
            Placed on {formatDate(item.createdAt)}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.partyBlock}>
        <View style={styles.partyRow}>
          <Ionicons name="person-outline" size={14} color={colors.muted} />
          <Text style={styles.partyLabel}>Buyer</Text>
          <Text style={styles.partyName} numberOfLines={1}>
            {item.buyer?.name || 'Unknown'}
          </Text>
        </View>
        <View style={styles.partyRow}>
          <Ionicons name="leaf-outline" size={14} color={colors.muted} />
          <Text style={styles.partyLabel}>Farmer</Text>
          <Text style={styles.partyName} numberOfLines={1}>
            {item.farmer?.name || 'Unknown'}
          </Text>
        </View>
      </View>

      <View style={styles.itemsSection}>
        {(item.items || []).map((orderItem, idx) => renderOrderItem(orderItem, idx))}
      </View>

      <View style={styles.paymentInfoRow}>
        <View style={styles.paymentCol}>
          <Text style={styles.paymentMethodLabel} numberOfLines={1}>
            Payment:{' '}
            <Text style={styles.paymentMethodValue}>
              {item.paymentMethod?.replace('_', ' ').toUpperCase()}
            </Text>
          </Text>
          <View style={styles.paymentStatusRow}>
            <Text style={styles.paymentMethodLabel}>Status</Text>
            <StatusBadge status={item.paymentStatus} />
          </View>
        </View>
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice} numberOfLines={1}>
            ₹{item.totalAmount?.toFixed(2)}
          </Text>
        </View>
      </View>

      {item.status === 'cancelled' && (
        <View style={styles.noteBox}>
          <Ionicons name="close-circle-outline" size={16} color={colors.error} />
          <Text style={styles.cancelledNote}>
            Cancelled {item.cancelledBy === 'admin' ? 'by admin' : 'by buyer'}
            {item.cancellationReason ? ` — ${item.cancellationReason}` : ''}
          </Text>
        </View>
      )}

      {item.paymentMethod === 'blockchain' && (
        <View style={styles.blockchainDetails}>
          <View style={styles.blockchainHeader}>
            <Ionicons name="link-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.blockchainTitle} numberOfLines={1}>
              Blockchain Smart Escrow
            </Text>
          </View>
          {item.blockchainOrderId !== undefined && item.blockchainOrderId !== null && (
            <Text style={styles.blockchainDetailText} numberOfLines={1}>
              Escrow Order ID: <Text style={styles.blockchainValue}>#{item.blockchainOrderId}</Text>
            </Text>
          )}
          {item.blockchainTxHash ? (
            <Text style={styles.blockchainDetailText} numberOfLines={1} ellipsizeMode="middle">
              Tx Hash: <Text style={styles.blockchainValue}>{item.blockchainTxHash}</Text>
            </Text>
          ) : (
            <Text style={styles.blockchainDetailText} numberOfLines={1}>
              Tx Hash: <Text style={styles.blockchainValue}>Processing...</Text>
            </Text>
          )}
          {item.escrowStatus && (
            <Text style={styles.blockchainDetailText} numberOfLines={1}>
              Escrow: <Text style={styles.blockchainValue}>{item.escrowStatus.toUpperCase()}</Text>
            </Text>
          )}
        </View>
      )}

      <View style={styles.cardActions}>
        <Button
          title="View Details"
          icon="eye-outline"
          variant="outline"
          size="sm"
          fullWidth={false}
          onPress={() => {
            setSelectedOrder(item);
            setDetailVisible(true);
          }}
        />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
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

      {error && !loading && filteredOrders.length > 0 && (
        <ErrorState
          compact
          icon="alert-circle-outline"
          title="Something went wrong"
          message={friendlyError(error)}
          onRetry={fetchOrders}
          style={styles.errorBanner}
        />
      )}

      {loading ? (
        <AdminListSkeleton count={4} />
      ) : error && filteredOrders.length === 0 ? (
        <ErrorState
          title="Could not load orders"
          message={friendlyError(error)}
          onRetry={fetchOrders}
        />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No orders found"
          description={
            hasFilters
              ? 'No orders match this search or filter. Try widening it.'
              : 'No orders placed yet'
          }
          actionLabel={hasFilters ? 'Clear filters' : undefined}
          onAction={hasFilters ? clearFilters : undefined}
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
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                Order Details
              </Text>
              <TouchableOpacity
                onPress={() => setDetailVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close order details"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetBody}
              >
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order Number</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedOrder.orderNumber}
                    </Text>
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
                </View>

                <Text style={styles.sectionLabel}>Buyer</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedOrder.buyer?.name || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                      {selectedOrder.buyer?.email || 'N/A'}
                    </Text>
                  </View>
                  {selectedOrder.buyer?.mobile && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mobile</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {selectedOrder.buyer.mobile}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.sectionLabel}>Farmer</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedOrder.farmer?.name || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                      {selectedOrder.farmer?.email || 'N/A'}
                    </Text>
                  </View>
                  {selectedOrder.farmer?.mobile && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mobile</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {selectedOrder.farmer.mobile}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.sectionLabel}>Items</Text>
                <View style={styles.detailCard}>
                  {(selectedOrder.items || []).map((item, idx) => (
                    <View key={idx} style={styles.detailRow}>
                      <Text style={styles.itemText} numberOfLines={1}>
                        {item.product?.name || 'Product'} x {item.quantity}
                      </Text>
                      <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={styles.totalRow}>
                    <Text style={styles.detailLabel}>Total Amount</Text>
                    <Text style={styles.totalValue} numberOfLines={1}>
                      ₹{selectedOrder.totalAmount?.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Payment</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Method</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
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
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                        {selectedOrder.blockchainTxHash}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.sectionLabel}>Delivery Address</Text>
                <View style={styles.detailCard}>
                  {selectedOrder.shippingAddress ? (
                    <Text style={[styles.addressText, { paddingVertical: Layout.spacing.sm }]}>
                      {selectedOrder.shippingAddress.address}
                      {'\n'}
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                      {selectedOrder.shippingAddress.pincode}
                      {'\n'}
                      {selectedOrder.shippingAddress.country}
                    </Text>
                  ) : (
                    <Text style={[styles.detailValue, { paddingVertical: Layout.spacing.sm }]}>
                      No address provided
                    </Text>
                  )}
                </View>

                {selectedOrder.status === 'cancelled' && (
                  <>
                    <Text style={styles.sectionLabel}>Cancellation</Text>
                    <View style={styles.detailCard}>
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
                  </>
                )}

                {(selectedOrder.status === 'pending' || selectedOrder.status === 'accepted') && (
                  <View style={styles.modalActions}>
                    <Button
                      title="Force Cancel & Refund"
                      icon="close-circle-outline"
                      variant="danger"
                      size="md"
                      onPress={() => setConfirmVisible(true)}
                    />
                  </View>
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
