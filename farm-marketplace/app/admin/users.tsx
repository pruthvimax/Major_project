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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardInfo: { flex: 1 },
    userName: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
    },
    userEmail: { fontSize: Typography.fontSize.sm, color: colors.gray, marginTop: 2 },
    userMeta: { fontSize: Typography.fontSize.xs, color: colors.gray, marginTop: 2 },
    roleBadge: {
      paddingHorizontal: Layout.spacing.sm,
      paddingVertical: 2,
      borderRadius: Layout.borderRadius.xs,
      alignSelf: 'flex-start',
      marginTop: Layout.spacing.sm,
    },
    roleBadgeText: { fontSize: 10, fontWeight: '700' },
    actionButtons: { flexDirection: 'row', alignItems: 'center' },
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
    avatarCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: Layout.spacing.md,
    },
    avatarText: {
      fontSize: Typography.fontSize.xxl,
      fontWeight: '700',
      color: colors.primary,
    },
    userNameCenter: {
      fontSize: Typography.fontSize.lg,
      fontWeight: '700',
      color: colors.black,
      textAlign: 'center',
    },
    userEmailCenter: {
      fontSize: Typography.fontSize.sm,
      color: colors.gray,
      textAlign: 'center',
      marginTop: 2,
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Layout.spacing.sm,
      marginTop: Layout.spacing.sm,
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
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: Layout.spacing.md,
      backgroundColor: colors.lighterGray,
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.md,
    },
    statItem: { alignItems: 'center' },
    statValue: {
      fontSize: Typography.fontSize.lg,
      fontWeight: '700',
      color: colors.admin,
    },
    statLabel: { fontSize: Typography.fontSize.xs, color: colors.gray, marginTop: 2 },
    actionButtonRow: {
      flexDirection: 'row',
      gap: Layout.spacing.sm,
      marginTop: Layout.spacing.lg,
    },
    actionBtn: {
      flex: 1,
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

  const getRoleColors = (role: string) => {
    switch (role) {
      case 'farmer':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'buyer':
        return { bg: '#E3F2FD', text: '#1976D2' };
      default:
        return { bg: '#F3E5F5', text: '#7B1FA2' };
    }
  };

  const renderUserCard = ({ item }: { item: User }) => {
    const roleColors = getRoleColors(item.role);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openUserDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userMeta}>Joined {formatDate(item.createdAt)}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>
              {item.role.toUpperCase()}
              {item.isSuspended ? ' · SUSPENDED' : ''}
            </Text>
          </View>
        </View>

        {item.role !== 'admin' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { marginRight: 8 }]}
              onPress={() =>
                setConfirmAction({
                  type: item.isSuspended ? 'activate' : 'suspend',
                  user: item,
                })
              }
            >
              <Ionicons
                name={item.isSuspended ? 'lock-open-outline' : 'ban-outline'}
                size={20}
                color={item.isSuspended ? '#2E7D32' : '#F57C00'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setConfirmAction({ type: 'delete', user: item })}
            >
              <Ionicons name="trash-outline" size={20} color="#C62828" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
    <SafeAreaView style={styles.container}>
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

      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={20} color="#C62828" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <AdminListSkeleton count={6} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No users found"
          description={search ? 'Try a different search term' : 'No users registered yet'}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.gray} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.userNameCenter}>{selectedUser.name}</Text>
                <Text style={styles.userEmailCenter}>{selectedUser.email}</Text>
                <View style={styles.badgeRow}>
                  <StatusBadge status={selectedUser.role} />
                  <StatusBadge
                    status={selectedUser.isSuspended ? 'suspended' : 'active'}
                  />
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mobile</Text>
                    <Text style={styles.detailValue}>{selectedUser.mobile || 'N/A'}</Text>
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
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {selectedUser.walletAddress}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    {statsLoading ? (
                      <ActivityIndicator size="small" color={colors.admin} />
                    ) : (
                      <Text style={styles.statValue}>{userStats.products}</Text>
                    )}
                    <Text style={styles.statLabel}>Products</Text>
                  </View>
                  <View style={styles.statItem}>
                    {statsLoading ? (
                      <ActivityIndicator size="small" color={colors.admin} />
                    ) : (
                      <Text style={styles.statValue}>{userStats.orders}</Text>
                    )}
                    <Text style={styles.statLabel}>Orders</Text>
                  </View>
                </View>

                {selectedUser.role !== 'admin' && (
                  <View style={styles.actionButtonRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: selectedUser.isSuspended ? '#2E7D32' : '#F57C00',
                        },
                      ]}
                      onPress={() =>
                        setConfirmAction({
                          type: selectedUser.isSuspended ? 'activate' : 'suspend',
                          user: selectedUser,
                        })
                      }
                    >
                      <Text style={styles.actionBtnText}>
                        {selectedUser.isSuspended ? 'Activate' : 'Suspend'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#C62828' }]}
                      onPress={() => setConfirmAction({ type: 'delete', user: selectedUser })}
                    >
                      <Text style={styles.actionBtnText}>Delete</Text>
                    </TouchableOpacity>
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