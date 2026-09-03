import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
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
  OrderCard,
  Badge,
  Button,
  Input,
  EmptyState,
  ErrorState,
  friendlyError,
  ListSkeleton,
} from '../../components/ui';
import type { BadgeTone, OrderMetaRow } from '../../components/ui';

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
  cancellationReason?: string;
  cancelledBy?: 'buyer' | 'admin';
  cancelledAt?: string;
  items: OrderItem[];
  createdAt: string;
}

export default function OrdersScreen() {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        itemsSection: {
          marginTop: Layout.spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: Layout.spacing.sm,
        },
        itemRowContainer: {
          paddingVertical: Layout.spacing.sm,
        },
        itemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.md,
        },
        itemText: {
          flex: 1,
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.text,
        },
        itemPrice: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
        },
        reviewBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs,
          marginTop: Layout.spacing.sm,
          backgroundColor: colors.primarySoft,
          alignSelf: 'flex-start',
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm,
          borderRadius: Layout.borderRadius.full,
        },
        reviewBtnText: {
          fontSize: Typography.fontSize.xs,
          color: colors.primary,
          fontWeight: Typography.fontWeight.bold,
        },
        blockchainDetails: {
          backgroundColor: colors.primaryTint,
          borderRadius: Layout.borderRadius.md,
          borderWidth: 1,
          borderColor: colors.primarySoft,
          padding: Layout.spacing.md,
          marginTop: Layout.spacing.md,
          gap: Layout.spacing.xs,
        },
        blockchainDetailText: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
        },
        blockchainValue: {
          fontWeight: Typography.fontWeight.bold,
          color: colors.primary,
        },
        cancelledNote: {
          marginTop: Layout.spacing.md,
          color: colors.error,
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          fontWeight: Typography.fontWeight.semibold,
        },
        actionsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          flexShrink: 1,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: Layout.spacing.lg,
        },
        modalContent: {
          width: '100%',
          maxWidth: 400,
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.xl,
          padding: Layout.spacing.xl,
          ...Layout.shadow.lg,
        },
        modalTitle: {
          fontSize: Typography.fontSize.xl,
          lineHeight: Typography.leading.xl,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
        },
        modalSubtitle: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: Layout.spacing.xs,
        },
        starsContainer: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.lg,
          marginBottom: Layout.spacing.lg,
        },
        starBtn: {
          padding: Layout.spacing.xs,
        },
        modalButtons: {
          flexDirection: 'row',
          gap: Layout.spacing.md,
          marginTop: Layout.spacing.sm,
        },
        modalBtn: {
          flex: 1,
        },
      }),
    [colors]
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** Display-only: renders the failure the catch block already handles. */
  const [loadError, setLoadError] = useState<unknown>(null);

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
      setLoadError(null);
      const response = await api.get('/orders/buyer');
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      logApiError('Buyer load orders', error);
      setLoadError(error);
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
        setLoadError(null);
      }
    } catch (error) {
      logApiError('Buyer refresh orders', error);
      setLoadError(error);
    } finally {
      setRefreshing(false);
    }
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
      return;
    }

    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : [{ text: 'OK' }]);
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
        logApiError('Cancel order failed', error);
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
      return;
    }

    Alert.alert('Cancel order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      { text: 'Cancel Order', style: 'destructive', onPress: cancelAction },
    ]);
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
      logApiError('Submit review error', error);
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

  const getStatusTone = (status: string): BadgeTone => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'pending':
        return 'warning';
      case 'accepted':
      case 'confirmed':
      case 'packed':
      case 'processing':
      case 'shipped':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'neutral';
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
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={() => {
              setReviewProductId(item.product._id);
              setRating(5);
              setComment('');
            }}
          >
            <Ionicons name="star-outline" size={14} color={colors.primary} />
            <Text style={styles.reviewBtnText}>Write a Review</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    const rows: OrderMetaRow[] = [
      {
        icon: 'card-outline',
        label: 'Payment',
        value: item.paymentMethod.replace('_', ' ').toUpperCase(),
      },
    ];

    return (
      <OrderCard
        reference={item.orderNumber}
        date={`Ordered on ${formatDate(item.createdAt)}`}
        statusLabel={item.status.toUpperCase()}
        statusTone={getStatusTone(item.status)}
        rows={rows}
        total={`₹${item.totalAmount.toFixed(2)}`}
        actions={
          <View style={styles.actionsRow}>
            <Button
              title={item.status === 'cancelled' ? 'Timeline' : 'Track'}
              icon="navigate-outline"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={() =>
                router.push({ pathname: '/buyer/track-order', params: { orderId: item._id } })
              }
            />
            {['pending', 'accepted'].includes(item.status) && (
              <Button
                title="Cancel"
                variant="danger"
                size="sm"
                fullWidth={false}
                onPress={() => handleCancelOrder(item._id)}
              />
            )}
          </View>
        }
      >
        <View style={styles.itemsSection}>
          {item.items.map((orderItem, idx) => renderOrderItem(orderItem, idx, item.status))}
        </View>

        {/* Blockchain Details Section */}
        {item.paymentMethod === 'blockchain' && (
          <View style={styles.blockchainDetails}>
            <Badge label="Smart Escrow Verified" tone="primary" icon="link-outline" />
            {item.blockchainOrderId !== undefined && item.blockchainOrderId !== null && (
              <Text style={styles.blockchainDetailText} numberOfLines={1}>
                On-Chain Escrow ID: <Text style={styles.blockchainValue}>#{item.blockchainOrderId}</Text>
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
          </View>
        )}

        {item.status === 'cancelled' && item.cancellationReason ? (
          <Text style={styles.cancelledNote}>Cancellation note: {item.cancellationReason}</Text>
        ) : null}
      </OrderCard>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My Orders"
        onBack={() => router.replace('/buyer')}
        iconActions={[
          {
            icon: 'refresh',
            onPress: handleRefresh,
            accessibilityLabel: 'Refresh orders',
          },
        ]}
      />

      {loading && !refreshing ? (
        <View style={styles.skeletonWrap}>
          <ListSkeleton count={3} />
        </View>
      ) : loadError && orders.length === 0 ? (
        <ErrorState
          title="Could not load your orders"
          message={friendlyError(loadError, 'We could not load your orders. Please try again.')}
          onRetry={fetchOrders}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No Orders Placed Yet"
          description="When you purchase products, they will appear here along with blockchain transaction status."
          actionLabel="Shop Now"
          onAction={() => router.push('/buyer/browse')}
        />
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
            <Text style={styles.modalSubtitle}>
              Tap a star and tell other buyers about your experience.
            </Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={34}
                    color={colors.star}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Your review"
              placeholder="Write your experience with this product..."
              value={comment}
              onChangeText={setComment}
              multiline={true}
              numberOfLines={4}
              containerStyle={{ marginBottom: 0 }}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={handleCancelReview}
                disabled={submittingReview}
                style={styles.modalBtn}
              />
              <Button
                title="Submit"
                onPress={handleSubmitReview}
                loading={submittingReview}
                disabled={submittingReview}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
