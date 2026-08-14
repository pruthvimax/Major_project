import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusBadge from '../../components/admin/StatusBadge';
import {
  Card,
  StatCard,
  SectionHeader,
  EmptyState,
  ErrorState,
  ListSkeleton,
  StatRowSkeleton,
} from '../../components/ui';

export default function AdminAnalyticsScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: {
          padding: Layout.spacing.lg,
          paddingBottom: Layout.spacing.xxl,
        },
        section: { marginBottom: Layout.spacing.xl },
        statsBlock: { gap: Layout.spacing.md },
        statsRow: { flexDirection: 'row', gap: Layout.spacing.md },
        statSpacer: { flex: 1 },
        listCard: { gap: Layout.spacing.md },
        listRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.md,
        },
        divider: {
          height: 1,
          backgroundColor: colors.border,
        },
        rankChip: {
          width: 30,
          height: 30,
          borderRadius: Layout.borderRadius.sm,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rankText: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.bold,
          color: colors.primary,
        },
        name: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
          flexShrink: 1,
        },
        value: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.primary,
          flexShrink: 0,
        },
        sub: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          marginTop: 2,
        },
        monthCard: { marginBottom: Layout.spacing.md },
        monthHeadRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: Layout.spacing.md,
        },
        monthLabel: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.textSecondary,
        },
        monthValue: {
          fontSize: Typography.fontSize.xxl,
          lineHeight: Typography.leading.xxl,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.text,
          flexShrink: 1,
        },
        barTrack: {
          height: 10,
          backgroundColor: colors.lighterGray,
          borderRadius: Layout.borderRadius.full,
          marginTop: Layout.spacing.md,
          overflow: 'hidden',
          width: '100%',
        },
        barFill: {
          height: 10,
          borderRadius: Layout.borderRadius.full,
          backgroundColor: colors.primary,
        },
        categoryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
        },
        categoryDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
        },
        categoryName: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
          flex: 1,
          flexShrink: 1,
        },
        categoryValue: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.textSecondary,
          flexShrink: 0,
        },
        categoryBar: {
          height: 6,
          backgroundColor: colors.lighterGray,
          borderRadius: Layout.borderRadius.full,
          marginTop: Layout.spacing.sm,
          overflow: 'hidden',
          width: '100%',
        },
        categoryBarFill: {
          height: 6,
          borderRadius: Layout.borderRadius.full,
        },
        activityHead: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
        },
        skeletonWrap: {
          padding: Layout.spacing.lg,
          gap: Layout.spacing.md,
        },
      }),
    [colors]
  );

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/admin/analytics');
      if (res.data.success) setAnalytics(res.data.analytics);
    } catch (e) {
      console.error('Error fetching analytics:', e);
      setError('Failed to load analytics data. Showing placeholder data.');
      setAnalytics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxRevenue = Math.max(
    ...(analytics?.monthlyRevenue?.map((m: any) => m.revenue) || [1]),
    1
  );

  /** On-brand accents used to tell the category bars apart. */
  const colorsArray = useMemo(
    () => [
      colors.primary,
      colors.secondary,
      colors.info,
      colors.accent,
      colors.error,
      colors.primaryDark,
      colors.admin,
      colors.warning,
    ],
    [colors]
  );

  // Compute category distribution from products
  const productCategories = useMemo(() => {
    const catCount: Record<string, number> = {};
    const catOrders: Record<string, number> = {};

    // From mostSoldProducts analytics
    const soldProducts = analytics?.mostSoldProducts || [];
    soldProducts.forEach((p: any) => {
      const cat = p.category || 'other';
      catCount[cat] = (catCount[cat] || 0) + (p.soldQty || 0);
    });

    // Fallback: derive categories from card data
    const totalProducts = analytics?.cards?.totalProducts || 0;
    if (Object.keys(catCount).length === 0) {
      catCount['other'] = totalProducts;
    }

    return { catCount, catOrders };
  }, [analytics]);

  const totalCategoryQty = Object.values(productCategories.catCount).reduce((a: number, b: number) => a + b, 0) || 1;

  const SUMMARY_CARDS = [
    { label: 'Total Revenue', value: analytics?.cards?.revenue ? `₹${(analytics.cards.revenue / 1000).toFixed(1)}k` : '₹0', icon: 'cash-outline' as const, color: colors.primary, tint: colors.primarySoft },
    { label: 'Total Orders', value: analytics?.cards?.totalOrders || 0, icon: 'receipt-outline' as const, color: colors.info, tint: colors.tintBlue },
    { label: 'Total Products', value: analytics?.cards?.totalProducts || 0, icon: 'cube-outline' as const, color: colors.accent, tint: colors.tintAmber },
    { label: 'Chain Transactions', value: analytics?.cards?.blockchainTransactions || 0, icon: 'link-outline' as const, color: colors.secondary, tint: colors.secondarySoft },
  ];

  const summaryRows = [SUMMARY_CARDS.slice(0, 2), SUMMARY_CARDS.slice(2, 4)];

  /** Renders a titled card holding a divider-separated list of value rows. */
  const renderRankedList = (
    rows: any[],
    emptyLabel: string,
    getName: (row: any) => string,
    getValue: (row: any) => string,
    getSub: (row: any) => string
  ) => {
    if (rows.length === 0) {
      return (
        <Card elevation="xs">
          <EmptyState compact icon="analytics-outline" title={emptyLabel} />
        </Card>
      );
    }
    return (
      <Card elevation="xs" style={styles.listCard}>
        {rows.map((row: any, idx: number) => (
          <View key={idx}>
            {idx > 0 && <View style={[styles.divider, { marginBottom: Layout.spacing.md }]} />}
            <View style={styles.listRow}>
              <View style={styles.rankChip}>
                <Text style={styles.rankText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {getName(row)}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {getSub(row)}
                </Text>
              </View>
              <Text style={styles.value} numberOfLines={1}>
                {getValue(row)}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    );
  };

  const monthlyRevenue: any[] = analytics?.monthlyRevenue || [];
  const mostSoldProducts: any[] = analytics?.mostSoldProducts || [];
  const topFarmers: any[] = analytics?.topFarmers || [];
  const topBuyers: any[] = analytics?.topBuyers || [];
  const latestActivities: any[] = analytics?.latestActivities || [];

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Analytics"
        subtitle="Marketplace insights"
        onRefresh={fetchAnalytics}
      />

      {loading ? (
        <View style={styles.skeletonWrap}>
          <StatRowSkeleton count={2} />
          <StatRowSkeleton count={2} />
          <ListSkeleton count={3} />
        </View>
      ) : error ? (
        <ErrorState
          title="Could not load analytics"
          message={error}
          onRetry={fetchAnalytics}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />
          }
        >
          {/* Summary Cards */}
          <View style={styles.section}>
            <SectionHeader title="Overview" subtitle="Headline marketplace figures" />
            <View style={styles.statsBlock}>
              {summaryRows.map((row, rowIdx) => (
                <View key={`summary-${rowIdx}`} style={styles.statsRow}>
                  {row.map((card) => (
                    <StatCard
                      key={card.label}
                      icon={card.icon}
                      value={card.value}
                      label={card.label}
                      accent={card.color}
                      tint={card.tint}
                    />
                  ))}
                  {row.length === 1 && <View style={styles.statSpacer} />}
                </View>
              ))}
            </View>
          </View>

          {/* Monthly Orders */}
          <View style={styles.section}>
            <SectionHeader title="Monthly Orders & Revenue" />
            {monthlyRevenue.length > 0 ? (
              monthlyRevenue.map((m: any, idx: number) => (
                <Card key={idx} style={styles.monthCard} elevation="xs">
                  <View style={styles.monthHeadRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.monthLabel} numberOfLines={1}>
                        {m._id?.month}/{m._id?.year}
                      </Text>
                      <Text style={styles.monthValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        ₹{m.revenue?.toFixed(0) || 0}
                      </Text>
                    </View>
                    <Text style={styles.sub} numberOfLines={1}>
                      {m.orders} orders
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.max(4, ((m.revenue || 0) / maxRevenue) * 100)}%` },
                      ]}
                    />
                  </View>
                </Card>
              ))
            ) : (
              <Card elevation="xs">
                <EmptyState compact icon="calendar-outline" title="No monthly data available yet" />
              </Card>
            )}
          </View>

          {/* Category Distribution */}
          <View style={styles.section}>
            <SectionHeader title="Category Distribution" />
            <Card elevation="xs" style={styles.listCard}>
              {Object.entries(productCategories.catCount).map(([cat, count]) => {
                const idx = ['vegetables', 'fruits', 'grains', 'dairy', 'meat', 'poultry', 'organic', 'other'].indexOf(cat) % colorsArray.length;
                const color = colorsArray[idx >= 0 ? idx : colorsArray.length - 1];
                const pct = (Number(count) / totalCategoryQty) * 100;
                return (
                  <View key={cat}>
                    <View style={styles.categoryRow}>
                      <View style={[styles.categoryDot, { backgroundColor: color }]} />
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {cat.toUpperCase()}
                      </Text>
                      <Text style={styles.categoryValue}>{count} items</Text>
                    </View>
                    <View style={styles.categoryBar}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          { width: `${Math.max(4, pct)}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>

          {/* Top Products */}
          <View style={styles.section}>
            <SectionHeader title="Top Selling Products" />
            {renderRankedList(
              mostSoldProducts,
              'No sales data available yet',
              (p) => p.name || 'Product',
              (p) => `${p.soldQty || 0} sold`,
              (p) => `Revenue ₹${(p.revenue || 0).toFixed(0)}`
            )}
          </View>

          {/* Top Farmers */}
          <View style={styles.section}>
            <SectionHeader title="Top Farmers" />
            {renderRankedList(
              topFarmers,
              'No farmer data available yet',
              (f) => f.name || 'Farmer',
              (f) => `₹${(f.revenue || 0).toFixed(0)}`,
              (f) => `${f.orderCount || 0} orders`
            )}
          </View>

          {/* Top Buyers */}
          <View style={styles.section}>
            <SectionHeader title="Most Active Buyers" />
            {renderRankedList(
              topBuyers,
              'No buyer data available yet',
              (b) => b.name || 'Buyer',
              (b) => `₹${(b.spent || 0).toFixed(0)}`,
              (b) => `${b.orderCount || 0} orders`
            )}
          </View>

          {/* Latest Activities */}
          <View style={styles.section}>
            <SectionHeader title="Latest Activities" />
            {latestActivities.length > 0 ? (
              <Card elevation="xs" style={styles.listCard}>
                {latestActivities.map((a: any, idx: number) => (
                  <View key={idx}>
                    {idx > 0 && <View style={[styles.divider, { marginBottom: Layout.spacing.md }]} />}
                    <View style={styles.activityHead}>
                      <Text style={styles.name} numberOfLines={1}>
                        {a.message}
                      </Text>
                      <StatusBadge status={a.type} />
                    </View>
                    <Text style={styles.sub} numberOfLines={1}>
                      {new Date(a.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : (
              <Card elevation="xs">
                <EmptyState compact icon="pulse-outline" title="No recent activities" />
              </Card>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
