import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

export interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
  color?: string;
  accessibilityLabel?: string;
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  iconActions?: HeaderAction[];
  /** Renders a flat header that blends into the page background. */
  transparent?: boolean;
  align?: 'left' | 'center';
  style?: ViewStyle;
}

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  actions,
  iconActions,
  transparent = false,
  align = 'center',
  style,
}: ScreenHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingTop: Math.max(insets.top, Layout.isAndroid ? Layout.statusBarHeight : 0) + Layout.spacing.sm,
          paddingBottom: Layout.spacing.md,
          paddingHorizontal: Layout.spacing.lg,
          backgroundColor: transparent ? colors.transparent : colors.card,
          borderBottomWidth: transparent ? 0 : 1,
          borderBottomColor: colors.border,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: Layout.touchTarget,
        },
        iconBtn: {
          width: 40,
          height: 40,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: transparent ? colors.card : colors.surfaceAlt,
        },
        titleWrap: {
          flex: 1,
          paddingHorizontal: Layout.spacing.sm,
          alignItems: align === 'center' ? 'center' : 'flex-start',
        },
        title: {
          fontSize: Typography.fontSize.lg,
          lineHeight: Typography.leading.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          textAlign: align === 'center' ? 'center' : 'left',
        },
        subtitle: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          marginTop: 2,
          textAlign: align === 'center' ? 'center' : 'left',
        },
        right: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs,
          minWidth: onBack ? 40 : 0,
          justifyContent: 'flex-end',
        },
        badge: {
          position: 'absolute',
          top: 2,
          right: 2,
          minWidth: 17,
          height: 17,
          paddingHorizontal: 4,
          borderRadius: 9,
          backgroundColor: colors.error,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: colors.card,
        },
        badgeText: {
          color: '#FFFFFF',
          fontSize: 9,
          fontWeight: Typography.fontWeight.bold,
        },
      }),
    [colors, insets.top, transparent, align, onBack]
  );

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: actions || iconActions?.length ? 0 : 0 }} />
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.right}>
          {iconActions?.map((action, idx) => (
            <TouchableOpacity
              key={`${action.icon}-${idx}`}
              onPress={action.onPress}
              style={styles.iconBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel || action.icon}
            >
              <Ionicons name={action.icon} size={20} color={action.color || colors.text} />
              {!!action.badge && action.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {action.badge > 99 ? '99+' : action.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          {actions}
        </View>
      </View>
    </View>
  );
}
