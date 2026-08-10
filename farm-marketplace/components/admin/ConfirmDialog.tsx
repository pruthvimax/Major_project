import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

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
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Layout.spacing.xl,
        },
        dialog: {
          backgroundColor: colors.card,
          borderRadius: Layout.borderRadius.lg,
          padding: Layout.spacing.xl,
          width: '100%',
          maxWidth: 400,
          alignItems: 'center',
        },
        iconWrap: {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: destructive ? '#FFEBEE' : colors.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Layout.spacing.md,
        },
        title: {
          fontSize: Typography.fontSize.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.black,
          textAlign: 'center',
        },
        message: {
          fontSize: Typography.fontSize.sm,
          color: colors.gray,
          textAlign: 'center',
          marginTop: Layout.spacing.sm,
          lineHeight: 20,
        },
        buttonRow: {
          flexDirection: 'row',
          marginTop: Layout.spacing.xl,
          gap: Layout.spacing.sm,
          width: '100%',
        },
        button: {
          flex: 1,
          paddingVertical: Layout.spacing.md,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        cancelButton: {
          backgroundColor: colors.lighterGray,
          borderWidth: 1,
          borderColor: colors.border,
        },
        confirmButton: {
          backgroundColor: destructive ? '#C62828' : colors.primary,
        },
        cancelText: {
          color: colors.black,
          fontWeight: Typography.fontWeight.semibold,
          fontSize: Typography.fontSize.sm,
        },
        confirmText: {
          color: colors.white,
          fontWeight: Typography.fontWeight.semibold,
          fontSize: Typography.fontSize.sm,
        },
      }),
    [colors, destructive]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={icon}
              size={32}
              color={destructive ? '#C62828' : colors.primary}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}