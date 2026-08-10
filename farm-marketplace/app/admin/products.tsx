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

interface Product {
  _id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  isApproved?: boolean;
  isBlocked?: boolean;
  isAvailable?: boolean;
  isOrganic?: boolean;
  verificationStatus?: string;
  blockchainTxHash?: string;
  blockchainId?: number | null;
  createdAt: string;
  farmer?: {
    _id: string;
    name: string;
    email: string;
  };
}

export default function ManageProductsScreen() {
  const colors = useColors();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'block' | 'unblock' | 'delete';
    product: Product;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
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
      marginBottom: Layout.spacing.sm,
    },
    productName: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
      flex: 1,
      marginRight: Layout.spacing.sm,
    },
    productDetail: {
      fontSize: Typography.fontSize.xs,
      color: colors.gray,
      marginVertical: 1,
    },
    priceText: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
      marginTop: 6,
    },
    unitText: {
      fontSize: Typography.fontSize.xs,
      color: colors.gray,
      fontWeight: 'normal',
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: Layout.spacing.sm,
      marginTop: Layout.spacing.sm,
    },
    actionButton: { padding: Layout.spacing.sm },
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
    productImagePlaceholder: {
      height: 120,
      borderRadius: Layout.borderRadius.md,
      backgroundColor: colors.primary + '10',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Layout.spacing.md,
    },
    productNameCenter: {
      fontSize: Typography.fontSize.lg,
      fontWeight: '700',
      color: colors.black,
      textAlign: 'center',
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Layout.spacing.sm,
      marginTop: Layout.spacing.sm,
      flexWrap: 'wrap',
    },
    detailSection: {
      marginTop: Layout.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: Layout.spacing.md,
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
    descriptionBox: {
      backgroundColor: colors.lighterGray,
      borderRadius: Layout.borderRadius.sm,
      padding: Layout.spacing.md,
      marginTop: Layout.spacing.sm,
    },
    descriptionText: {
      fontSize: Typography.fontSize.sm,
      color: colors.black,
      lineHeight: 20,
    },
    actionButtonRow: {
      flexDirection: 'row',
      gap: Layout.spacing.sm,
      marginTop: Layout.spacing.lg,
      flexWrap: 'wrap',
    },
    actionBtn: {
      flex: 1,
      minWidth: '45%',
      paddingVertical: Layout.spacing.md,
      borderRadius: Layout.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnText: { color: colors.white, fontWeight: '700', fontSize: Typography.fontSize.sm },
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

  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/products?all=true');
      if (response.data.success) {
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const next = products.filter((p) => {
      const matchesFilter =
        selectedFilter === 'all' ||
        (selectedFilter === 'approved' && p.isApproved && !p.isBlocked) ||
        (selectedFilter === 'pending' && p.isApproved === false && !p.isBlocked) ||
        (selectedFilter === 'blocked' && p.isBlocked) ||
        (selectedFilter === 'verified' && p.verificationStatus === 'verified') ||
        (selectedFilter === 'unverified' && p.verificationStatus === 'unverified') ||
        (selectedFilter === 'rejected' && p.verificationStatus === 'rejected');
      const matchesSearch =
        normalizedSearch === '' ||
        p.name.toLowerCase().includes(normalizedSearch) ||
        p.category.toLowerCase().includes(normalizedSearch) ||
        (p.farmer?.name && p.farmer.name.toLowerCase().includes(normalizedSearch)) ||
        (p.farmer?.email && p.farmer.email.toLowerCase().includes(normalizedSearch));
      return matchesFilter && matchesSearch;
    });
    setFilteredProducts(next);
  }, [search, products, selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const handleModerate = async () => {
    if (!confirmAction) return;
    const { type, product } = confirmAction;
    try {
      setActionLoading(true);
      let response;
      if (type === 'approve') {
        response = await api.put(`/products/${product._id}/approve`);
      } else if (type === 'block' || type === 'unblock') {
        response = await api.put(`/products/${product._id}/block`);
      } else if (type === 'reject') {
        response = await api.put(`/products/${product._id}/block`);
      } else if (type === 'delete') {
        response = await api.delete(`/products/${product._id}`);
      }
      if (response?.data.success) {
        setDetailVisible(false);
        setSelectedProduct(null);
        fetchProducts();
      }
    } catch (error: any) {
      console.error('Error moderating product:', error);
      setError(error.response?.data?.message || 'Failed to update product');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const getProductStatus = (p: Product) => {
    if (p.isBlocked) return 'blocked';
    if (p.isApproved === false) return 'pending';
    return 'approved';
  };

  const getConfirmDialogProps = () => {
    if (!confirmAction) return null;
    const { type, product } = confirmAction;
    switch (type) {
      case 'approve':
        return {
          title: 'Approve Product',
          message: `Approve "${product.name}" for listing on the marketplace?`,
          confirmLabel: 'Approve',
          destructive: false,
          icon: 'checkmark-circle-outline' as const,
        };
      case 'reject':
        return {
          title: 'Reject Product',
          message: `Reject "${product.name}"? It will be removed from the marketplace.`,
          confirmLabel: 'Reject',
          destructive: true,
          icon: 'close-circle-outline' as const,
        };
      case 'block':
        return {
          title: 'Block Product',
          message: `Block "${product.name}"? It will be hidden from all buyers.`,
          confirmLabel: 'Block',
          destructive: true,
          icon: 'ban-outline' as const,
        };
      case 'unblock':
        return {
          title: 'Unblock Product',
          message: `Unblock "${product.name}"? It will become visible to buyers again.`,
          confirmLabel: 'Unblock',
          destructive: false,
          icon: 'lock-open-outline' as const,
        };
      case 'delete':
        return {
          title: 'Delete Product',
          message: `Permanently delete "${product.name}"? This action cannot be undone.`,
          confirmLabel: 'Delete',
          destructive: true,
          icon: 'trash-outline' as const,
        };
    }
  };

  const confirmProps = getConfirmDialogProps();

  const renderProductCard = ({ item }: { item: Product }) => {
    const status = getProductStatus(item);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedProduct(item);
          setDetailVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <StatusBadge status={status} />
        </View>
        <Text style={styles.productDetail}>Category: {item.category.toUpperCase()}</Text>
        <Text style={styles.productDetail}>
          Farmer: {item.farmer?.name || 'Unknown'}
        </Text>
        <Text style={styles.productDetail}>
          Stock: {item.quantity} {item.unit}
        </Text>
        <Text style={styles.priceText}>
          ₹{item.price} <Text style={styles.unitText}>/ {item.unit}</Text>
        </Text>
        {item.verificationStatus && (
          <Text style={styles.productDetail}>
            Verification: {item.verificationStatus.toUpperCase()}
          </Text>
        )}

        <View style={styles.actionRow}>
          {status !== 'approved' && (
            <TouchableOpacity
              style={[styles.actionButton, { marginRight: 6 }]}
              onPress={() => setConfirmAction({ type: 'approve', product: item })}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#2E7D32" />
            </TouchableOpacity>
          )}
          {status === 'blocked' ? (
            <TouchableOpacity
              style={[styles.actionButton, { marginRight: 6 }]}
              onPress={() => setConfirmAction({ type: 'unblock', product: item })}
            >
              <Ionicons name="lock-open-outline" size={20} color="#2E7D32" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { marginRight: 6 }]}
              onPress={() => setConfirmAction({ type: 'block', product: item })}
            >
              <Ionicons name="ban-outline" size={20} color="#F57C00" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setConfirmAction({ type: 'delete', product: item })}
          >
            <Ionicons name="trash-outline" size={20} color="#C62828" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader
        title="Product Management"
        subtitle={`${products.length} products`}
        onRefresh={fetchProducts}
      />

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, category, farmer..."
      />

      <FilterChips
        options={[
          { label: 'All', value: 'all' },
          { label: 'Approved', value: 'approved' },
          { label: 'Pending', value: 'pending' },
          { label: 'Blocked', value: 'blocked' },
          { label: 'Verified', value: 'verified' },
          { label: 'Unverified', value: 'unverified' },
          { label: 'Rejected', value: 'rejected' },
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
        <AdminListSkeleton count={5} />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No products found"
          description={search ? 'Try a different search term' : 'No products listed yet'}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          renderItem={renderProductCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />
          }
        />
      )}

      {/* Product Detail Modal */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Product Details</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.gray} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.productImagePlaceholder}>
                  <Ionicons name="leaf-outline" size={48} color={colors.primary} />
                </View>
                <Text style={styles.productNameCenter}>{selectedProduct.name}</Text>
                <View style={styles.badgeRow}>
                  <StatusBadge status={getProductStatus(selectedProduct)} />
                  {selectedProduct.verificationStatus && (
                    <StatusBadge status={selectedProduct.verificationStatus} />
                  )}
                  {selectedProduct.isOrganic && (
                    <StatusBadge status="organic" label="Organic" />
                  )}
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>{selectedProduct.category.toUpperCase()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Price</Text>
                    <Text style={styles.detailValue}>
                      ₹{selectedProduct.price} / {selectedProduct.unit}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity</Text>
                    <Text style={styles.detailValue}>
                      {selectedProduct.quantity} {selectedProduct.unit}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Farmer</Text>
                    <Text style={styles.detailValue}>{selectedProduct.farmer?.name || 'Unknown'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Farmer Email</Text>
                    <Text style={styles.detailValue}>{selectedProduct.farmer?.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Listed On</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedProduct.createdAt)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Available</Text>
                    <Text style={styles.detailValue}>
                      {selectedProduct.isAvailable ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  {selectedProduct.blockchainId !== null && selectedProduct.blockchainId !== undefined && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Blockchain ID</Text>
                      <Text style={styles.detailValue}>#{selectedProduct.blockchainId}</Text>
                    </View>
                  )}
                  {selectedProduct.blockchainTxHash ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tx Hash</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {selectedProduct.blockchainTxHash}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {selectedProduct.description ? (
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText}>{selectedProduct.description}</Text>
                  </View>
                ) : null}

                <View style={styles.actionButtonRow}>
                  {getProductStatus(selectedProduct) !== 'approved' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#2E7D32' }]}
                      onPress={() =>
                        setConfirmAction({ type: 'approve', product: selectedProduct })
                      }
                    >
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {getProductStatus(selectedProduct) === 'blocked' ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#2E7D32' }]}
                      onPress={() =>
                        setConfirmAction({ type: 'unblock', product: selectedProduct })
                      }
                    >
                      <Text style={styles.actionBtnText}>Unblock</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#F57C00' }]}
                      onPress={() =>
                        setConfirmAction({ type: 'block', product: selectedProduct })
                      }
                    >
                      <Text style={styles.actionBtnText}>Block</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#C62828' }]}
                    onPress={() =>
                      setConfirmAction({ type: 'delete', product: selectedProduct })
                    }
                  >
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {confirmProps && (
        <ConfirmDialog
          visible={!!confirmAction}
          title={confirmProps.title}
          message={confirmProps.message}
          confirmLabel={confirmProps.confirmLabel}
          destructive={confirmProps.destructive}
          loading={actionLoading}
          icon={confirmProps.icon}
          onConfirm={handleModerate}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </SafeAreaView>
  );
}