import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import { logApiError } from '../../services/apiError';
import { fetchMySchemeQueries } from '../../services/schemes';
import type { SchemeQuery, SchemeQueryStatus } from '../../types/scheme.types';
import QueryCard from '../../components/schemes/QueryCard';
import {
  Button,
  ChipRow,
  EmptyState,
  ErrorState,
  ListSkeleton,
  ScreenHeader,
  SearchField,
  friendlyError,
} from '../../components/ui';

type StatusFilter = 'all' | SchemeQueryStatus;

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Answered', value: 'answered' },
  { label: 'Resolved', value: 'resolved' },
];

export default function FarmerSchemeQueriesScreen() {
  const colors = useColors();
  const [queries, setQueries] = useState<SchemeQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        toolbar: {
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.md,
          paddingBottom: Layout.spacing.sm,
        },
        chips: { paddingBottom: Layout.spacing.sm },
        list: {
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.sm,
          paddingBottom: Layout.spacing.xxl,
        },
        skeleton: { paddingHorizontal: Layout.spacing.lg, paddingTop: Layout.spacing.sm },
        cardFooter: { marginTop: Layout.spacing.md, alignItems: 'flex-end' },
      }),
    [colors]
  );

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      setQueries(await fetchMySchemeQueries());
    } catch (err) {
      logApiError('Farmer fetch scheme queries', err);
      setError(friendlyError(err, 'We could not load your questions right now.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return queries.filter((q) => {
      const matchesStatus = filter === 'all' || q.status === filter;
      const matchesSearch =
        term === '' ||
        q.question.toLowerCase().includes(term) ||
        (q.adminResponse || '').toLowerCase().includes(term) ||
        (q.scheme?.name || '').toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [queries, search, filter]);

  const hasFilters = search.trim() !== '' || filter !== 'all';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScreenHeader
        title="My Questions"
        subtitle={`${queries.length} question${queries.length !== 1 ? 's' : ''} asked`}
        align="left"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/farmer/schemes' as any))}
        iconActions={[{ icon: 'refresh-outline', onPress: () => load(), accessibilityLabel: 'Refresh' }]}
      />

      <View style={styles.toolbar}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search your questions…" />
      </View>

      <ChipRow options={FILTERS} selected={filter} onSelect={(v) => setFilter(v as StatusFilter)} style={styles.chips} />

      {loading ? (
        <View style={styles.skeleton}>
          <ListSkeleton count={3} />
        </View>
      ) : error ? (
        <ErrorState title="Could not load questions" message={error} onRetry={() => load()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title={hasFilters ? 'No matching questions' : 'No questions yet'}
          description={
            hasFilters
              ? 'Try a different status or search term.'
              : 'Open any government scheme and tap "Send Question" to ask our team about eligibility, documents or how to apply.'
          }
          actionLabel={hasFilters ? 'Clear filters' : 'Browse schemes'}
          onAction={
            hasFilters
              ? () => {
                  setSearch('');
                  setFilter('all');
                }
              : () => router.replace('/farmer/schemes' as any)
          }
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <QueryCard
              query={item}
              footer={
                item.scheme ? (
                  <View style={styles.cardFooter}>
                    <Button
                      title="Open scheme"
                      icon="ribbon-outline"
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      onPress={() =>
                        router.push({ pathname: '/farmer/scheme-details' as any, params: { id: item.scheme!._id } })
                      }
                    />
                  </View>
                ) : undefined
              }
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        />
      )}
    </SafeAreaView>
  );
}
