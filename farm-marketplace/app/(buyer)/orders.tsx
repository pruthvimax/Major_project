import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';

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
  status: 'pending' | 'accepted' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'confirmed' | 'processing';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'bank_transfer' | 'blockchain';
  blockchainTxHash?: string;
  blockchainOrderId?: number;
  items: OrderItem[];
  createdAt: string;
}

export default function OrdersScreen() {
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
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
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
  noOrdersTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
    marginTop: Layout.spacing.md,
  },
  noOrdersDesc: {
    color: colors.gray,
    textAlign: 'center',
    marginTop: Layout.spacing.xs,
    lineHeight: 18,
    marginBottom: Layout.spacing.lg,
  },
  shopBtn: {
    backgroundColor: colors.secondary,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.sm,
  },
  shopBtnText: {
    color: colors.white,
    fontWeight: Typography.fontWeight.bold,
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  itemsSection: {
    marginBottom: Layout.spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
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
    color: colors.secondary,
  },
  blockchainDetails: {
    backgroundColor: '#E8F5E9',
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.md,
    marginVertical: Layout.spacing.sm,
  },
  blockchainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  blockchainTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
    marginLeft: 4,
  },
  blockchainDetailText: {
    fontSize: 10,
    color: '#555',
    marginVertical: 2,
  },
  blockchainValue: {
    fontWeight: '700',
    color: '#2E7D32',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    alignItems: 'center',
    flex: 1,
    marginLeft: Layout.spacing.sm,
  },
  cancelBtnText: {
    color: '#C62828',
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
  },
  actionBtnsRow: {
    flexDirection: 'row',
    marginTop: Layout.spacing.md,
    alignItems: 'center',
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    flex: 1,
    justifyContent: 'center',
  },
  trackBtnText: {
    color: colors.secondary,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.sm,
    marginLeft: 4,
  },
  itemRowContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.xs,
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.xs,
  },
  reviewBtnText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '600',
    marginLeft: Layout.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
    marginBottom: Layout.spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.lg,
  },
  reviewInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    height: 100,
    textAlignVertical: 'top',
    fontSize: Typography.fontSize.sm,
    color: colors.black,
    backgroundColor: colors.lighterGray,
    marginBottom: Layout.spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Layout.spacing.xs,
  },
  cancelModalBtn: {
    backgroundColor: colors.lighterGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelModalBtnText: {
    color: colors.gray,
    fontWeight: Typography.fontWeight.bold,
  },
  submitModalBtn: {
    backgroundColor: colors.secondary,
  },
  submitModalBtnText: {
    color: colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
}), [colors]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Review states
  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/buyer');
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/orders/buyer');
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error refreshing orders:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      // confirm dialog style alert
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const cancelAction = async () => {
      try {
        setLoading(true);
        const response = await api.put(`/orders/${orderId}/cancel`);
        if (response.data.success) {
          showAlert('Success', 'Order cancelled successfully. Refund initiated if paid on-chain!');
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
      const confirmCancel = window.confirm('Are you sure you want to cancel this order?');
      if (confirmCancel) {
        cancelAction();
      }
    } else {
      // standard react native confirm dialog
      cancelAction();
    }
  };

  const handleCancelReview = () => {
    setReviewProductId(null);
  };

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      showAlert('Error', 'Please enter a review comment');
      return;
    }

    try {
      setSubmittingReview(true);
      const response = await api.post('/reviews', {
        productId: reviewProductId,
        rating,
        comment: comment.trim(),
      });

      if (response.data.success) {
        showAlert('Success', 'Thank you for your rating and review!');
        setReviewProductId(null);
        fetchOrders();
      }
    } catch (error: any) {
      console.error('Submit review error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to submit review.';
      showAlert('Error', errorMsg);
    } finally {
      setSubmittingReview(false);
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
      case 'accepted':
      case 'confirmed':
        return '#1976D2';
      case 'packed':
      case 'processing':
        return '#7B1FA2';
      case 'shipped':
        return '#0277BD';
      case 'cancelled':
        return '#C62828';
      default:
        return colors.gray;
    }
  };

  const renderOrderItem = (item: OrderItem, index: number, orderStatus: string) => {
    const showReviewBtn = orderStatus === 'delivered' && item.product?._id;
    return (
      <View key={index} style={styles.itemRowContainer}>
        <View style={styles.itemRow}>
          <Text style={styles.itemText} numberOfLines={1}>
            {item.product?.name || 'Product'} x {item.quantity}
          </Text>
          <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
        </View>
        {showReviewBtn && (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => {
              setReviewProductId(item.product._id);
              setRating(5);
              setComment('');
            }}
          >
            <Ionicons name="star-outline" size={14} color={colors.secondary} />
            <Text style={styles.reviewBtnText}>Write a Review</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.orderDate}>Ordered on {formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.itemsSection}>
        {item.items.map((orderItem, idx) => renderOrderItem(orderItem, idx, item.status))}
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
            <Text style={styles.blockchainTitle}>Smart Escrow Verified</Text>
          </View>
          {item.blockchainOrderId !== undefined && item.blockchainOrderId !== null && (
            <Text style={styles.blockchainDetailText}>
              On-Chain Escrow ID: <Text style={styles.blockchainValue}>#{item.blockchainOrderId}</Text>
            </Text>
          )}
          {item.blockchainTxHash ? (
            <View style={styles.txRow}>
              <Text style={styles.blockchainDetailText} numberOfLines={1}>
                Tx Hash: <Text style={styles.blockchainValue}>{item.blockchainTxHash}</Text>
              </Text>
            </View>
          ) : (
            <Text style={styles.blockchainDetailText}>
              Tx Hash: <Text style={styles.blockchainValue}>Processing...</Text>
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionBtnsRow}>
        {item.status !== 'cancelled' && (
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => router.push({ pathname: '/(buyer)/track-order', params: { orderId: item._id } })}
          >
            <Ionicons name="navigate-outline" size={14} color={colors.secondary} />
            <Text style={styles.trackBtnText}>Track Order</Text>
          </TouchableOpacity>
        )}
        {(item.status === 'pending') && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancelOrder(item._id)}
          >
            <Text style={styles.cancelBtnText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(buyer)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Fetching order details...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={60} color={colors.gray} />
          <Text style={styles.noOrdersTitle}>No Orders Placed Yet</Text>
          <Text style={styles.noOrdersDesc}>When you purchase products, they will appear here along with blockchain transaction status.</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => router.push('/(buyer)/browse')}
          >
            <Text style={styles.shopBtnText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Review & Rating Modal */}
      <Modal
        visible={reviewProductId !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelReview}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate this Product</Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color="#FFD700"
                    style={{ marginHorizontal: 6 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Write your experience with this product..."
              placeholderTextColor={colors.gray}
              value={comment}
              onChangeText={setComment}
              multiline={true}
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={handleCancelReview}
                disabled={submittingReview}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitModalBtn]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

