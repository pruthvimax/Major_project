import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { gradients } from '../../constants/ThemeColors';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
}

const SIZES: Record<ButtonSize, { height: number; font: number; icon: number; px: number }> = {
  sm: { height: 38, font: Typography.fontSize.sm, icon: 16, px: Layout.spacing.md },
  md: { height: 48, font: Typography.fontSize.md, icon: 18, px: Layout.spacing.lg },
  lg: { height: 56, font: Typography.fontSize.md, icon: 20, px: Layout.spacing.xl },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
}: ButtonProps) {
  const colors = useColors();
  const dim = SIZES[size];
  const isDisabled = disabled || loading;

  const palette = useMemo(() => {
    switch (variant) {
      case 'secondary':
        return { bg: colors.secondary, fg: colors.white, border: colors.secondary };
      case 'outline':
        return { bg: colors.transparent, fg: colors.primary, border: colors.primary };
      case 'ghost':
        return { bg: colors.primarySoft, fg: colors.primary, border: colors.transparent };
      case 'danger':
        return { bg: colors.error, fg: colors.white, border: colors.error };
      default:
        return { bg: colors.primary, fg: colors.white, border: colors.primary };
    }
  }, [variant, colors]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          height: dim.height,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          paddingHorizontal: dim.px,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: palette.border,
          backgroundColor: variant === 'primary' ? colors.transparent : palette.bg,
          overflow: 'hidden',
        },
        gradient: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: Layout.borderRadius.md,
        },
        label: {
          fontSize: dim.font,
          fontWeight: Typography.fontWeight.bold,
          color: palette.fg,
          letterSpacing: 0.2,
          textAlign: 'center',
        },
        content: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Layout.spacing.sm,
        },
        disabled: {
          opacity: 0.5,
        },
        elevated:
          variant === 'primary' || variant === 'secondary' || variant === 'danger'
            ? Layout.shadow.sm
            : {},
      }),
    [colors, dim, palette, variant, fullWidth]
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, styles.elevated, isDisabled && styles.disabled, style]}
    >
      {variant === 'primary' && (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      )}
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={dim.icon} color={palette.fg} />
          )}
          <Text style={[styles.label, textStyle]} numberOfLines={1}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={dim.icon} color={palette.fg} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
