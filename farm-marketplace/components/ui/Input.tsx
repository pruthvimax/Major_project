import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  hint?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  /** Adds a show/hide toggle for password fields. */
  passwordToggle?: boolean;
  rightAdornment?: React.ReactNode;
}

export default function Input({
  label,
  icon,
  error,
  hint,
  required,
  containerStyle,
  passwordToggle,
  rightAdornment,
  style,
  multiline,
  secureTextEntry,
  ...rest
}: InputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: Layout.spacing.md },
        label: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
          marginBottom: Layout.spacing.xs + 2,
        },
        required: { color: colors.error },
        field: {
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          backgroundColor: colors.input,
          borderRadius: Layout.borderRadius.md,
          borderWidth: 1.5,
          borderColor: error
            ? colors.error
            : focused
            ? colors.primary
            : colors.border,
          paddingHorizontal: Layout.spacing.md,
          minHeight: multiline ? 96 : 52,
          paddingVertical: multiline ? Layout.spacing.sm + 2 : 0,
        },
        icon: {
          marginRight: Layout.spacing.sm,
          marginTop: multiline ? 2 : 0,
        },
        input: {
          flex: 1,
          fontSize: Typography.fontSize.md,
          color: colors.text,
          paddingVertical: multiline ? 0 : Layout.spacing.sm,
          textAlignVertical: multiline ? 'top' : 'center',
          minHeight: multiline ? 72 : undefined,
        },
        message: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          marginTop: Layout.spacing.xs,
        },
        errorText: { color: colors.error },
        hintText: { color: colors.textSecondary },
      }),
    [colors, focused, error, multiline]
  );

  return (
    <View style={[styles.wrap, containerStyle]}>
      {!!label && (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      )}
      <View style={styles.field}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? colors.error : focused ? colors.primary : colors.muted}
            style={styles.icon}
          />
        )}
        <TextInput
          {...rest}
          multiline={multiline}
          secureTextEntry={passwordToggle ? hidden : secureTextEntry}
          placeholderTextColor={colors.muted}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {passwordToggle && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.muted}
            />
          </TouchableOpacity>
        )}
        {rightAdornment}
      </View>
      {!!error && <Text style={[styles.message, styles.errorText]}>{error}</Text>}
      {!error && !!hint && <Text style={[styles.message, styles.hintText]}>{hint}</Text>}
    </View>
  );
}
