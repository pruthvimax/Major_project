import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import Typography from '../../constants/Typography';
import { Card, Badge } from '../ui';
import type { BadgeTone } from '../ui';
import type { TransactionRecord, TransactionType } from '../../types/transaction.types';
import { shortenHash, formatTxDateTime } from '../../services/transactions';

interface TransactionCardProps {
  transaction: TransactionRecord;
  onPress: (transaction: TransactionRecord) => void;
}

type IoniconName = keyof typeof Ionicons.glyphMap;

export const TYPE_ICONS: Record<TransactionType, IoniconName> = {
  product_registration: 'leaf-outline',
  escrow_created: 'lock-closed-outline',
  payment_released: 'cash-outline',
  refund_issued: 'return-down-back-outline',
  order_cancelled: 'close-circle-outline',
};

export const statusTone = (status: string): BadgeTone => {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'neutral';
  }
};

export const escrowTone = (status: string): BadgeTone => {
  switch (status) {
    case 'locked':
      return 'info';
    case 'released':
      return 'success';
    case 'refunded':
      return 'warning';
    case 'failed':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'neutral';
  }
};

export const formatEscrow = (status: string): string => {
  if (!status || status === 'none') return 'None';
  if (status === 'n/a') return 'N/A';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const formatPaymentMethod = (method: string): string =>
  (method || 'blockchain').replace(/_/g, ' ').toUpperCase();

export default function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const colors = useColors();

  const accent = useMemo(() => {
    switch (transaction.type) {
      case 'product_registration':
        return { tint: colors.primarySoft, color: colors.primary };
      case 'escrow_created':
        return { tint: colors.tintBlue, color: colors.info };
      case 'payment_released':
        return { tint: colors.successSoft, color: colors.success };
      case 'refund_issued':
        return { tint: colors.tintAmber, color: colors.warning };
      case 'order_cancelled':
      default:
        return { tint: colors.errorSoft, color: colors.error };
    }
  }, [transaction.type, colors]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginBottom: Layout.spacing.md,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.md,
        },
        iconWell: {
          width: 44,
          height: 44,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerText: {
          flex: 1,
          minWidth: 0,
        },
        typeLabel: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        hash: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          fontFamily: Layout.isIOS ? 'Menlo' : 'monospace',
        },
        divider: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: Layout.spacing.md,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          rowGap: Layout.spacing.sm,
        },
        cell: {
          width: '50%',
          paddingRight: Layout.spacing.sm,
        },
        cellFull: {
          width: '100%',
        },
        label: {
          fontSize: Typography.fontSize.xxs,
          lineHeight: Typography.leading.xs,
          letterSpacing: Typography.letterSpacing.wider,
          textTransform: 'uppercase',
          color: colors.muted,
          fontWeight: Typography.fontWeight.semibold,
        },
        value: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.text,
          fontWeight: Typography.fontWeight.medium,
        },
        amount: {
          fontSize: Typography.fontSize.lg,
          lineHeight: Typography.leading.lg,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.primary,
        },
        amountEth: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: Layout.spacing.md,
          gap: Layout.spacing.sm,
        },
        badges: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: Layout.spacing.xs,
          flex: 1,
        },
        date: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
        },
        tapHint: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
        },
      }),
    [colors]
  );

  return (
    <Card onPress={() => onPress(transaction)} style={styles.card} elevation="sm">
      <View style={styles.header}>
        <View style={[styles.iconWell, { backgroundColor: accent.tint }]}>
          <Ionicons name={TYPE_ICONS[transaction.type]} size={22} color={accent.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.typeLabel} numberOfLines={1}>
            {transaction.typeLabel}
          </Text>
          <Text style={styles.hash} numberOfLines={1}>
            {shortenHash(transaction.txHash, 10, 8)}
          </Text>
        </View>
        <Badge label={transaction.blockchainStatus.toUpperCase()} tone={statusTone(transaction.blockchainStatus)} size="sm" />
      </View>

      <View style={styles.divider} />

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={styles.label}>Order</Text>
          <Text style={styles.value} numberOfLines={1}>
            {transaction.orderNumber || '—'}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Product</Text>
          <Text style={styles.value} numberOfLines={1}>
            {transaction.productName || '—'}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Buyer</Text>
          <Text style={styles.value} numberOfLines={1}>
            {transaction.buyerName || '—'}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Farmer</Text>
          <Text style={styles.value} numberOfLines={1}>
            {transaction.farmerName || '—'}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.amount}>₹{transaction.amount.toFixed(2)}</Text>
          <Text style={styles.amountEth}>≈ {transaction.amountEth} ETH on-chain</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Payment</Text>
          <Text style={styles.value}>{formatPaymentMethod(transaction.paymentMethod)}</Text>
        </View>
        <View style={styles.cellFull}>
          <Text style={styles.label}>Wallet</Text>
          <Text style={[styles.value, styles.hash]} numberOfLines={1}>
            {shortenHash(transaction.walletAddress, 12, 8)}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.badges}>
          <Badge
            label={`Escrow: ${formatEscrow(transaction.escrowStatus)}`}
            tone={escrowTone(transaction.escrowStatus)}
            icon="shield-checkmark-outline"
            size="sm"
          />
        </View>
        <View style={styles.tapHint}>
          <Text style={styles.date}>{formatTxDateTime(transaction.createdAt)}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </View>
      </View>
    </Card>
  );
}
