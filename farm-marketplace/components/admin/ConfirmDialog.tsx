import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Button from '../ui/Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  icon = 'alert-circle-outline',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: Layout.spacing.xl,
        },
        dialog: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.xl,
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.xl,
          paddingBottom: Layout.spacing.lg,
          width: '100%',
          maxWidth: 400,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          ...Layout.shadow.lg,
        },
        iconOuter: {
          width: 76,
          height: 76,
          borderRadius: 38,
          backgroundColor: destructive ? colors.errorSoft : colors.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Layout.spacing.md,
        },
        iconInner: {
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: destructive ? colors.errorSoft : colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        title: {
          fontSize: Typography.fontSize.lg,
          lineHeight: Typography.leading.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
        },
        message: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: Layout.spacing.xs + 2,
        },
        buttonRow: {
          flexDirection: 'row',
          marginTop: Layout.spacing.xl,
          gap: Layout.spacing.sm,
          width: '100%',
        },
        buttonSlot: {
          flex: 1,
          minWidth: 0,
        },
      }),
    [colors, destructive]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Ionicons
                name={icon}
                size={28}
                color={destructive ? colors.error : colors.primary}
              />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            <Button
              title={cancelLabel}
              onPress={onCancel}
              variant="outline"
              size="md"
              disabled={loading}
              style={styles.buttonSlot}
            />
            <Button
              title={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'danger' : 'primary'}
              size="md"
              loading={loading}
              disabled={loading}
              style={styles.buttonSlot}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
