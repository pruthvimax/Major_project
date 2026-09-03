import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import {
  ScreenHeader,
  SectionHeader,
  Card,
  Badge,
  Loading,
  ErrorState,
  friendlyError,
} from '../../components/ui';
import type { BadgeTone } from '../../components/ui';

interface TrackingEvent {
  status: string;
  message: string;
  location?: string;
  timestamp: string;
}

interface TrackingData {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  estimatedDelivery?: string;
  createdAt: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  events: TrackingEvent[];
  items: {
    product: { name: string; unit: string };
    quantity: number;
    price: number;
  }[];
}

const STATUS_ORDER = ['pending', 'accepted', 'packed', 'shipped', 'delivered'];

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending: 'time-outline',
  accepted: 'checkmark-circle-outline',
  packed: 'cube-outline',
  shipped: 'car-outline',
  delivered: 'home-outline',
  cancelled: 'close-circle-outline',
};

const STATUS_TONES: Record<string, BadgeTone> = {
  pending: 'warning',
  accepted: 'info',
  packed: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error',
};

export default function TrackOrderScreen() {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scrollContent: {
          padding: Layout.spacing.lg,
          paddingBottom: Layout.spacing.xxl,
        },
        card: {
          padding: Layout.spacing.lg,
          marginBottom: Layout.spacing.md,
        },
        summaryRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
        },
        orderNumber: {
          flex: 1,
          fontSize: Typography.fontSize.lg,
          lineHeight: Typography.leading.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        orderDate: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          marginTop: 2,
        },
        metaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.md,
          paddingTop: Layout.spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        metaIconWell: {
          width: 32,
          height: 32,
          borderRadius: Layout.borderRadius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primarySoft,
        },
        metaLabel: {
          fontSize: Typography.fontSize.xxs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          fontWeight: Typography.fontWeight.semibold,
        },
        metaValue: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.text,
          fontWeight: Typography.fontWeight.semibold,
        },
        metaBody: { flex: 1, minWidth: 0 },
        stepRow: { flexDirection: 'row' },
        stepLeft: { alignItems: 'center', width: 36 },
        stepCircle: {
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
        stepCircleCurrent: {
          ...Layout.shadow.sm,
        },
        stepLine: { width: 3, flex: 1, minHeight: 26, marginVertical: 3, borderRadius: 2 },
        stepContent: {
          flex: 1,
          minWidth: 0,
          paddingLeft: Layout.spacing.md,
          paddingBottom: Layout.spacing.lg,
        },
        stepLabel: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.muted,
          fontWeight: Typography.fontWeight.semibold,
        },
        stepLabelDone: { color: colors.text },
        stepLabelActive: { color: colors.primary, fontWeight: Typography.fontWeight.bold },
        stepTime: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          marginTop: 2,
        },
        noEventsText: {
          color: colors.textSecondary,
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
        },
        cancelledInfoText: {
          fontSize: Typography.fontSize.sm,
          color: colors.textSecondary,
          marginTop: Layout.spacing.xs,
          lineHeight: Typography.leading.sm,
        },
        timelineItem: { flexDirection: 'row' },
        timelineDotCol: { alignItems: 'center', width: 20, marginRight: Layout.spacing.sm },
        timelineDotOuter: {
          width: 20,
          height: 20,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
        },
        timelineDot: { width: 10, height: 10, borderRadius: 5 },
        timelineConnector: {
          width: 3,
          flex: 1,
          backgroundColor: colors.lightGray,
          minHeight: 22,
          marginVertical: 3,
          borderRadius: 2,
        },
        timelineContent: { flex: 1, minWidth: 0, paddingBottom: Layout.spacing.lg },
        timelineMessage: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.text,
          fontWeight: Typography.fontWeight.semibold,
        },
        locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
        locationText: {
          flexShrink: 1,
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
        },
        timelineTime: {
          fontSize: Typography.fontSize.xs,
          color: colors.muted,
          marginTop: 4,
        },
        addressText: {
          fontSize: Typography.fontSize.sm,
          color: colors.textSecondary,
          lineHeight: Typography.leading.md,
        },
        itemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm + 2,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        itemRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
        itemName: {
          flex: 1,
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.text,
          fontWeight: Typography.fontWeight.medium,
        },
        itemDetail: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.primary,
          fontWeight: Typography.fontWeight.bold,
        },
      }),
    [colors]
  );
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** Display-only: renders the failure the catch block already handles. */
  const [loadError, setLoadError] = useState<unknown>(null);

  const fetchTracking = useCallback(async () => {
    try {
      const response = await api.get(`/payments/tracking/${orderId}`);
      if (response.data.success) {
        setTracking(response.data.tracking);
        setLoadError(null);
      }
    } catch (error) {
      logApiError('Fetch tracking error', error);
      setLoadError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchTracking();
    // Poll every 30 seconds for near-real-time updates
    const interval = setInterval(fetchTracking, 30000);
    return () => clearInterval(interval);
  }, [fetchTracking]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTracking();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const eventColor = (status: string) => {
    if (status === 'cancelled') return colors.error;
    if (status === 'pending') return colors.warning;
    return colors.primary;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Track Order" onBack={() => router.back()} />
        <Loading label="Fetching tracking info…" />
      </View>
    );
  }

  if (!tracking) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Track Order" onBack={() => router.back()} />
        <ErrorState
          title="Tracking unavailable"
          message={friendlyError(loadError, 'We could not load tracking information for this order.')}
          onRetry={fetchTracking}
        />
      </View>
    );
  }

  const isCancelled = tracking.status === 'cancelled';
  const currentStatusIndex = STATUS_ORDER.indexOf(tracking.status);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Track Order"
        onBack={() => router.back()}
        iconActions={[
          {
            icon: 'refresh',
            onPress: fetchTracking,
            accessibilityLabel: 'Refresh tracking',
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Order Summary Card */}
        <Card padded={false} style={styles.card}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.orderNumber} numberOfLines={1}>
                {tracking.orderNumber}
              </Text>
              <Text style={styles.orderDate}>
                Placed on {formatDateShort(tracking.createdAt)}
              </Text>
            </View>
            <Badge
              label={tracking.status.toUpperCase()}
              tone={STATUS_TONES[tracking.status] || 'neutral'}
              size="md"
              icon={STATUS_ICONS[tracking.status]}
            />
          </View>

          {tracking.estimatedDelivery && !isCancelled && (
            <View style={styles.metaRow}>
              <View style={styles.metaIconWell}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              </View>
              <View style={styles.metaBody}>
                <Text style={styles.metaLabel}>Estimated delivery</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {formatDateShort(tracking.estimatedDelivery)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaIconWell}>
              <Ionicons name="card-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.metaBody}>
              <Text style={styles.metaLabel}>Payment</Text>
              <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="middle">
                {tracking.paymentMethod.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <Badge
              label={tracking.paymentStatus.toUpperCase()}
              tone={tracking.paymentStatus === 'paid' ? 'success' : 'warning'}
            />
          </View>
        </Card>

        {/* Visual Progress Stepper */}
        {!isCancelled && (
          <Card padded={false} style={styles.card}>
            <SectionHeader title="Order Progress" />
            <View>
              {STATUS_ORDER.map((step, idx) => {
                const isDone = idx <= currentStatusIndex;
                const isActive = idx === currentStatusIndex;
                const stepEvent = tracking.events.find((e) => e.status === step);
                const color = isDone ? colors.primary : colors.lightGray;
                return (
                  <View key={step} style={styles.stepRow}>
                    <View style={styles.stepLeft}>
                      <View
                        style={[
                          styles.stepCircle,
                          {
                            borderColor: color,
                            backgroundColor: isDone ? color : colors.surface,
                          },
                          isActive && styles.stepCircleCurrent,
                        ]}
                      >
                        <Ionicons
                          name={STATUS_ICONS[step] || 'ellipse-outline'}
                          size={16}
                          color={isDone ? colors.white : colors.muted}
                        />
                      </View>
                      {idx < STATUS_ORDER.length - 1 && (
                        <View
                          style={[
                            styles.stepLine,
                            {
                              backgroundColor:
                                idx < currentStatusIndex ? colors.primary : colors.lightGray,
                            },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.stepContent}>
                      <Text
                        style={[
                          styles.stepLabel,
                          isDone && styles.stepLabelDone,
                          isActive && styles.stepLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {step.charAt(0).toUpperCase() + step.slice(1)}
                      </Text>
                      {stepEvent ? (
                        <Text style={styles.stepTime} numberOfLines={1}>
                          {formatDate(stepEvent.timestamp)}
                        </Text>
                      ) : null}
                      {isActive && (
                        <Badge
                          label="Current status"
                          tone="primary"
                          style={{ marginTop: Layout.spacing.xs }}
                        />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {isCancelled && (
          <Card padded={false} style={styles.card}>
            <SectionHeader title="Cancellation Details" />
            <Text style={styles.cancelledInfoText}>
              {tracking.cancellationReason || 'This order was cancelled by the buyer or administrator.'}
            </Text>
            {tracking.cancelledAt ? (
              <Text style={styles.cancelledInfoText}>
                Cancelled on {formatDate(tracking.cancelledAt)}
              </Text>
            ) : null}
          </Card>
        )}

        {/* Tracking Timeline */}
        <Card padded={false} style={styles.card}>
          <SectionHeader title="Tracking Timeline" />
          {tracking.events.length === 0 ? (
            <Text style={styles.noEventsText}>No tracking updates yet.</Text>
          ) : (
            tracking.events.map((event, idx) => {
              const dotColor = eventColor(event.status);
              const isLast = idx === tracking.events.length - 1;
              return (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineDotCol}>
                    <View style={[styles.timelineDotOuter, { backgroundColor: dotColor + '22' }]}>
                      <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                    </View>
                    {!isLast && <View style={styles.timelineConnector} />}
                  </View>
                  <View
                    style={[
                      styles.timelineContent,
                      isLast && { paddingBottom: 0 },
                    ]}
                  >
                    <Text style={styles.timelineMessage}>{event.message}</Text>
                    {event.location ? (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={12} color={colors.muted} />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {event.location}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.timelineTime}>{formatDate(event.timestamp)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Shipping Address */}
        <Card padded={false} style={styles.card}>
          <SectionHeader title="Delivery Address" />
          <Text style={styles.addressText}>
            {tracking.shippingAddress.address}, {tracking.shippingAddress.city},{'\n'}
            {tracking.shippingAddress.state} - {tracking.shippingAddress.pincode},{'\n'}
            {tracking.shippingAddress.country}
          </Text>
        </Card>

        {/* Items */}
        <Card padded={false} style={styles.card}>
          <SectionHeader title="Items Ordered" />
          {tracking.items.map((item, idx) => (
            <View
              key={idx}
              style={[styles.itemRow, idx === tracking.items.length - 1 && styles.itemRowLast]}
            >
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product?.name || 'Product'}
              </Text>
              <Text style={styles.itemDetail} numberOfLines={1}>
                {item.quantity} {item.product?.unit} · ₹{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
