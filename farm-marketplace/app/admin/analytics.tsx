import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusBadge from '../../components/admin/StatusBadge';

const BAR_MAX = Dimensions.get('window').width - 80;

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
        content: { padding: Layout.spacing.md, paddingBottom: Layout.spacing.xxl },
        sectionTitle: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.black,
          marginBottom: Layout.spacing.sm,
          marginTop: Layout.spacing.md,
        },
        card: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: Layout.spacing.sm,
        },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        name: { color: colors.black, fontWeight: '600', flex: 1 },
        value: { color: colors.primary, fontWeight: '700' },
        barTrack: {
          height: 10,
          backgroundColor: colors.lighterGray,
          borderRadius: 6,
          marginTop: 8,
          overflow: 'hidden',
        },
        barFill: { height: 10, borderRadius: 6, backgroundColor: colors.primary },
        monthLabel: { fontSize: 11, color: colors.gray, marginTop: 4 },
        activity: { color: colors.gray, fontSize: 12, marginTop: 2 },
        summaryGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -4,
        },
        summaryCard: {
          width: '50%',
          padding: 4,
        },
        summaryInner: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        },
        summaryIcon: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Layout.spacing.xs,
        },
        summaryValue: {
          fontSize: Typography.fontSize.lg,
          fontWeight: '700',
          color: colors.black,
        },
        summaryLabel: {
          fontSize: Typography.fontSize.xs,
          color: colors.gray,
          marginTop: 2,
          textAlign: 'center',
        },
        categoryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: 4,
        },
        categoryDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          marginRight: Layout.spacing.sm,
        },
        categoryName: {
          fontSize: Typography.fontSize.sm,
          color: colors.black,
          flex: 1,
        },
        categoryValue: {
          fontSize: Typography.fontSize.sm,
          fontWeight: '600',
          color: colors.gray,
        },
        categoryBar: {
          height: 6,
          backgroundColor: colors.lighterGray,
          borderRadius: 3,
          marginTop: 4,
          overflow: 'hidden',
        },
        categoryBarFill: {
          height: 6,
          borderRadius: 3,
        },
        errorCard: {
          backgroundColor: '#FFEBEE',
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
          margin: Layout.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
        },
        errorText: { color: '#C62828', fontSize: Typography.fontSize.sm, flex: 1, marginLeft: Layout.spacing.sm },
        centerContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: Layout.spacing.xl,
        },
        loadingText: { marginTop: Layout.spacing.md, color: colors.gray },
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

  const colorsArray = ['#2E7D32', '#1565C0', '#F57C00', '#7B1FA2', '#C62828', '#00897B', '#5E35B1', '#EF6C00'];

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
    { label: 'Total Revenue', value: analytics?.cards?.revenue ? `₹${(analytics.cards.revenue / 1000).toFixed(1)}k` : '₹0', icon: 'cash-outline' as const, color: '#2E7D32' },
    { label: 'Total Orders', value: analytics?.cards?.totalOrders || 0, icon: 'receipt-outline' as const, color: '#1565C0' },
    { label: 'Total Products', value: analytics?.cards?.totalProducts || 0, icon: 'cube-outline' as const, color: '#F57C00' },
    { label: 'Chain Transactions', value: analytics?.cards?.blockchainTransactions || 0, icon: 'link-outline' as const, color: '#7B1FA2' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader
        title="Analytics"
        subtitle="Marketplace insights"
        onRefresh={fetchAnalytics}
      />

      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={20} color="#C62828" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.admin} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />
          }
        >
          {/* Summary Cards */}
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.summaryGrid}>
            {SUMMARY_CARDS.map((card) => (
              <View key={card.label} style={styles.summaryCard}>
                <View style={styles.summaryInner}>
                  <View style={[styles.summaryIcon, { backgroundColor: card.color + '15' }]}>
                    <Ionicons name={card.icon} size={20} color={card.color} />
                  </View>
                  <Text style={styles.summaryValue}>{card.value}</Text>
                  <Text style={styles.summaryLabel}>{card.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Monthly Orders */}
          <Text style={styles.sectionTitle}>Monthly Orders & Revenue</Text>
          {(analytics?.monthlyRevenue || []).length > 0 ? (
            (analytics.monthlyRevenue || []).map((m: any, idx: number) => (
              <View key={idx} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.name}>
                    {m._id?.month}/{m._id?.year}
                  </Text>
                  <Text style={styles.value}>₹{m.revenue?.toFixed(0) || 0}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: Math.max(8, (m.revenue || 0) / maxRevenue * BAR_MAX) },
                    ]}
                  />
                </View>
                <Text style={styles.monthLabel}>{m.orders} orders</Text>
              </View>
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.activity}>No monthly data available yet</Text>
            </View>
          )}

          {/* Category Distribution */}
          <Text style={styles.sectionTitle}>Category Distribution</Text>
          <View style={styles.card}>
            {Object.entries(productCategories.catCount).map(([cat, count]) => {
              const idx = ['vegetables', 'fruits', 'grains', 'dairy', 'meat', 'poultry', 'organic', 'other'].indexOf(cat) % colorsArray.length;
              const color = colorsArray[idx >= 0 ? idx : colorsArray.length - 1];
              const pct = (Number(count) / totalCategoryQty) * 100;
              return (
                <View key={cat}>
                  <View style={styles.categoryRow}>
                    <View style={[styles.categoryDot, { backgroundColor: color }]} />
                    <Text style={styles.categoryName}>{cat.toUpperCase()}</Text>
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
          </View>

          {/* Top Products */}
          <Text style={styles.sectionTitle}>Top Selling Products</Text>
          {(analytics?.mostSoldProducts || []).length > 0 ? (
            (analytics.mostSoldProducts || []).map((p: any, idx: number) => (
              <View key={idx} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.name}>{p.name || 'Product'}</Text>
                  <Text style={styles.value}>{p.soldQty || 0} sold</Text>
                </View>
                <Text style={styles.activity}>Revenue ₹{(p.revenue || 0).toFixed(0)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.activity}>No sales data available yet</Text>
            </View>
          )}

          {/* Top Farmers */}
          <Text style={styles.sectionTitle}>Top Farmers</Text>
          {(analytics?.topFarmers || []).length > 0 ? (
            (analytics.topFarmers || []).map((f: any, idx: number) => (
              <View key={idx} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.name}>{f.name || 'Farmer'}</Text>
                  <Text style={styles.value}>₹{(f.revenue || 0).toFixed(0)}</Text>
                </View>
                <Text style={styles.activity}>{f.orderCount || 0} orders</Text>
              </View>
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.activity}>No farmer data available yet</Text>
            </View>
          )}

          {/* Top Buyers */}
          <Text style={styles.sectionTitle}>Most Active Buyers</Text>
          {(analytics?.topBuyers || []).length > 0 ? (
            (analytics.topBuyers || []).map((b: any, idx: number) => (
              <View key={idx} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.name}>{b.name || 'Buyer'}</Text>
                  <Text style={styles.value}>₹{(b.spent || 0).toFixed(0)}</Text>
                </View>
                <Text style={styles.activity}>{b.orderCount || 0} orders</Text>
              </View>
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.activity}>No buyer data available yet</Text>
            </View>
          )}

          {/* Latest Activities */}
          <Text style={styles.sectionTitle}>Latest Activities</Text>
          {(analytics?.latestActivities || []).map((a: any, idx: number) => (
            <View key={idx} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name} numberOfLines={1}>{a.message}</Text>
                <StatusBadge status={a.type} />
              </View>
              <Text style={styles.activity}>
                {new Date(a.createdAt).toLocaleString()}
              </Text>
            </View>
          ))}
          {(analytics?.latestActivities || []).length === 0 && (
            <View style={styles.card}>
              <Text style={styles.activity}>No recent activities</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}