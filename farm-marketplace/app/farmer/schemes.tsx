import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { gradients } from '../../constants/ThemeColors';
import { logApiError } from '../../services/apiError';
import { fetchSchemes, toggleSaveScheme } from '../../services/schemes';
import { SCHEME_CATEGORY_META, type Scheme, type SchemeCategory } from '../../types/scheme.types';
import SchemeCard from '../../components/schemes/SchemeCard';
import {
  ChipRow,
  EmptyState,
  ErrorState,
  ListSkeleton,
  ScreenHeader,
  SearchField,
  friendlyError,
} from '../../components/ui';

type CategoryFilter = 'all' | 'saved' | SchemeCategory;

/** Quick filters requested for the farmer view, plus "Saved" and the rest. */
const FILTER_OPTIONS: { label: string; value: CategoryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Saved', value: 'saved' },
  { label: 'PM-KISAN', value: 'PM-KISAN' },
  { label: 'Crop Insurance', value: 'Crop Insurance' },
  { label: 'Subsidies', value: 'Subsidies' },
  { label: 'State Schemes', value: 'State Government Schemes' },
  { label: SCHEME_CATEGORY_META['Equipment Assistance'].short, value: 'Equipment Assistance' },
  { label: SCHEME_CATEGORY_META['Irrigation Support'].short, value: 'Irrigation Support' },
  { label: SCHEME_CATEGORY_META['Organic Farming Support'].short, value: 'Organic Farming Support' },
  { label: 'Other', value: 'Other' },
];

export default function FarmerSchemesScreen() {
  const colors = useColors();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const firstLoad = useRef(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        hero: {
          marginHorizontal: Layout.spacing.lg,
          marginTop: Layout.spacing.md,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.md,
          overflow: 'hidden',
        },
        heroIcon: {
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: 'rgba(255,255,255,0.22)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        heroTitle: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.white,
        },
        heroSub: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: 'rgba(255,255,255,0.88)',
          marginTop: 2,
        },
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
        countText: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          paddingHorizontal: Layout.spacing.lg,
          paddingBottom: Layout.spacing.sm,
        },
        skeleton: { paddingHorizontal: Layout.spacing.lg, paddingTop: Layout.spacing.sm },
      }),
    [colors]
  );

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      try {
        if (!opts.silent) setLoading(true);
        setError(null);
        const data = await fetchSchemes({
          search,
          category: filter === 'all' || filter === 'saved' ? 'all' : filter,
          saved: filter === 'saved',
        });
        setSchemes(data);
      } catch (err) {
        logApiError('Farmer fetch schemes', err);
        setError(friendlyError(err, 'We could not load government schemes right now.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, filter]
  );

  // Debounce search typing; filter changes reload immediately.
  useEffect(() => {
    const delay = firstLoad.current ? 0 : 350;
    firstLoad.current = false;
    const t = setTimeout(() => load(), delay);
    return () => clearTimeout(t);
  }, [load]);

  // Keep saved state fresh when returning from the details screen. Uses a
  // ref so the focus effect never re-fires just because `load` changed.
  const loadRef = useRef(load);
  loadRef.current = load;
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      loadRef.current({ silent: true });
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load({ silent: true });
  }, [load]);

  const handleToggleSave = async (scheme: Scheme) => {
    if (savingId) return;
    setSavingId(scheme._id);
    // Optimistic update so the bookmark responds instantly.
    setSchemes((prev) =>
      prev.map((s) =>
        s._id === scheme._id
          ? { ...s, isSaved: !s.isSaved, savedCount: s.savedCount + (s.isSaved ? -1 : 1) }
          : s
      )
    );
    try {
      const { isSaved } = await toggleSaveScheme(scheme._id);
      if (filter === 'saved' && !isSaved) {
        setSchemes((prev) => prev.filter((s) => s._id !== scheme._id));
      }
    } catch (err) {
      logApiError('Farmer toggle save scheme', err);
      setSchemes((prev) =>
        prev.map((s) => (s._id === scheme._id ? { ...s, isSaved: scheme.isSaved, savedCount: scheme.savedCount } : s))
      );
    } finally {
      setSavingId(null);
    }
  };

  const hasFilters = search.trim() !== '' || filter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setFilter('all');
  };

  const listHeader = (
    <Text style={styles.countText}>
      {schemes.length} scheme{schemes.length !== 1 ? 's' : ''}
      {filter === 'saved' ? ' saved' : ' available'}
    </Text>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScreenHeader
        title="Government Schemes"
        subtitle="Subsidies, insurance & benefits"
        align="left"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/farmer'))}
        iconActions={[
          {
            icon: 'chatbubbles-outline',
            onPress: () => router.push('/farmer/scheme-queries' as any),
            accessibilityLabel: 'My questions',
          },
        ]}
      />

      <LinearGradient colors={gradients.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="ribbon" size={24} color={colors.white} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            Benefits for every farmer
          </Text>
          <Text style={styles.heroSub} numberOfLines={2}>
            Verified schemes published by the marketplace team. Save the ones you like and ask questions.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.toolbar}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search schemes, benefits…" />
      </View>

      <ChipRow
        options={FILTER_OPTIONS}
        selected={filter}
        onSelect={(value) => setFilter(value as CategoryFilter)}
        style={styles.chips}
      />

      {loading ? (
        <View style={styles.skeleton}>
          <ListSkeleton count={4} />
        </View>
      ) : error ? (
        <ErrorState title="Could not load schemes" message={error} onRetry={() => load()} />
      ) : schemes.length === 0 ? (
        <EmptyState
          icon={filter === 'saved' ? 'bookmark-outline' : 'ribbon-outline'}
          title={filter === 'saved' ? 'No saved schemes yet' : 'No schemes found'}
          description={
            filter === 'saved'
              ? 'Tap the bookmark on any scheme to keep it here for quick access.'
              : hasFilters
              ? 'No schemes match this search or category. Try widening it.'
              : 'New government schemes will appear here as soon as they are published.'
          }
          actionLabel={hasFilters ? 'Clear filters' : undefined}
          onAction={hasFilters ? clearFilters : undefined}
        />
      ) : (
        <FlatList
          data={schemes}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <SchemeCard
              scheme={item}
              onPress={() => router.push({ pathname: '/farmer/scheme-details' as any, params: { id: item._id } })}
              onToggleSave={() => handleToggleSave(item)}
              saving={savingId === item._id}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
}
