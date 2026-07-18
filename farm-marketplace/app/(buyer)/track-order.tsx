import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../services/api';

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

const STATUS_ORDER = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending: 'time-outline',
  confirmed: 'checkmark-circle-outline',
  processing: 'cube-outline',
  shipped: 'car-outline',
  delivered: 'home-outline',
  cancelled: 'close-circle-outline',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#EF6C00',
  confirmed: '#0277BD',
  processing: '#6A1B9A',
  shipped: '#00838F',
  delivered: '#2E7D32',
  cancelled: '#C62828',
};

export default function TrackOrderScreen() {
  const colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Layout.spacing.xl },
  loadingText: { marginTop: Layout.spacing.md, color: colors.gray },
  errorText: { color: colors.gray, marginTop: Layout.spacing.md, textAlign: 'center' },
  retryBtn: {
    marginTop: Layout.spacing.lg,
    backgroundColor: colors.secondary,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
  },
  retryBtnText: { color: colors.white, fontWeight: 'bold' },
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
  backButton: { padding: Layout.spacing.xs },
  refreshBtn: { padding: Layout.spacing.xs },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
  },
  scrollContent: { padding: Layout.spacing.md, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderNumber: { fontSize: Typography.fontSize.md, fontWeight: 'bold', color: colors.black },
  statusBadge: { paddingHorizontal: Layout.spacing.sm, paddingVertical: 4, borderRadius: Layout.borderRadius.xs },
  statusText: { fontSize: 10, fontWeight: '700' },
  orderDate: { fontSize: Typography.fontSize.xs, color: colors.gray, marginBottom: Layout.spacing.sm },
  etaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  etaText: { fontSize: Typography.fontSize.xs, color: colors.gray, marginLeft: 4 },
  etaBold: { color: colors.secondary, fontWeight: '600' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  paymentText: { fontSize: Typography.fontSize.xs, color: colors.gray, marginLeft: 4 },
  stepperCard: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
    marginBottom: Layout.spacing.md,
  },
  stepper: {},
  stepRow: { flexDirection: 'row', marginBottom: 0 },
  stepLeft: { alignItems: 'center', width: 36 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: { width: 2, flex: 1, minHeight: 28, marginVertical: 2 },
  stepContent: { flex: 1, paddingLeft: Layout.spacing.sm, paddingBottom: Layout.spacing.md, justifyContent: 'center' },
  stepLabel: { fontSize: Typography.fontSize.sm, color: colors.gray, fontWeight: '500' },
  stepLabelActive: { color: colors.secondary, fontWeight: '700' },
  stepSubLabel: { fontSize: 10, color: colors.secondary, marginTop: 2 },
  timelineCard: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noEventsText: { color: colors.gray, fontSize: Typography.fontSize.sm },
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineDotCol: { alignItems: 'center', width: 20, marginRight: Layout.spacing.sm },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  timelineConnector: { width: 2, flex: 1, backgroundColor: colors.border, minHeight: 24, marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: Layout.spacing.lg },
  timelineMessage: { fontSize: Typography.fontSize.sm, color: colors.black, fontWeight: '500' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { fontSize: 11, color: colors.gray, marginLeft: 2 },
  timelineTime: { fontSize: 11, color: colors.gray, marginTop: 4 },
  addressCard: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.sm },
  addressText: { fontSize: Typography.fontSize.sm, color: colors.gray, lineHeight: 22 },
  itemsCard: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: { fontSize: Typography.fontSize.sm, color: colors.black, flex: 1 },
  itemDetail: { fontSize: Typography.fontSize.sm, color: colors.secondary, fontWeight: '600' },
}), [colors]);
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTracking = useCallback(async () => {
    try {
      const response = await api.get(`/payments/tracking/${orderId}`);
      if (response.data.success) {
        setTracking(response.data.tracking);
      }
    } catch (error) {
      console.error('Fetch tracking error:', error);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Fetching tracking info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tracking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.gray} />
          <Text style={styles.errorText}>Could not load tracking information.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTracking}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCancelled = tracking.status === 'cancelled';
  const currentStatusIndex = STATUS_ORDER.indexOf(tracking.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <TouchableOpacity onPress={fetchTracking} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.secondary]} />}
      >
        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.orderNumber}>{tracking.orderNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[tracking.status] || colors.gray) + '20' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[tracking.status] || colors.gray }]}>
                {tracking.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>Placed on {formatDateShort(tracking.createdAt)}</Text>

          {tracking.estimatedDelivery && !isCancelled && (
            <View style={styles.etaRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.secondary} />
              <Text style={styles.etaText}>
                Est. Delivery: <Text style={styles.etaBold}>{formatDateShort(tracking.estimatedDelivery)}</Text>
              </Text>
            </View>
          )}

          <View style={styles.paymentRow}>
            <Ionicons name="card-outline" size={14} color={colors.gray} />
            <Text style={styles.paymentText}>
              {tracking.paymentMethod.replace('_', ' ').toUpperCase()} ·{' '}
              <Text style={{ color: tracking.paymentStatus === 'paid' ? colors.secondary : '#EF6C00' }}>
                {tracking.paymentStatus.toUpperCase()}
              </Text>
            </Text>
          </View>
        </View>

        {/* Visual Progress Stepper */}
        {!isCancelled && (
          <View style={styles.stepperCard}>
            <Text style={styles.sectionTitle}>Order Progress</Text>
            <View style={styles.stepper}>
              {STATUS_ORDER.map((step, idx) => {
                const isDone = idx <= currentStatusIndex;
                const isActive = idx === currentStatusIndex;
                const color = isDone ? colors.secondary : colors.border;
                return (
                  <View key={step} style={styles.stepRow}>
                    <View style={styles.stepLeft}>
                      <View style={[styles.stepCircle, { borderColor: color, backgroundColor: isDone ? color : colors.white }]}>
                        <Ionicons
                          name={STATUS_ICONS[step] || 'ellipse-outline'}
                          size={16}
                          color={isDone ? colors.white : colors.border}
                        />
                      </View>
                      {idx < STATUS_ORDER.length - 1 && (
                        <View style={[styles.stepLine, { backgroundColor: idx < currentStatusIndex ? colors.secondary : colors.border }]} />
                      )}
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                        {step.charAt(0).toUpperCase() + step.slice(1)}
                      </Text>
                      {isActive && (
                        <Text style={styles.stepSubLabel}>Current Status</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Tracking Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Tracking Timeline</Text>
          {tracking.events.length === 0 ? (
            <Text style={styles.noEventsText}>No tracking updates yet.</Text>
          ) : (
            tracking.events.map((event, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineDotCol}>
                  <View style={[styles.timelineDot, { backgroundColor: STATUS_COLORS[event.status] || colors.secondary }]} />
                  {idx < tracking.events.length - 1 && <View style={styles.timelineConnector} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineMessage}>{event.message}</Text>
                  {event.location ? (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={12} color={colors.gray} />
                      <Text style={styles.locationText}>{event.location}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.timelineTime}>{formatDate(event.timestamp)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Shipping Address */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <Ionicons name="location-outline" size={18} color={colors.secondary} />
            <Text style={styles.sectionTitle}> Delivery Address</Text>
          </View>
          <Text style={styles.addressText}>
            {tracking.shippingAddress.address}, {tracking.shippingAddress.city},{'\n'}
            {tracking.shippingAddress.state} - {tracking.shippingAddress.pincode},{'\n'}
            {tracking.shippingAddress.country}
          </Text>
        </View>

        {/* Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Items Ordered</Text>
          {tracking.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
              <Text style={styles.itemDetail}>
                {item.quantity} {item.product?.unit} · ₹{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

