import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Card from '../ui/Card';
import EmptyState from '../EmptyState';

/* -------------------------------------------------------------------------
 * TrendPill — "+12% vs last month" growth chip
 * ---------------------------------------------------------------------- */

interface TrendPillProps {
  /** Percentage change; null → "New" (no baseline). */
  value: number | null | undefined;
  suffix?: string;
  style?: ViewStyle;
}

export function TrendPill({ value, suffix = 'vs last month', style }: TrendPillProps) {
  const colors = useColors();
  const isNull = value === null || value === undefined;
  const up = !isNull && (value as number) > 0;
  const down = !isNull && (value as number) < 0;

  const fg = isNull ? colors.info : up ? colors.success : down ? colors.error : colors.textSecondary;
  const bg = isNull ? colors.infoSoft : up ? colors.successSoft : down ? colors.errorSoft : colors.lighterGray;
  const icon = isNull ? 'sparkles-outline' : up ? 'trending-up' : down ? 'trending-down' : 'remove-outline';
  const label = isNull
    ? 'New'
    : `${(value as number) > 0 ? '+' : ''}${(value as number).toFixed(1).replace(/\.0$/, '')}%`;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          backgroundColor: bg,
          borderRadius: Layout.borderRadius.full,
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={12} color={fg} />
      <Text style={{ fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold, color: fg }}>
        {label}
      </Text>
      {!!suffix && (
        <Text style={{ fontSize: Typography.fontSize.xxs, color: colors.textSecondary }}>{suffix}</Text>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------
 * BarChartCard — single-series vertical bar chart drawn with plain Views
 * (no native chart dependency → works in Expo Go and on web).
 * ---------------------------------------------------------------------- */

export interface BarPoint {
  label: string;
  value: number;
  /** Optional secondary line under the label (e.g. year). */
  sub?: string;
}

interface BarChartCardProps {
  title: string;
  subtitle?: string;
  data: BarPoint[];
  formatValue?: (v: number) => string;
  /** Bar colour — one hue for one series. Defaults to brand primary. */
  accent?: string;
  height?: number;
  emptyTitle?: string;
  style?: ViewStyle;
}

const niceMax = (max: number): number => {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
};

export function BarChartCard({
  title,
  subtitle,
  data,
  formatValue = (v) => String(Math.round(v)),
  accent,
  height = 150,
  emptyTitle = 'No data for this period yet',
  style,
}: BarChartCardProps) {
  const colors = useColors();
  const barColor = accent || colors.primary;
  const [selected, setSelected] = useState<number | null>(null);

  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.value))), [data]);
  const maxIdx = useMemo(() => {
    let idx = -1;
    let best = -Infinity;
    data.forEach((d, i) => {
      if (d.value > best) {
        best = d.value;
        idx = i;
      }
    });
    return idx;
  }, [data]);
  const total = data.reduce((a, d) => a + d.value, 0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        head: { marginBottom: Layout.spacing.md },
        title: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        subtitle: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          marginTop: 2,
        },
        plotRow: { flexDirection: 'row', gap: Layout.spacing.sm },
        yAxis: { justifyContent: 'space-between', height, paddingBottom: 0 },
        yLabel: { fontSize: Typography.fontSize.xxs, color: colors.muted, textAlign: 'right', minWidth: 34 },
        plot: { flex: 1, height, position: 'relative' },
        grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border },
        bars: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' },
        barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', paddingHorizontal: 2 },
        bar: { width: '100%', maxWidth: 28, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: barColor },
        barLabel: {
          fontSize: Typography.fontSize.xxs,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          marginBottom: 3,
        },
        baseline: { height: 1.5, backgroundColor: colors.borderStrong, marginTop: 0 },
        xAxis: { flexDirection: 'row', marginTop: 6, marginLeft: 34 + Layout.spacing.sm },
        xSlot: { flex: 1, alignItems: 'center' },
        xLabel: { fontSize: Typography.fontSize.xxs, color: colors.textSecondary, fontWeight: Typography.fontWeight.medium },
        xSub: { fontSize: 9, color: colors.muted },
        tooltip: {
          marginTop: Layout.spacing.sm + 2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          backgroundColor: colors.surfaceAlt,
          borderRadius: Layout.borderRadius.md,
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm,
        },
        tooltipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: barColor },
        tooltipText: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, flex: 1 },
        tooltipValue: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, color: colors.text },
      }),
    [colors, barColor, height]
  );

  const ticks = [max, max / 2, 0];

  return (
    <Card elevation="xs" style={style}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {data.length === 0 || total === 0 ? (
        <EmptyState compact icon="bar-chart-outline" title={emptyTitle} />
      ) : (
        <>
          <View style={styles.plotRow}>
            <View style={styles.yAxis}>
              {ticks.map((t, i) => (
                <Text key={i} style={styles.yLabel} numberOfLines={1}>
                  {formatValue(t)}
                </Text>
              ))}
            </View>
            <View style={styles.plot}>
              <View style={[styles.grid, { top: 0 }]} />
              <View style={[styles.grid, { top: height / 2 }]} />
              <View style={styles.bars}>
                {data.map((d, i) => {
                  const pct = max > 0 ? (d.value / max) * 100 : 0;
                  const isSelected = selected === i;
                  const showLabel = isSelected || (selected === null && i === maxIdx && d.value > 0);
                  return (
                    <TouchableOpacity
                      key={`${d.label}-${i}`}
                      style={styles.barSlot}
                      activeOpacity={0.7}
                      onPress={() => setSelected(isSelected ? null : i)}
                      accessibilityRole="button"
                      accessibilityLabel={`${d.label}: ${formatValue(d.value)}`}
                    >
                      {showLabel && (
                        <Text style={styles.barLabel} numberOfLines={1}>
                          {formatValue(d.value)}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(d.value > 0 ? 2 : 0, pct)}%`,
                            opacity: selected === null || isSelected ? 1 : 0.45,
                          },
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
          <View style={[styles.baseline, { marginLeft: 34 + Layout.spacing.sm }]} />
          <View style={styles.xAxis}>
            {data.map((d, i) => (
              <View key={`${d.label}-x-${i}`} style={styles.xSlot}>
                <Text style={styles.xLabel} numberOfLines={1}>
                  {d.label}
                </Text>
                {!!d.sub && <Text style={styles.xSub}>{d.sub}</Text>}
              </View>
            ))}
          </View>
          {selected !== null && data[selected] && (
            <View style={styles.tooltip}>
              <View style={styles.tooltipDot} />
              <Text style={styles.tooltipText}>
                {data[selected].label}
                {data[selected].sub ? ` ${data[selected].sub}` : ''}
              </Text>
              <Text style={styles.tooltipValue}>{formatValue(data[selected].value)}</Text>
            </View>
          )}
        </>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------
 * ShareBar — horizontal proportion bar (category share)
 * ---------------------------------------------------------------------- */

interface ShareBarProps {
  label: string;
  value: string;
  /** 0–100 */
  share: number;
  color: string;
  sub?: string;
}

export function ShareBar({ label, value, share, color, sub }: ShareBarProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm },
        dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color },
        label: {
          flex: 1,
          minWidth: 0,
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
        },
        share: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, color: colors.text },
        value: { fontSize: Typography.fontSize.xs, color: colors.textSecondary },
        track: {
          height: 8,
          backgroundColor: colors.lighterGray,
          borderRadius: Layout.borderRadius.full,
          marginTop: Layout.spacing.xs + 2,
          overflow: 'hidden',
        },
        fill: { height: 8, borderRadius: Layout.borderRadius.full, backgroundColor: color },
        sub: { fontSize: Typography.fontSize.xs, color: colors.muted, marginTop: 3 },
      }),
    [colors, color]
  );

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.dot} />
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.share}>{share.toFixed(1).replace(/\.0$/, '')}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.max(share > 0 ? 2 : 0, share))}%` }]} />
      </View>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

/* -------------------------------------------------------------------------
 * MetricTile — compact KPI (label / big value / optional caption)
 * ---------------------------------------------------------------------- */

interface MetricTileProps {
  label: string;
  value: string;
  caption?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
  style?: ViewStyle;
}

export function MetricTile({ label, value, caption, icon, accent, style }: MetricTileProps) {
  const colors = useColors();
  const tint = accent || colors.primary;
  return (
    <View
      style={[
        {
          flex: 1,
          minWidth: 0,
          backgroundColor: colors.surfaceAlt,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
          gap: 2,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {icon && <Ionicons name={icon} size={13} color={tint} />}
        <Text
          style={{ fontSize: Typography.fontSize.xxs, color: colors.textSecondary, fontWeight: Typography.fontWeight.semibold, letterSpacing: 0.3 }}
          numberOfLines={1}
        >
          {label.toUpperCase()}
        </Text>
      </View>
      <Text
        style={{ fontSize: Typography.fontSize.lg, lineHeight: Typography.leading.lg, fontWeight: Typography.fontWeight.extrabold, color: colors.text }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {!!caption && (
        <Text style={{ fontSize: Typography.fontSize.xxs, color: colors.muted }} numberOfLines={1}>
          {caption}
        </Text>
      )}
    </View>
  );
}
