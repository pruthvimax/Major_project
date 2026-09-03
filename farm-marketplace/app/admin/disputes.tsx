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
  Input,
  friendlyError,
} from '../../components/ui';

interface Dispute {
  _id: string;
  orderNumber: string;
  status: string;
  verificationStatus: string;
  disputeReason?: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  buyer?: { name: string; email: string };
  farmer?: { name: string; email: string };
}

export default function AdminDisputesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filteredDisputes, setFilteredDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [resolution, setResolution] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
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
    reasonBox: {
      backgroundColor: colors.errorSoft,
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.md,
      marginTop: Layout.spacing.md,
    },
    reasonLabel: {
      fontSize: Typography.fontSize.xxs,
      lineHeight: Typography.leading.xs,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.error,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    reasonText: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.error,
    },
    resolvedBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
      backgroundColor: colors.successSoft,
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.md,
      marginTop: Layout.spacing.md,
    },
    resolvedText: {
      flex: 1,
      minWidth: 0,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.success,
      fontWeight: Typography.fontWeight.semibold,
    },
    amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: Layout.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: Layout.spacing.md,
      marginTop: Layout.spacing.md,
    },
    amountLabel: {
      flex: 1,
      minWidth: 0,
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
    },
    amountValue: {
      fontSize: Typography.fontSize.xl,
      lineHeight: Typography.leading.xl,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.primary,
      flexShrink: 0,
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
    sectionLabel: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
      marginTop: Layout.spacing.lg,
    },
    modalReasonText: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.error,
    },
    resolveInput: { marginTop: Layout.spacing.sm, marginBottom: Layout.spacing.md },
  }), [colors, insets.bottom]);

  const fetchDisputes = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/orders');
      if (response.data.success) {
        const allOrders = response.data.orders || [];
        const disputed = allOrders.filter(
          (o: any) => o.verificationStatus === 'disputed' || o.verificationStatus === 'resolved'
        );
        setDisputes(disputed);
        setFilteredDisputes(disputed);
      }
    } catch (error) {
      logApiError('Admin fetch disputes', error);
      setError('Failed to load disputes. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  useEffect(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const next = disputes.filter((d) => {
      const matchesFilter = selectedFilter === 'all' || d.verificationStatus === selectedFilter;
      const matchesSearch =
        normalizedSearch === '' ||
        (d.orderNumber || '').toLowerCase().includes(normalizedSearch) ||
        (d.buyer?.name && d.buyer.name.toLowerCase().includes(normalizedSearch)) ||
        (d.farmer?.name && d.farmer.name.toLowerCase().includes(normalizedSearch)) ||
        (d.disputeReason && d.disputeReason.toLowerCase().includes(normalizedSearch));
      return matchesFilter && matchesSearch;
    });
    setFilteredDisputes(next);
  }, [search, disputes, selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDisputes();
  }, [fetchDisputes]);

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolution.trim()) return;
    try {
      setResolveLoading(true);
      const response = await api.put(`/orders/${selectedDispute._id}/resolve-dispute`, {
        resolution: resolution.trim(),
        status: 'delivered',
      });
      if (response.data.success) {
        setDetailVisible(false);
        setResolution('');
        setSelectedDispute(null);
        fetchDisputes();
      }
    } catch (error: any) {
      logApiError('Admin resolve dispute', error);
      setError(error.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setResolveLoading(false);
      setConfirmVisible(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const hasFilters = search.trim() !== '' || selectedFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSelectedFilter('all');
  };

  /** Only the two verification statuses this screen loads are mapped. */
  const getDisputeTint = (verificationStatus: string) =>
    verificationStatus === 'resolved'
      ? { well: colors.successSoft, icon: colors.success, glyph: 'shield-checkmark-outline' as const }
      : { well: colors.errorSoft, icon: colors.error, glyph: 'alert-circle-outline' as const };

  const renderDisputeCard = ({ item }: { item: Dispute }) => {
    const tint = getDisputeTint(item.verificationStatus);
    return (
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.iconWell, { backgroundColor: tint.well }]}>
            <Ionicons name={tint.glyph} size={22} color={tint.icon} />
          </View>
          <View style={styles.cardHeadings}>
            <Text style={styles.orderNumber} numberOfLines={1}>
              {item.orderNumber}
            </Text>
            <Text style={styles.orderDate} numberOfLines={1}>
              Raised on {formatDate(item.createdAt)}
            </Text>
          </View>
          <StatusBadge status={item.verificationStatus} />
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

        {item.disputeReason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Dispute Reason</Text>
            <Text style={styles.reasonText} numberOfLines={2}>
              {item.disputeReason}
            </Text>
          </View>
        ) : null}

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel} numberOfLines={1}>
            Payment: {item.paymentMethod?.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.amountValue} numberOfLines={1}>
            ₹{item.totalAmount?.toFixed(2)}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <Button
            title="View & Resolve"
            icon="shield-checkmark-outline"
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={() => {
              setSelectedDispute(item);
              setDetailVisible(true);
            }}
          />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <AdminHeader
        title="Dispute Management"
        subtitle={`${disputes.length} dispute(s)`}
        onRefresh={fetchDisputes}
      />

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by order, buyer, farmer..."
      />

      <FilterChips
        options={[
          { label: 'All', value: 'all' },
          { label: 'Disputed', value: 'disputed' },
          { label: 'Resolved', value: 'resolved' },
        ]}
        selected={selectedFilter}
        onSelect={setSelectedFilter}
      />

      {error && !loading && filteredDisputes.length > 0 && (
        <ErrorState
          compact
          icon="alert-circle-outline"
          title="Something went wrong"
          message={friendlyError(error)}
          onRetry={fetchDisputes}
          style={styles.errorBanner}
        />
      )}

      {loading ? (
        <AdminListSkeleton count={4} />
      ) : error && filteredDisputes.length === 0 ? (
        <ErrorState
          title="Could not load disputes"
          message={friendlyError(error)}
          onRetry={fetchDisputes}
        />
      ) : filteredDisputes.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No disputes found"
          description={
            hasFilters
              ? 'No disputes match this search or filter. Try widening it.'
              : 'All orders are running smoothly. No disputes to resolve.'
          }
          actionLabel={hasFilters ? 'Clear filters' : undefined}
          onAction={hasFilters ? clearFilters : undefined}
        />
      ) : (
        <FlatList
          data={filteredDisputes}
          keyExtractor={(item) => item._id}
          renderItem={renderDisputeCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />
          }
        />
      )}

      {/* Detail Modal */}
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
                Dispute Details
              </Text>
              <TouchableOpacity
                onPress={() => setDetailVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close dispute details"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedDispute && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetBody}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order Number</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedDispute.orderNumber}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <StatusBadge status={selectedDispute.verificationStatus} />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Buyer</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedDispute.buyer?.name || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Farmer</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedDispute.farmer?.name || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      ₹{selectedDispute.totalAmount?.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Method</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedDispute.paymentMethod?.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Raised On</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedDispute.createdAt)}</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Dispute Reason</Text>
                <View style={styles.reasonBox}>
                  <Text style={styles.modalReasonText}>
                    {selectedDispute.disputeReason || 'No reason provided'}
                  </Text>
                </View>

                {selectedDispute.verificationStatus === 'disputed' && (
                  <>
                    <Text style={styles.sectionLabel}>Resolution Notes</Text>
                    <Input
                      placeholder="Enter resolution details..."
                      value={resolution}
                      onChangeText={setResolution}
                      multiline
                      containerStyle={styles.resolveInput}
                    />
                    <Button
                      title="Resolve Dispute"
                      icon="shield-checkmark-outline"
                      variant="primary"
                      size="lg"
                      loading={resolveLoading}
                      disabled={!resolution.trim() || resolveLoading}
                      onPress={() => setConfirmVisible(true)}
                    />
                  </>
                )}

                {selectedDispute.verificationStatus === 'resolved' && (
                  <View style={styles.resolvedBox}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                    <Text style={styles.resolvedText}>This dispute has been resolved.</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmVisible}
        title="Resolve Dispute"
        message="Are you sure you want to mark this dispute as resolved? This will update the order status to delivered."
        confirmLabel="Resolve"
        destructive={false}
        loading={resolveLoading}
        icon="shield-checkmark-outline"
        onConfirm={handleResolveDispute}
        onCancel={() => setConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}
