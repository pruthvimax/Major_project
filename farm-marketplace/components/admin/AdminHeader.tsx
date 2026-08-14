import React, { useMemo } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader, { HeaderAction } from '../ui/ScreenHeader';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onRefresh?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}

/**
 * Admin screen header. Thin wrapper over the shared <ScreenHeader/> so the
 * admin panel picks up the app-wide spacing, typography and safe-area
 * handling. Public props are unchanged.
 */
export default function AdminHeader({
  title,
  subtitle,
  onBack,
  onRefresh,
  rightIcon,
  onRightPress,
}: AdminHeaderProps) {
  const iconActions = useMemo(() => {
    const actions: HeaderAction[] = [];
    if (onRefresh) {
      actions.push({
        icon: 'refresh-outline',
        onPress: onRefresh,
        accessibilityLabel: 'Refresh',
      });
    }
    if (rightIcon && onRightPress) {
      actions.push({
        icon: rightIcon,
        onPress: onRightPress,
        accessibilityLabel: 'More actions',
      });
    }
    return actions;
  }, [onRefresh, rightIcon, onRightPress]);

  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      align="left"
      onBack={onBack || (() => router.replace('/admin'))}
      iconActions={iconActions}
    />
  );
}
