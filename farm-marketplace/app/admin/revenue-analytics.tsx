import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { gradients } from '../../constants/ThemeColors';
import { logApiError } from '../../services/apiError';
import {
  exportReport,
  fetchBusinessAnalytics,
  formatCompact,
  formatGrowth,
  formatINR,
  formatINRShort,
} from '../../services/businessAnalytics';
import {
  REPORT_META,
  type BusinessAnalytics,
  type ReportType,
  type TopFarmer,
} from '../../types/analytics.types';
import AdminHeader from '../../components/admin/AdminHeader';
import { BarChartCard, MetricTile, ShareBar, TrendPill } from '../../components/admin/AnalyticsCharts';
import {
  Badge,
  Button,
  Card,
  ChipRow,
  EmptyState,
  ErrorState,
  ListSkeleton,
  SectionHeader,
  StatCard,
  StatRowSkeleton,
  friendlyError,
} from '../../components/ui';

type FarmerSort = 'revenue' | 'orders' | 'rating';

const FARMER_SORTS: { label: string; value: FarmerSort }[] = [
  { label: 'By Revenue', value: 'revenue' },
  { label: 'By Orders', value: 'orders' },
  { label: 'By Rating', value: 'rating' },
];

const sortFarmers = (rows: TopFarmer[], by: FarmerSort): TopFarmer[] =>
  [...rows].sort((a, b) => {
    if (by === 'orders') return b.orders - a.orders || b.revenue - a.revenue;
    if (by === 'rating') return b.averageRating - a.averageRating || b.reviews - a.reviews || b.revenue - a.revenue;
    return b.revenue - a.revenue;
  });

export default function AdminRevenueAnalyticsScreen() {
  const colors = useColors();
  const [data, setData] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmerSort, setFarmerSort] = useState<FarmerSort>('revenue');
  const [exporting, setExporting] = useState<ReportType | null>(null);
  const [exportNotice, setExportNotice] = useState<{ text: string; ok: boolean } | null>(null);

  /** Fixed colour per product category — identity never depends on rank. */
  const categoryColor = useMemo<Record<string, string>>(
    () => ({
      vegetables: colors.primary,
      fruits: colors.accent,
      grains: colors.warning,
      organic: colors.secondary,
      dairy: colors.info,
      meat: colors.error,
      poultry: colors.admin,
      other: colors.muted,
    }),
    [colors]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { padding: Layout.spacing.lg, paddingBottom: Layout.spacing.xxl * 2 },
        section: { marginBottom: Layout.spacing.xl },
        skeletonWrap: { padding: Layout.spacing.lg, gap: Layout.spacing.md },
        row: { flexDirection: 'row', gap: Layout.spacing.md },
        rowTight: { flexDirection: 'row', gap: Layout.spacing.sm },
        stack: { gap: Layout.spacing.md },
        // Hero
        hero: {
          borderRadius: Layout.borderRadius.xl,
          padding: Layout.spacing.lg,
          overflow: 'hidden',
          ...Layout.shadow.md,
        },
        heroTop: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm },
        heroEyebrow: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.bold,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: 0.8,
          flex: 1,
        },
        heroValue: {
          fontSize: Typography.fontSize.display,
          lineHeight: Typography.leading.huge + 6,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.white,
          marginTop: Layout.spacing.sm,
        },
        heroCaption: {
          fontSize: Typography.fontSize.xs,
          color: 'rgba(255,255,255,0.8)',
          marginTop: 2,
        },
        heroTrend: { marginTop: Layout.spacing.sm + 2 },
        heroTiles: { flexDirection: 'row', gap: Layout.spacing.sm, marginTop: Layout.spacing.lg },
        heroTile: {
          flex: 1,
          minWidth: 0,
          backgroundColor: 'rgba(255,255,255,0.14)',
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.sm + 2,
        },
        heroTileLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: Typography.fontWeight.semibold, letterSpacing: 0.4 },
        heroTileValue: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.white,
          marginTop: 2,
        },
        // Commission
        commissionHead: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md },
        commissionIcon: {
          width: 44,
          height: 44,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.tintAmber,
          alignItems: 'center',
          justifyContent: 'center',
        },
        commissionTitle: { fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.bold, color: colors.text },
        commissionSub: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, marginTop: 2 },
        commissionFlow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm + 2,
          paddingHorizontal: Layout.spacing.md,
          backgroundColor: colors.surfaceAlt,
          borderRadius: Layout.borderRadius.md,
        },
        flowLabel: { fontSize: Typography.fontSize.xxs, color: colors.textSecondary, fontWeight: Typography.fontWeight.semibold },
        flowValue: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, color: colors.text },
        // Growth cards
        growthHead: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm, marginBottom: Layout.spacing.md },
        growthIcon: {
          width: 36,
          height: 36,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        growthTitle: { flex: 1, fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.bold, color: colors.text },
        growthTotal: {
          fontSize: Typography.fontSize.xxxl,
          lineHeight: Typography.leading.xxxl,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.text,
        },
        growthTotalLabel: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, marginBottom: Layout.spacing.md },
        // Ranked lists
        listCard: { gap: Layout.spacing.md },
        divider: { height: 1, backgroundColor: colors.border },
        listRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md },
        rankChip: {
          width: 30,
          height: 30,
          borderRadius: Layout.borderRadius.sm,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rankGold: { backgroundColor: colors.tintAmber },
        rankText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold, color: colors.primary },
        name: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
        },
        nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
        sub: { fontSize: Typography.fontSize.xs, lineHeight: Typography.leading.xs, color: colors.textSecondary, marginTop: 2 },
        value: { fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.bold, color: colors.primary, flexShrink: 0 },
        valueSub: { fontSize: Typography.fontSize.xxs, color: colors.muted, textAlign: 'right' },
        ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
        // Insights
        insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Layout.spacing.md },
        insightIcon: {
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        insightText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: Typography.leading.sm, color: colors.text },
        // Export
        exportGrid: { gap: Layout.spacing.sm },
        exportRow: { flexDirection: 'row', gap: Layout.spacing.sm },
        exportSlot: { flex: 1, minWidth: 0 },
        exportHint: { fontSize: Typography.fontSize.xs, lineHeight: Typography.leading.xs, color: colors.textSecondary, marginBottom: Layout.spacing.md },
        notice: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
          marginTop: Layout.spacing.md,
        },
        noticeText: { flex: 1, fontSize: Typography.fontSize.xs, lineHeight: Typography.leading.xs },
        generated: {
          fontSize: Typography.fontSize.xxs,
          color: colors.muted,
          textAlign: 'center',
          marginTop: Layout.spacing.md,
        },
      }),
    [colors]
  );

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      setData(await fetchBusinessAnalytics());
    } catch (err) {
      logApiError('Admin business analytics', err);
      setError(friendlyError(err, 'Could not load revenue analytics.'));
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

  const handleExport = async (type: ReportType) => {
    if (exporting) return;
    setExporting(type);
    setExportNotice(null);
    try {
      const outcome = await exportReport(type);
      const label = REPORT_META[type].label;
      setExportNotice({
        ok: true,
        text:
          outcome === 'downloaded'
            ? `${label} downloaded as CSV.`
            : outcome === 'shared'
            ? `${label} shared as CSV.`
            : `${label} copied to clipboard as CSV — paste it into Sheets or Excel.`,
      });
    } catch (err) {
      logApiError('Admin export report', err);
      setExportNotice({ ok: false, text: friendlyError(err, 'Could not generate the report.') });
    } finally {
      setExporting(null);
    }
  };

  const topFarmers = useMemo(() => (data ? sortFarmers(data.topFarmers, farmerSort) : []), [data, farmerSort]);

  const insightTone = (tone: 'positive' | 'neutral' | 'warning') =>
    tone === 'positive'
      ? { bg: colors.successSoft, fg: colors.success }
      : tone === 'warning'
      ? { bg: colors.warningSoft, fg: colors.warning }
      : { bg: colors.tintBlue, fg: colors.info };

  const renderStars = (rating: number) => (
    <View style={styles.ratingRow}>
      <Ionicons name={rating > 0 ? 'star' : 'star-outline'} size={12} color={colors.star} />
      <Text style={styles.sub}>{rating > 0 ? rating.toFixed(1) : '—'}</Text>
    </View>
  );

  const renderGrowthCard = (
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    accent: string,
    tint: string,
    block: BusinessAnalytics['farmers'],
    noun: string
  ) => (
    <Card elevation="xs">
      <View style={styles.growthHead}>
        <View style={[styles.growthIcon, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={styles.growthTitle}>{title}</Text>
        <TrendPill value={block.growth} suffix="sign-ups" />
      </View>
      <Text style={styles.growthTotal}>{block.total.toLocaleString('en-IN')}</Text>
      <Text style={styles.growthTotalLabel}>Total {noun}</Text>
      <View style={styles.rowTight}>
        <MetricTile label="New this month" value={String(block.newThisMonth)} caption={`${block.newLastMonth} last month`} icon="person-add-outline" accent={accent} />
        <MetricTile label="Active (30d)" value={String(block.active)} caption={block.total ? `${Math.round((block.active / block.total) * 100)}% of base` : undefined} icon="pulse-outline" accent={accent} />
        <MetricTile label="Growth" value={formatGrowth(block.baseGrowth)} caption="of existing base" icon="trending-up-outline" accent={accent} />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <AdminHeader
        title="Revenue & Growth"
        subtitle="Platform business intelligence"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/admin'))}
        onRefresh={() => load()}
        rightIcon="bar-chart-outline"
        onRightPress={() => router.push('/admin/analytics')}
      />

      {loading ? (
        <View style={styles.skeletonWrap}>
          <StatRowSkeleton count={1} />
          <StatRowSkeleton count={2} />
          <StatRowSkeleton count={2} />
          <ListSkeleton count={2} />
        </View>
      ) : error || !data ? (
        <ErrorState title="Could not load analytics" message={error || 'No data returned.'} onRetry={() => load()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.admin]} />}
        >
          {/* 1 ── Total revenue */}
          <View style={styles.section}>
            <LinearGradient colors={gradients.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.heroTop}>
                <Ionicons name="cash-outline" size={18} color={colors.white} />
                <Text style={styles.heroEyebrow}>TOTAL REVENUE GENERATED</Text>
                <Badge label="Live" tone="success" icon="radio-outline" />
              </View>
              <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {formatINR(data.revenue.total)}
              </Text>
              <Text style={styles.heroCaption}>
                from {data.revenue.totalOrders.toLocaleString('en-IN')} paid orders · {formatINR(data.revenue.lastMonth)} last month
              </Text>
              <View style={styles.heroTrend}>
                <TrendPill value={data.revenue.monthlyGrowth} suffix="from last month" />
              </View>
              <View style={styles.heroTiles}>
                <View style={styles.heroTile}>
                  <Text style={styles.heroTileLabel}>COMPLETED ORDERS</Text>
                  <Text style={styles.heroTileValue} numberOfLines={1}>{data.revenue.completedOrders.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.heroTile}>
                  <Text style={styles.heroTileLabel}>THIS MONTH</Text>
                  <Text style={styles.heroTileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatINRShort(data.revenue.thisMonth)}</Text>
                </View>
                <View style={styles.heroTile}>
                  <Text style={styles.heroTileLabel}>TODAY</Text>
                  <Text style={styles.heroTileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatINRShort(data.revenue.today)}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* 2 ── Platform commission */}
          <View style={styles.section}>
            <SectionHeader title="Platform Commission" subtitle={`${data.commission.ratePercent}% of every paid order · configurable`} />
            <Card elevation="xs">
              <View style={styles.commissionHead}>
                <View style={styles.commissionIcon}>
                  <Ionicons name="wallet-outline" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.commissionTitle}>{formatINR(data.commission.total)}</Text>
                  <Text style={styles.commissionSub}>Total commission earned</Text>
                </View>
                <TrendPill value={data.commission.growth} suffix="" />
              </View>
              <View style={[styles.rowTight, { marginTop: Layout.spacing.md }]}>
                <MetricTile label="Monthly" value={formatINRShort(data.commission.thisMonth)} caption={`${formatINRShort(data.commission.lastMonth)} last month`} icon="calendar-outline" accent={colors.accent} />
                <MetricTile label="Daily" value={formatINRShort(data.commission.today)} caption="earned today" icon="today-outline" accent={colors.accent} />
              </View>
              <View style={styles.commissionFlow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flowLabel}>REVENUE</Text>
                  <Text style={styles.flowValue}>{formatINRShort(data.revenue.total)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.muted} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.flowLabel}>× {data.commission.ratePercent}%</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.muted} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.flowLabel}>COMMISSION</Text>
                  <Text style={[styles.flowValue, { color: colors.accent }]}>{formatINRShort(data.commission.total)}</Text>
                </View>
              </View>
            </Card>
          </View>

          {/* 3 ── Monthly growth */}
          <View style={styles.section}>
            <SectionHeader title="Monthly Growth" subtitle="Last six months · tap a bar for its value" />
            <View style={styles.stack}>
              <BarChartCard
                title="Revenue"
                subtitle={`This month ${formatGrowth(data.revenue.monthlyGrowth)} vs last month`}
                data={data.monthly.map((m) => ({ label: m.label, value: m.revenue, sub: String(m.year).slice(2) }))}
                formatValue={formatINRShort}
                accent={colors.primary}
              />
              <BarChartCard
                title="Orders"
                subtitle={`This month ${formatGrowth(data.revenue.orderGrowth)} vs last month`}
                data={data.monthly.map((m) => ({ label: m.label, value: m.orders, sub: String(m.year).slice(2) }))}
                formatValue={(v) => formatCompact(v)}
                accent={colors.info}
              />
            </View>
          </View>

          {/* 4 & 5 ── Farmer / buyer growth */}
          <View style={styles.section}>
            <SectionHeader title="Community Growth" subtitle="Registrations and 30-day activity" />
            <View style={styles.stack}>
              {renderGrowthCard('Farmer Growth', 'leaf-outline', colors.primary, colors.primarySoft, data.farmers, 'farmers')}
              {renderGrowthCard('Buyer Growth', 'people-outline', colors.info, colors.tintBlue, data.buyers, 'buyers')}
            </View>
          </View>

          {/* 6 ── Top farmers */}
          <View style={styles.section}>
            <SectionHeader title="Top Farmers" subtitle="Top 10 by paid-order revenue" />
            <ChipRow
              options={FARMER_SORTS}
              selected={farmerSort}
              onSelect={(v) => setFarmerSort(v as FarmerSort)}
              contentPaddingHorizontal={0}
              style={{ marginBottom: Layout.spacing.md }}
            />
            {topFarmers.length === 0 ? (
              <Card elevation="xs">
                <EmptyState compact icon="leaf-outline" title="No farmer sales yet" description="Rankings appear once paid orders come in." />
              </Card>
            ) : (
              <Card elevation="xs" style={styles.listCard}>
                {topFarmers.map((f, idx) => (
                  <View key={f._id}>
                    {idx > 0 && <View style={[styles.divider, { marginBottom: Layout.spacing.md }]} />}
                    <View style={styles.listRow}>
                      <View style={[styles.rankChip, idx === 0 && styles.rankGold]}>
                        {idx === 0 ? (
                          <Ionicons name="trophy" size={15} color={colors.accent} />
                        ) : (
                          <Text style={styles.rankText}>{idx + 1}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.name} numberOfLines={1}>{f.name}</Text>
                        <View style={styles.nameRow}>
                          <Text style={styles.sub}>{f.orders} order{f.orders !== 1 ? 's' : ''}</Text>
                          <Text style={styles.sub}>·</Text>
                          {renderStars(f.averageRating)}
                          {f.reviews > 0 && <Text style={styles.sub}>({f.reviews})</Text>}
                        </View>
                      </View>
                      <View>
                        <Text style={styles.value} numberOfLines={1}>{formatINRShort(f.revenue)}</Text>
                        <Text style={styles.valueSub}>revenue</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>

          {/* 7 ── Top products */}
          <View style={styles.section}>
            <SectionHeader title="Top Products" subtitle="Top 10 by revenue generated" />
            {data.topProducts.length === 0 ? (
              <Card elevation="xs">
                <EmptyState compact icon="cube-outline" title="No product sales yet" />
              </Card>
            ) : (
              <Card elevation="xs" style={styles.listCard}>
                {data.topProducts.map((p, idx) => (
                  <View key={p._id}>
                    {idx > 0 && <View style={[styles.divider, { marginBottom: Layout.spacing.md }]} />}
                    <View style={styles.listRow}>
                      <View style={[styles.rankChip, p.bestSeller && styles.rankGold]}>
                        <Text style={[styles.rankText, p.bestSeller && { color: colors.accent }]}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                          {p.bestSeller && <Badge label="🏆 Best Seller" tone="warning" />}
                        </View>
                        <View style={styles.nameRow}>
                          <Text style={styles.sub}>{p.category}{p.isOrganic ? ' · Organic' : ''}</Text>
                          <Text style={styles.sub}>·</Text>
                          <Text style={styles.sub}>{p.orders} order{p.orders !== 1 ? 's' : ''}</Text>
                          <Text style={styles.sub}>·</Text>
                          {renderStars(p.rating)}
                        </View>
                      </View>
                      <View>
                        <Text style={styles.value} numberOfLines={1}>{formatINRShort(p.revenue)}</Text>
                        <Text style={styles.valueSub}>{formatCompact(p.quantity)} units</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>

          {/* 8 ── Category performance */}
          <View style={styles.section}>
            <SectionHeader title="Category Performance" subtitle="Share of paid-order revenue" />
            {data.categories.length === 0 ? (
              <Card elevation="xs">
                <EmptyState compact icon="pie-chart-outline" title="No category sales yet" />
              </Card>
            ) : (
              <Card elevation="xs" style={styles.listCard}>
                {data.categories.map((c) => (
                  <ShareBar
                    key={c.key}
                    label={c.name}
                    value={`${c.orders} orders · ${formatINRShort(c.revenue)}`}
                    share={c.share}
                    color={categoryColor[c.key] || colors.muted}
                  />
                ))}
              </Card>
            )}
          </View>

          {/* 9 ── Blockchain */}
          <View style={styles.section}>
            <SectionHeader title="Blockchain Transactions" subtitle="Escrow-backed order settlement" />
            <View style={styles.stack}>
              <View style={styles.row}>
                <StatCard icon="link-outline" value={data.blockchain.totalTransactions} label="Total Chain Tx" accent={colors.info} tint={colors.tintSky} />
                <StatCard icon="lock-closed-outline" value={data.blockchain.escrowTransactions} label="Escrow Transactions" accent={colors.secondary} tint={colors.secondarySoft} />
              </View>
              <View style={styles.row}>
                <StatCard icon="checkmark-done-outline" value={data.blockchain.completedEscrows} label="Completed Escrows" accent={colors.success} tint={colors.successSoft} />
                <StatCard icon="return-down-back-outline" value={data.blockchain.refundedEscrows} label="Refunded Escrows" accent={colors.error} tint={colors.errorSoft} />
              </View>
              <View style={styles.row}>
                <StatCard icon="cash-outline" value={formatINRShort(data.blockchain.escrowVolume)} label="Escrow Volume (INR)" accent={colors.primaryDark} tint={colors.tintGreen} />
                <StatCard icon="cube-outline" value={data.blockchain.chainVolume.toFixed(3)} label="On-chain Volume (ETH)" accent={colors.admin} tint={colors.lighterGray} />
              </View>
            </View>
          </View>

          {/* 10 ── Insights */}
          <View style={styles.section}>
            <SectionHeader title="Business Insights" subtitle="Generated from live marketplace data" />
            {data.insights.length === 0 ? (
              <Card elevation="xs">
                <EmptyState compact icon="bulb-outline" title="Insights appear once orders start flowing" />
              </Card>
            ) : (
              <Card elevation="xs" style={styles.listCard}>
                {data.insights.map((ins, idx) => {
                  const tone = insightTone(ins.tone);
                  return (
                    <View key={idx}>
                      {idx > 0 && <View style={[styles.divider, { marginBottom: Layout.spacing.md }]} />}
                      <View style={styles.insightRow}>
                        <View style={[styles.insightIcon, { backgroundColor: tone.bg }]}>
                          <Ionicons name={ins.icon as keyof typeof Ionicons.glyphMap} size={16} color={tone.fg} />
                        </View>
                        <Text style={styles.insightText}>{ins.text}</Text>
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}
          </View>

          {/* Bonus ── Export */}
          <View style={styles.section}>
            <SectionHeader title="Export Reports" subtitle="CSV — opens in Excel / Google Sheets" />
            <Card elevation="xs">
              <Text style={styles.exportHint}>
                Reports are generated from live data at the moment you tap. On a phone the CSV opens in the share sheet; on the web it downloads directly.
              </Text>
              <View style={styles.exportGrid}>
                <View style={styles.exportRow}>
                  <Button title="Revenue" icon="cash-outline" variant="outline" size="sm" loading={exporting === 'revenue'} disabled={!!exporting} onPress={() => handleExport('revenue')} style={styles.exportSlot} />
                  <Button title="Monthly Summary" icon="calendar-outline" variant="outline" size="sm" loading={exporting === 'monthly'} disabled={!!exporting} onPress={() => handleExport('monthly')} style={styles.exportSlot} />
                </View>
                <View style={styles.exportRow}>
                  <Button title="Farmers" icon="leaf-outline" variant="outline" size="sm" loading={exporting === 'farmers'} disabled={!!exporting} onPress={() => handleExport('farmers')} style={styles.exportSlot} />
                  <Button title="Buyers" icon="people-outline" variant="outline" size="sm" loading={exporting === 'buyers'} disabled={!!exporting} onPress={() => handleExport('buyers')} style={styles.exportSlot} />
                </View>
              </View>
              {exportNotice && (
                <View style={[styles.notice, { backgroundColor: exportNotice.ok ? colors.successSoft : colors.errorSoft }]}>
                  <Ionicons name={exportNotice.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={16} color={exportNotice.ok ? colors.success : colors.error} />
                  <Text style={[styles.noticeText, { color: exportNotice.ok ? colors.success : colors.error }]}>{exportNotice.text}</Text>
                </View>
              )}
            </Card>
          </View>

          <Text style={styles.generated}>Generated {new Date(data.generatedAt).toLocaleString()}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
