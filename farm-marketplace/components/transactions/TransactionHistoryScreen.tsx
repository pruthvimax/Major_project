import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import Typography from '../../constants/Typography';
import { logApiError } from '../../services/apiError';
import { fetchTransactionHistory } from '../../services/transactions';
import {
  ScreenHeader,
  SearchField,
  ChipRow,
  EmptyState,
  ErrorState,
  friendlyError,
  ListSkeleton,
} from '../ui';
import TransactionCard from './TransactionCard';
import TransactionDetailModal from './TransactionDetailModal';
import {
  TRANSACTION_FILTERS,
  type TransactionRecord,
  type TransactionTypeFilter,
} from '../../types/transaction.types';

type Role = 'farmer' | 'buyer' | 'admin';

interface TransactionHistoryScreenProps {
  role: Role;
  /** Where the header back arrow returns to (the role's dashboard). */
  backRoute: '/farmer' | '/buyer' | '/admin';
}

const SUBTITLES: Record<Role, string> = {
  farmer: 'On-chain records for your products and sales',
  buyer: 'On-chain records for your orders and escrow payments',
  admin: 'All on-chain records across the marketplace',
};

export default function TransactionHistoryScreen({ role, backRoute }: TransactionHistoryScreenProps) {
  const colors = useColors();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TransactionTypeFilter>('all');
  const [selected, setSelected] = useState<TransactionRecord | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        toolbar: {
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.sm,
          gap: Layout.spacing.sm,
        },
        chips: {
          marginHorizontal: -Layout.spacing.lg,
        },
        summary: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs,
          paddingHorizontal: Layout.spacing.lg,
          paddingVertical: Layout.spacing.sm,
        },
        summaryText: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
        },
        summaryStrong: {
          color: colors.text,
          fontWeight: Typography.fontWeight.bold,
        },
        listContainer: {
          paddingHorizontal: Layout.spacing.lg,
          paddingBottom: Layout.spacing.xxl,
        },
        skeletonWrap: {
          padding: Layout.spacing.lg,
        },
      }),
    [colors]
  );

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchTransactionHistory();
      setTransactions(data);
      setLoadError(null);
    } catch (error) {
      logApiError('Load transaction history', error);
      setLoadError(error);
    } finally {
      if (mode === 'initial') setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  const handleRefresh = () => load('refresh');

  // Filtering happens locally so the search box and chips respond instantly;
  // the backend has already scoped the list to what this role may see.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filter !== 'all' && tx.type !== filter) return false;
      if (!q) return true;
      return (
        tx.txHash.toLowerCase().includes(q) ||
        tx.orderNumber.toLowerCase().includes(q) ||
        tx.buyerName.toLowerCase().includes(q) ||
        tx.farmerName.toLowerCase().includes(q) ||
        tx.productName.toLowerCase().includes(q)
      );
    });
  }, [transactions, search, filter]);

  const isFiltered = filter !== 'all' || search.trim().length > 0;

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.skeletonWrap}>
          <ListSkeleton count={4} />
        </View>
      );
    }

    if (loadError && transactions.length === 0) {
      return (
        <ErrorState
          title="Could not load transactions"
          message={friendlyError(loadError, 'We could not load your blockchain transactions. Please try again.')}
          onRetry={() => load('initial')}
        />
      );
    }

    if (transactions.length === 0) {
      return (
        <EmptyState
          icon="link-outline"
          title="No Blockchain Transactions Yet"
          description={
            role === 'farmer'
              ? 'Register a product or receive a blockchain-paid order and its on-chain record will appear here.'
              : role === 'buyer'
                ? 'Pay for an order with Blockchain Escrow and the transaction will appear here.'
                : 'On-chain product registrations, escrows, releases and refunds will appear here.'
          }
          actionLabel="Refresh"
          onAction={() => load('initial')}
        />
      );
    }

    if (visible.length === 0) {
      return (
        <EmptyState
          icon="search-outline"
          title="No Matching Transactions"
          description="Try a different filter, or search by transaction hash, order number, buyer or farmer."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setFilter('all');
          }}
          compact
        />
      );
    }

    return (
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionCard transaction={item} onPress={setSelected} />}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Transaction History"
        subtitle={SUBTITLES[role]}
        onBack={() => router.replace(backRoute)}
        iconActions={[
          {
            icon: 'refresh',
            onPress: handleRefresh,
            accessibilityLabel: 'Refresh transactions',
          },
        ]}
      />

      <View style={styles.toolbar}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search hash, order no., buyer or farmer"
        />
        <ChipRow
          style={styles.chips}
          options={TRANSACTION_FILTERS}
          selected={filter}
          onSelect={(value) => setFilter(value as TransactionTypeFilter)}
        />
      </View>

      {!loading && transactions.length > 0 && (
        <View style={styles.summary}>
          <Ionicons name="cube-outline" size={14} color={colors.primary} />
          <Text style={styles.summaryText}>
            <Text style={styles.summaryStrong}>{visible.length}</Text>
            {isFiltered ? ` of ${transactions.length}` : ''} transaction{transactions.length === 1 ? '' : 's'}
            {role === 'admin' ? ' · all users' : ''}
          </Text>
        </View>
      )}

      {renderContent()}

      <TransactionDetailModal transaction={selected} onClose={() => setSelected(null)} />
    </View>
  );
}
