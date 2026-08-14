import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Button from './Button';

/**
 * Turns any thrown value (Axios error, JS Error, string) into a short,
 * user-friendly sentence. Raw status codes, stack traces and backend
 * payloads never reach the screen.
 */
export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const err = error as any;

  if (err?.message === 'Network Error' || (!err?.response && err?.request)) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  if (err?.code === 'ECONNABORTED') {
    return 'The request took too long. Please try again.';
  }

  const status: number | undefined = err?.response?.status;
  const serverMessage: unknown = err?.response?.data?.message;

  if (typeof serverMessage === 'string' && serverMessage.trim().length > 0 && serverMessage.length < 160) {
    return serverMessage;
  }

  switch (status) {
    case 400:
      return 'Some of the details are not valid. Please review and try again.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'That action conflicts with the current state. Please refresh and retry.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      if (status && status >= 500) {
        return 'The server ran into a problem. Please try again shortly.';
      }
  }

  if (typeof error === 'string' && error.length < 160) return error;
  return fallback;
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
  style?: ViewStyle;
}

export default function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again in a moment.',
  onRetry,
  retryLabel = 'Try again',
  icon = 'cloud-offline-outline',
  compact = false,
  style,
}: ErrorStateProps) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flex: compact ? 0 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: Layout.spacing.xl,
        },
        iconWrap: {
          width: 76,
          height: 76,
          borderRadius: 38,
          backgroundColor: colors.errorSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Layout.spacing.md,
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
          marginTop: Layout.spacing.xs,
          maxWidth: 300,
        },
      }),
    [colors, compact]
  );

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={34} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title={retryLabel}
          onPress={onRetry}
          variant="outline"
          size="sm"
          icon="refresh-outline"
          fullWidth={false}
          style={{ marginTop: Layout.spacing.lg }}
        />
      )}
    </View>
  );
}
