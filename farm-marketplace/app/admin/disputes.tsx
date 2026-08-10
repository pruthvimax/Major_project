import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
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
    reasonBox: {
      backgroundColor: '#FFEBEE',
      borderRadius: Layout.borderRadius.sm,
      padding: Layout.spacing.sm,
      marginBottom: Layout.spacing.md,
    },
    reasonText: { fontSize: Typography.fontSize.xs, color: '#C62828', lineHeight: 16 },
    reasonLabel: { fontWeight: '700', marginBottom: 2 },
    amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: Layout.spacing.sm,
    },
    amountLabel: { fontSize: Typography.fontSize.xs, color: colors.gray },
    amountValue: { fontSize: Typography.fontSize.md, fontWeight: '700', color: colors.admin },
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
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 4,
    },
    detailLabel: { fontSize: Typography.fontSize.xs, color: colors.gray },
    detailValue: { fontSize: Typography.fontSize.sm, color: colors.black, fontWeight: '600', flex: 1, textAlign: 'right' },
    sectionLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: '700',
      color: colors.black,
      marginTop: Layout.spacing.md,
      marginBottom: Layout.spacing.xs,
    },
    input: {
      backgroundColor: colors.lighterGray,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Layout.borderRadius.sm,
      minHeight: 80,
      padding: Layout.spacing.md,
      fontSize: Typography.fontSize.sm,
      color: colors.black,
      textAlignVertical: 'top',
    },
    resolveButton: {
      backgroundColor: colors.primary,
      borderRadius: Layout.borderRadius.md,
      paddingVertical: Layout.spacing.md,
      alignItems: 'center',
      marginTop: Layout.spacing.md,
    },
    resolveButtonText: { color: colors.white, fontWeight: '700', fontSize: Typography.fontSize.md },
    resolveButtonDisabled: { opacity: 0.5 },
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
      console.error('Error fetching disputes:', error);
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
        d.orderNumber.toLowerCase().includes(normalizedSearch) ||
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
      console.error('Error resolving dispute:', error);
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

  const renderDisputeCard = ({ item }: { item: Dispute }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.orderDate}>Raised on {formatDate(item.createdAt)}</Text>
        </View>
        <StatusBadge status={item.verificationStatus} />
      </View>

      <View style={styles.partyRow}>
        <Text style={styles.partyText}>
          Buyer: <Text style={styles.partyName}>{item.buyer?.name || 'Unknown'}</Text>
        </Text>
        <Text style={styles.partyText}>
          Farmer: <Text style={styles.partyName}>{item.farmer?.name || 'Unknown'}</Text>
        </Text>
      </View>

      {item.disputeReason ? (
        <View style={styles.reasonBox}>
          <Text style={[styles.reasonText, styles.reasonLabel]}>Dispute Reason:</Text>
          <Text style={styles.reasonText} numberOfLines={2}>{item.disputeReason}</Text>
        </View>
      ) : null}

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>
          Payment: {item.paymentMethod?.replace('_', ' ').toUpperCase()}
        </Text>
        <Text style={styles.amountValue}>₹{item.totalAmount?.toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => {
          setSelectedDispute(item);
          setDetailVisible(true);
        }}
      >
        <Text style={styles.viewButtonText}>View & Resolve</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
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

      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={20} color="#C62828" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <AdminListSkeleton count={4} />
      ) : filteredDisputes.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No disputes found"
          description={search ? 'Try a different search term' : 'All orders are running smoothly. No disputes to resolve.'}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispute Details</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.gray} />
              </TouchableOpacity>
            </View>

            {selectedDispute && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order Number</Text>
                  <Text style={styles.detailValue}>{selectedDispute.orderNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <StatusBadge status={selectedDispute.verificationStatus} />
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Buyer</Text>
                  <Text style={styles.detailValue}>{selectedDispute.buyer?.name || 'Unknown'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Farmer</Text>
                  <Text style={styles.detailValue}>{selectedDispute.farmer?.name || 'Unknown'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>₹{selectedDispute.totalAmount?.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>
                    {selectedDispute.paymentMethod?.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Raised On</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedDispute.createdAt)}</Text>
                </View>

                <Text style={styles.sectionLabel}>Dispute Reason</Text>
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonText}>
                    {selectedDispute.disputeReason || 'No reason provided'}
                  </Text>
                </View>

                {selectedDispute.verificationStatus === 'disputed' && (
                  <>
                    <Text style={styles.sectionLabel}>Resolution Notes</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter resolution details..."
                      placeholderTextColor={colors.gray}
                      value={resolution}
                      onChangeText={setResolution}
                      multiline
                    />
                    <TouchableOpacity
                      style={[
                        styles.resolveButton,
                        (!resolution.trim() || resolveLoading) && styles.resolveButtonDisabled,
                      ]}
                      onPress={() => setConfirmVisible(true)}
                      disabled={!resolution.trim() || resolveLoading}
                    >
                      {resolveLoading ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text style={styles.resolveButtonText}>Resolve Dispute</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {selectedDispute.verificationStatus === 'resolved' && (
                  <View style={[styles.reasonBox, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.reasonText, { color: '#2E7D32' }]}>
                      This dispute has been resolved.
                    </Text>
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