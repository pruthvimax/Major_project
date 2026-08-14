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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { AdminListSkeleton } from '../../components/admin/AdminSkeleton';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  friendlyError,
} from '../../components/ui';

interface User {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  address?: string;
  role: 'farmer' | 'buyer' | 'admin';
  isSuspended?: boolean;
  isVerified?: boolean;
  createdAt: string;
  walletAddress?: string;
}

export default function ManageUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [userStats, setUserStats] = useState<{ products: number; orders: number }>({ products: 0, orders: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'activate' | 'delete';
    user: User;
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
    avatarWell: {
      width: 46,
      height: 46,
      borderRadius: Layout.borderRadius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarWellText: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.primary,
    },
    cardHeadings: { flex: 1, minWidth: 0 },
    userName: {
      fontSize: Typography.fontSize.md,
      lineHeight: Typography.leading.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
    },
    userEmail: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.textSecondary,
      marginTop: 1,
    },
    userMeta: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.muted,
      marginTop: 2,
    },
    badgeStack: {
      alignItems: 'flex-end',
      gap: Layout.spacing.xs,
      flexShrink: 0,
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
    avatarCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: Layout.spacing.md,
    },
    avatarText: {
      fontSize: Typography.fontSize.xxl,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.primary,
    },
    userNameCenter: {
      fontSize: Typography.fontSize.lg,
      lineHeight: Typography.leading.lg,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
    },
    userEmailCenter: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 2,
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: Layout.spacing.sm,
      marginTop: Layout.spacing.md,
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
    statsRow: {
      flexDirection: 'row',
      gap: Layout.spacing.md,
      marginTop: Layout.spacing.md,
    },
    statTile: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      backgroundColor: colors.primaryTint,
      borderRadius: Layout.borderRadius.lg,
      paddingVertical: Layout.spacing.md,
    },
    statValue: {
      fontSize: Typography.fontSize.xl,
      lineHeight: Typography.leading.xl,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.primary,
    },
    statLabel: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actionButtonRow: {
      flexDirection: 'row',
      gap: Layout.spacing.sm,
      marginTop: Layout.spacing.xl,
    },
    actionBtn: { flex: 1, minWidth: 0 },
  }), [colors, insets.bottom]);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/users');
      if (response.data.success) {
        setUsers(response.data.users);
        setFilteredUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const next = users.filter((u) => {
      const matchesFilter =
        selectedFilter === 'all' ||
        (selectedFilter === 'farmer' && u.role === 'farmer') ||
        (selectedFilter === 'buyer' && u.role === 'buyer') ||
        (selectedFilter === 'suspended' && u.isSuspended) ||
        (selectedFilter === 'active' && !u.isSuspended);
      const matchesSearch =
        normalizedSearch === '' ||
        u.name.toLowerCase().includes(normalizedSearch) ||
        u.email.toLowerCase().includes(normalizedSearch) ||
        (u.mobile && u.mobile.includes(normalizedSearch)) ||
        u.role.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
    setFilteredUsers(next);
  }, [search, users, selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  const fetchUserStats = async (userId: string) => {
    try {
      setStatsLoading(true);
      const [productsRes, ordersRes] = await Promise.all([
        api.get(`/products?all=true&farmer=${userId}`),
        api.get('/orders'),
      ]);
      const orders = ordersRes.data.orders || [];
      const userOrders = orders.filter(
        (o: any) => o.buyer?._id === userId || o.farmer?._id === userId
      );
      setUserStats({
        products: productsRes.data.products?.length || 0,
        orders: userOrders.length,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setUserStats({ products: 0, orders: 0 });
    } finally {
      setStatsLoading(false);
    }
  };

  const openUserDetails = (user: User) => {
    setSelectedUser(user);
    setDetailVisible(true);
    fetchUserStats(user._id);
  };

  const handleSuspendToggle = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    try {
      setActionLoading(true);
      const suspended = type === 'suspend';
      const response = await api.put(`/users/${user._id}/suspend`, { suspended });
      if (response.data.success) {
        setDetailVisible(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      setError(error.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmAction) return;
    const { user } = confirmAction;
    try {
      setActionLoading(true);
      const response = await api.delete(`/users/${user._id}`);
      if (response.data.success) {
        setDetailVisible(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
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

  const renderUserCard = ({ item }: { item: User }) => (
    <Card style={styles.card} onPress={() => openUserDetails(item)}>
      <View style={styles.cardTop}>
        <View style={styles.avatarWell}>
          <Text style={styles.avatarWellText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.cardHeadings}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {item.email}
          </Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            Joined {formatDate(item.createdAt)}
          </Text>
        </View>

        <View style={styles.badgeStack}>
          <StatusBadge status={item.role} />
          {item.isSuspended ? <StatusBadge status="suspended" /> : null}
        </View>
      </View>

      {item.role !== 'admin' && (
        <View style={styles.cardActions}>
          <Button
            title={item.isSuspended ? 'Activate' : 'Suspend'}
            icon={item.isSuspended ? 'lock-open-outline' : 'ban-outline'}
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={() =>
              setConfirmAction({
                type: item.isSuspended ? 'activate' : 'suspend',
                user: item,
              })
            }
          />
          <Button
            title="Delete"
            icon="trash-outline"
            variant="danger"
            size="sm"
            fullWidth={false}
            onPress={() => setConfirmAction({ type: 'delete', user: item })}
          />
        </View>
      )}
    </Card>
  );

  const getConfirmDialogProps = () => {
    if (!confirmAction) return null;
    const { type, user } = confirmAction;
    switch (type) {
      case 'suspend':
        return {
          title: 'Suspend User',
          message: `Are you sure you want to suspend ${user.name}? They will not be able to access the app until reactivated.`,
          confirmLabel: 'Suspend',
          destructive: true,
          icon: 'ban-outline' as const,
        };
      case 'activate':
        return {
          title: 'Activate User',
          message: `Are you sure you want to reactivate ${user.name}'s account?`,
          confirmLabel: 'Activate',
          destructive: false,
          icon: 'lock-open-outline' as const,
        };
      case 'delete':
        return {
          title: 'Delete User',
          message: `Are you sure you want to permanently delete ${user.name}'s account? This action cannot be undone.`,
          confirmLabel: 'Delete',
          destructive: true,
          icon: 'trash-outline' as const,
        };
    }
  };

  const confirmProps = getConfirmDialogProps();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <AdminHeader
        title="User Management"
        subtitle={`${users.length} registered users`}
        onRefresh={fetchUsers}
      />

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, email, mobile..."
      />

      <FilterChips
        options={[
          { label: 'All', value: 'all' },
          { label: 'Farmers', value: 'farmer' },
          { label: 'Buyers', value: 'buyer' },
          { label: 'Active', value: 'active' },
          { label: 'Suspended', value: 'suspended' },
        ]}
        selected={selectedFilter}
        onSelect={setSelectedFilter}
      />

      {error && !loading && filteredUsers.length > 0 && (
        <ErrorState
          compact
          icon="alert-circle-outline"
          title="Something went wrong"
          message={friendlyError(error)}
          onRetry={fetchUsers}
          style={styles.errorBanner}
        />
      )}

      {loading ? (
        <AdminListSkeleton count={6} />
      ) : error && filteredUsers.length === 0 ? (
        <ErrorState
          title="Could not load users"
          message={friendlyError(error)}
          onRetry={fetchUsers}
        />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No users found"
          description={
            hasFilters
              ? 'No one matches this search or filter. Try widening it.'
              : 'No users registered yet'
          }
          actionLabel={hasFilters ? 'Clear filters' : undefined}
          onAction={hasFilters ? clearFilters : undefined}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />
          }
        />
      )}

      {/* User Detail Modal */}
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
                User Details
              </Text>
              <TouchableOpacity
                onPress={() => setDetailVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close user details"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetBody}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.userNameCenter} numberOfLines={2}>
                  {selectedUser.name}
                </Text>
                <Text style={styles.userEmailCenter} numberOfLines={1}>
                  {selectedUser.email}
                </Text>
                <View style={styles.badgeRow}>
                  <StatusBadge status={selectedUser.role} />
                  <StatusBadge
                    status={selectedUser.isSuspended ? 'suspended' : 'active'}
                  />
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mobile</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedUser.mobile || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue}>{selectedUser.address || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Registration Date</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedUser.createdAt)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Verified</Text>
                    <Text style={styles.detailValue}>
                      {selectedUser.isVerified ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  {selectedUser.walletAddress ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Wallet</Text>
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                        {selectedUser.walletAddress}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statTile}>
                    {statsLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.statValue}>{userStats.products}</Text>
                    )}
                    <Text style={styles.statLabel}>Products</Text>
                  </View>
                  <View style={styles.statTile}>
                    {statsLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.statValue}>{userStats.orders}</Text>
                    )}
                    <Text style={styles.statLabel}>Orders</Text>
                  </View>
                </View>

                {selectedUser.role !== 'admin' && (
                  <View style={styles.actionButtonRow}>
                    <Button
                      title={selectedUser.isSuspended ? 'Activate' : 'Suspend'}
                      icon={selectedUser.isSuspended ? 'lock-open-outline' : 'ban-outline'}
                      variant={selectedUser.isSuspended ? 'primary' : 'outline'}
                      size="md"
                      style={styles.actionBtn}
                      onPress={() =>
                        setConfirmAction({
                          type: selectedUser.isSuspended ? 'activate' : 'suspend',
                          user: selectedUser,
                        })
                      }
                    />
                    <Button
                      title="Delete"
                      icon="trash-outline"
                      variant="danger"
                      size="md"
                      style={styles.actionBtn}
                      onPress={() => setConfirmAction({ type: 'delete', user: selectedUser })}
                    />
                  </View>
                )}
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
          onConfirm={confirmAction?.type === 'delete' ? handleDeleteUser : handleSuspendToggle}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </SafeAreaView>
  );
}
