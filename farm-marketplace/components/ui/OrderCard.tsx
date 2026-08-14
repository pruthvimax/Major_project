import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Badge, { BadgeTone } from './Badge';

export interface OrderMetaRow {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

interface OrderCardProps {
  /** Short reference shown in the card header, e.g. "#A1B2C3". */
  reference: string;
  title?: string;
  date?: string;
  statusLabel?: string;
  statusTone?: BadgeTone;
  rows?: OrderMetaRow[];
  totalLabel?: string;
  total?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function OrderCard({
  reference,
  title,
  date,
  statusLabel,
  statusTone = 'neutral',
  rows,
  totalLabel = 'Total',
  total,
  actions,
  children,
  onPress,
  style,
}: OrderCardProps) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.md,
          ...Layout.shadow.sm,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
        },
        reference: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        title: {
          fontSize: Typography.fontSize.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        date: {
          fontSize: Typography.fontSize.xs,
          color: colors.muted,
          marginTop: 2,
        },
        rows: {
          marginTop: Layout.spacing.md,
          gap: Layout.spacing.sm,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
        },
        rowLabel: {
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
          flexShrink: 0,
        },
        rowValue: {
          flex: 1,
          fontSize: Typography.fontSize.sm,
          color: colors.text,
          fontWeight: Typography.fontWeight.medium,
          textAlign: 'right',
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          marginTop: Layout.spacing.md,
          paddingTop: Layout.spacing.md,
        },
        totalLabel: {
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
        },
        total: {
          fontSize: Typography.fontSize.xl,
          lineHeight: Typography.leading.xl,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.primary,
        },
        actions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          flexShrink: 1,
        },
      }),
    [colors]
  );

  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper style={[styles.card, style]} {...(onPress ? { onPress, activeOpacity: 0.92 } : {})}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reference} numberOfLines={1}>
            {reference}
          </Text>
          {!!title && (
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          )}
          {!!date && <Text style={styles.date}>{date}</Text>}
        </View>
        {!!statusLabel && <Badge label={statusLabel} tone={statusTone} size="md" />}
      </View>

      {!!rows?.length && (
        <View style={styles.rows}>
          {rows.map((row, idx) => (
            <View key={`${row.label}-${idx}`} style={styles.row}>
              {row.icon && <Ionicons name={row.icon} size={14} color={colors.muted} />}
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {children}

      {(total !== undefined || actions) && (
        <View style={styles.footer}>
          {total !== undefined ? (
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.totalLabel}>{totalLabel}</Text>
              <Text style={styles.total} numberOfLines={1}>
                {total}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {!!actions && <View style={styles.actions}>{actions}</View>}
        </View>
      )}
    </Wrapper>
  );
}
