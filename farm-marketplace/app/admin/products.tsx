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
  const insets = useSafeAreaInsets();
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
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    cardHeadings: { flex: 1, minWidth: 0 },
    productName: {
      fontSize: Typography.fontSize.md,
      lineHeight: Typography.leading.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
    },
    productCategory: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
      marginTop: 2,
      letterSpacing: 0.4,
    },
    metaList: { marginTop: Layout.spacing.md, gap: Layout.spacing.xs + 2 },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
    },
    metaText: {
      flex: 1,
      minWidth: 0,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.textSecondary,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginTop: Layout.spacing.md,
    },
    priceText: {
      fontSize: Typography.fontSize.xl,
      lineHeight: Typography.leading.xl,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.primary,
    },
    unitText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      fontWeight: Typography.fontWeight.medium,
      marginLeft: Layout.spacing.xs,
    },
    cardActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
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
      paddingTop: Layout.spacing.lg,
      paddingBottom: Layout.spacing.xl + insets.bottom,
    },
    productImagePlaceholder: {
      height: 132,
      borderRadius: Layout.borderRadius.lg,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Layout.spacing.md,
    },
    productNameCenter: {
      fontSize: Typography.fontSize.lg,
      lineHeight: Typography.leading.lg,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Layout.spacing.sm,
      marginTop: Layout.spacing.md,
      flexWrap: 'wrap',
    },
    detailSection: {
      marginTop: Layout.spacing.lg,
      backgroundColor: colors.surfaceAlt,
      borderRadius: Layout.borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Layout.spacing.md,
      paddingVertical: Layout.spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
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
      marginBottom: Layout.spacing.sm,
    },
    descriptionBox: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: Layout.borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Layout.spacing.md,
    },
    descriptionText: {
      fontSize: Typography.fontSize.sm,
      color: colors.text,
      lineHeight: Typography.leading.sm,
    },
    actionButtonRow: {
      flexDirection: 'row',
      gap: Layout.spacing.sm,
      marginTop: Layout.spacing.xl,
      flexWrap: 'wrap',
    },
    actionBtn: { flex: 1, minWidth: '45%' },
  }), [colors, insets.bottom]);

  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/products?all=true');
      if (response.data.success) {
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
      }
    } catch (error) {
      logApiError('Admin fetch products', error);
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
        (p.name || '').toLowerCase().includes(normalizedSearch) ||
        (p.category || '').toLowerCase().includes(normalizedSearch) ||
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
      logApiError('Admin moderate product', error);
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

  const hasFilters = search.trim() !== '' || selectedFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSelectedFilter('all');
  };

  const renderProductCard = ({ item }: { item: Product }) => {
    const status = getProductStatus(item);
    return (
      <Card
        style={styles.card}
        onPress={() => {
          setSelectedProduct(item);
          setDetailVisible(true);
        }}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconWell}>
            <Ionicons name="leaf-outline" size={22} color={colors.primary} />
          </View>

          <View style={styles.cardHeadings}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.productCategory} numberOfLines={1}>
              {(item.category || '').toUpperCase()}
            </Text>
          </View>

          <StatusBadge status={status} />
        </View>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText} numberOfLines={1}>
              Farmer: {item.farmer?.name || 'Unknown'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="cube-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText} numberOfLines={1}>
              Stock: {item.quantity} {item.unit}
            </Text>
          </View>
          {item.verificationStatus && (
            <View style={styles.metaRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.muted} />
              <Text style={styles.metaText} numberOfLines={1}>
                Verification: {item.verificationStatus.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>₹{item.price}</Text>
          <Text style={styles.unitText}>/ {item.unit}</Text>
        </View>

        <View style={styles.cardActions}>
          {status !== 'approved' && (
            <Button
              title="Approve"
              icon="checkmark-circle-outline"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={() => setConfirmAction({ type: 'approve', product: item })}
            />
          )}
          {status === 'blocked' ? (
            <Button
              title="Unblock"
              icon="lock-open-outline"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={() => setConfirmAction({ type: 'unblock', product: item })}
            />
          ) : (
            <Button
              title="Block"
              icon="ban-outline"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={() => setConfirmAction({ type: 'block', product: item })}
            />
          )}
          <Button
            title="Delete"
            icon="trash-outline"
            variant="danger"
            size="sm"
            fullWidth={false}
            onPress={() => setConfirmAction({ type: 'delete', product: item })}
          />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
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

      {error && !loading && filteredProducts.length > 0 && (
        <ErrorState
          compact
          icon="alert-circle-outline"
          title="Something went wrong"
          message={friendlyError(error)}
          onRetry={fetchProducts}
          style={styles.errorBanner}
        />
      )}

      {loading ? (
        <AdminListSkeleton count={5} />
      ) : error && filteredProducts.length === 0 ? (
        <ErrorState
          title="Could not load products"
          message={friendlyError(error)}
          onRetry={fetchProducts}
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No products found"
          description={
            hasFilters
              ? 'No listings match this search or filter. Try widening it.'
              : 'No products listed yet'
          }
          actionLabel={hasFilters ? 'Clear filters' : undefined}
          onAction={hasFilters ? clearFilters : undefined}
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
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                Product Details
              </Text>
              <TouchableOpacity
                onPress={() => setDetailVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close product details"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetBody}
              >
                <View style={styles.productImagePlaceholder}>
                  <Ionicons name="leaf-outline" size={48} color={colors.primary} />
                </View>
                <Text style={styles.productNameCenter} numberOfLines={2}>
                  {selectedProduct.name}
                </Text>
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
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {(selectedProduct.category || '').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Price</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      ₹{selectedProduct.price} / {selectedProduct.unit}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedProduct.quantity} {selectedProduct.unit}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Farmer</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedProduct.farmer?.name || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Farmer Email</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedProduct.farmer?.email || 'N/A'}
                    </Text>
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
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                        {selectedProduct.blockchainTxHash}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {selectedProduct.description ? (
                  <>
                    <Text style={styles.sectionLabel}>Description</Text>
                    <View style={styles.descriptionBox}>
                      <Text style={styles.descriptionText}>{selectedProduct.description}</Text>
                    </View>
                  </>
                ) : null}

                <View style={styles.actionButtonRow}>
                  {getProductStatus(selectedProduct) !== 'approved' && (
                    <Button
                      title="Approve"
                      icon="checkmark-circle-outline"
                      variant="primary"
                      size="md"
                      style={styles.actionBtn}
                      onPress={() =>
                        setConfirmAction({ type: 'approve', product: selectedProduct })
                      }
                    />
                  )}
                  {getProductStatus(selectedProduct) === 'blocked' ? (
                    <Button
                      title="Unblock"
                      icon="lock-open-outline"
                      variant="outline"
                      size="md"
                      style={styles.actionBtn}
                      onPress={() =>
                        setConfirmAction({ type: 'unblock', product: selectedProduct })
                      }
                    />
                  ) : (
                    <Button
                      title="Block"
                      icon="ban-outline"
                      variant="outline"
                      size="md"
                      style={styles.actionBtn}
                      onPress={() =>
                        setConfirmAction({ type: 'block', product: selectedProduct })
                      }
                    />
                  )}
                  <Button
                    title="Delete"
                    icon="trash-outline"
                    variant="danger"
                    size="md"
                    style={styles.actionBtn}
                    onPress={() =>
                      setConfirmAction({ type: 'delete', product: selectedProduct })
                    }
                  />
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
