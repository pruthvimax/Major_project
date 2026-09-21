import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import Typography from '../../constants/Typography';
import { Badge, Button } from '../ui';
import type { TransactionRecord } from '../../types/transaction.types';
import { fetchTransactionDetail, formatTxDateTime } from '../../services/transactions';
import { logApiError } from '../../services/apiError';
import { TYPE_ICONS, statusTone, escrowTone, formatEscrow, formatPaymentMethod } from './TransactionCard';

interface TransactionDetailModalProps {
  transaction: TransactionRecord | null;
  onClose: () => void;
}

export default function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  const colors = useColors();
  const [detail, setDetail] = useState<TransactionRecord | null>(transaction);
  const [loadingBlock, setLoadingBlock] = useState(false);
  const [copied, setCopied] = useState(false);

  // Keep the modal in sync with the tapped card, then enrich it with the
  // block number (the detail endpoint reads the receipt from the chain).
  useEffect(() => {
    let cancelled = false;
    const hydrate = async (tx: TransactionRecord) => {
      setLoadingBlock(true);
      try {
        const fresh = await fetchTransactionDetail(tx.txHash);
        if (!cancelled && fresh) setDetail(fresh);
      } catch (error) {
        logApiError('Transaction detail', error);
      } finally {
        if (!cancelled) setLoadingBlock(false);
      }
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetail(transaction);
    setCopied(false);
    if (transaction && transaction.blockNumber === null) {
      hydrate(transaction);
    }
    return () => {
      cancelled = true;
    };
  }, [transaction]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: colors.card,
          borderTopLeftRadius: Layout.borderRadius.xxl,
          borderTopRightRadius: Layout.borderRadius.xxl,
          maxHeight: '88%',
          paddingBottom: Layout.spacing.xl,
          ...Layout.shadow.lg,
        },
        grabber: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.borderStrong,
          marginTop: Layout.spacing.sm,
          marginBottom: Layout.spacing.sm,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.md,
          paddingHorizontal: Layout.spacing.lg,
          paddingBottom: Layout.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        iconWell: {
          width: 48,
          height: 48,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerText: { flex: 1, minWidth: 0 },
        title: {
          fontSize: Typography.fontSize.xl,
          lineHeight: Typography.leading.xl,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        subtitle: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
        },
        closeBtn: {
          width: Layout.touchTarget,
          height: Layout.touchTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: Layout.borderRadius.full,
          backgroundColor: colors.surfaceAlt,
        },
        body: {
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.md,
        },
        hashBox: {
          backgroundColor: colors.primaryTint,
          borderWidth: 1,
          borderColor: colors.primarySoft,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.md,
        },
        hashLabel: {
          fontSize: Typography.fontSize.xxs,
          letterSpacing: Typography.letterSpacing.wider,
          textTransform: 'uppercase',
          color: colors.muted,
          fontWeight: Typography.fontWeight.semibold,
          marginBottom: Layout.spacing.xs,
        },
        hashValue: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.sm,
          color: colors.primary,
          fontWeight: Typography.fontWeight.bold,
          fontFamily: Layout.isIOS ? 'Menlo' : 'monospace',
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        rowLabel: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          flexShrink: 0,
        },
        rowValue: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.text,
          fontWeight: Typography.fontWeight.semibold,
          flex: 1,
          textAlign: 'right',
        },
        mono: {
          fontFamily: Layout.isIOS ? 'Menlo' : 'monospace',
          fontWeight: Typography.fontWeight.medium,
          fontSize: Typography.fontSize.xs,
        },
        badgesRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: Layout.spacing.sm,
          marginVertical: Layout.spacing.md,
        },
        actions: {
          marginTop: Layout.spacing.lg,
          gap: Layout.spacing.sm,
        },
        copiedNote: {
          textAlign: 'center',
          fontSize: Typography.fontSize.xs,
          color: colors.success,
          fontWeight: Typography.fontWeight.semibold,
        },
      }),
    [colors]
  );

  const handleCopy = async () => {
    if (!detail) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(detail.txHash);
      } else {
        await Clipboard.setStringAsync(detail.txHash);
      }
      setCopied(true);
    } catch (error) {
      logApiError('Copy transaction hash', error);
    }
  };

  const renderRow = (label: string, value: React.ReactNode, mono = false) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={2} ellipsizeMode="middle">
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );

  const visible = transaction !== null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} accessibilityLabel="Close details" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          {detail && (
            <>
              <View style={styles.header}>
                <View style={styles.iconWell}>
                  <Ionicons name={TYPE_ICONS[detail.type]} size={24} color={colors.primary} />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.title} numberOfLines={1}>
                    {detail.typeLabel}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {detail.orderNumber ? `Order ${detail.orderNumber}` : detail.productName || 'On-chain record'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                <View style={styles.hashBox}>
                  <Text style={styles.hashLabel}>Transaction Hash</Text>
                  <Text style={styles.hashValue} selectable>
                    {detail.txHash}
                  </Text>
                </View>

                <View style={styles.badgesRow}>
                  <Badge label={`Status: ${detail.blockchainStatus.toUpperCase()}`} tone={statusTone(detail.blockchainStatus)} icon="link-outline" />
                  <Badge
                    label={`Escrow: ${formatEscrow(detail.escrowStatus)}`}
                    tone={escrowTone(detail.escrowStatus)}
                    icon="shield-checkmark-outline"
                  />
                </View>

                {renderRow(
                  'Block Number',
                  detail.blockNumber !== null ? `#${detail.blockNumber}` : loadingBlock ? 'Fetching…' : 'Not available'
                )}
                {renderRow('Transaction Type', detail.typeLabel)}
                {renderRow('Order Number', detail.orderNumber || '—')}
                {renderRow('Product', detail.productName || '—')}
                {detail.blockchainOrderId !== null && renderRow('On-Chain Escrow ID', `#${detail.blockchainOrderId}`)}
                {detail.blockchainProductId !== null && renderRow('On-Chain Product ID', `#${detail.blockchainProductId}`)}
                {renderRow('Buyer', detail.buyerName || '—')}
                {renderRow('Buyer Wallet', detail.buyerWallet || '—', true)}
                {renderRow('Farmer', detail.farmerName || '—')}
                {renderRow('Farmer Wallet', detail.farmerWallet || '—', true)}
                {renderRow('Amount', `₹${detail.amount.toFixed(2)}  (≈ ${detail.amountEth} ETH)`)}
                {renderRow('Payment Method', formatPaymentMethod(detail.paymentMethod))}
                {renderRow('From', detail.fromAddress || '—', true)}
                {renderRow('To', detail.toAddress || '—', true)}
                {renderRow('Timestamp', formatTxDateTime(detail.createdAt))}
                {detail.confirmedAt && renderRow('Confirmed At', formatTxDateTime(detail.confirmedAt))}

                <View style={styles.actions}>
                  <Button
                    title={copied ? 'Copied!' : 'Copy Transaction Hash'}
                    icon={copied ? 'checkmark-circle-outline' : 'copy-outline'}
                    onPress={handleCopy}
                  />
                  {copied && <Text style={styles.copiedNote}>Transaction hash copied to clipboard</Text>}
                  <Button title="Close" variant="outline" onPress={onClose} />
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
