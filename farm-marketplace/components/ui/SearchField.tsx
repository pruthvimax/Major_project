import React, { useMemo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  style?: ViewStyle;
  autoFocus?: boolean;
}

export default function SearchField({
  value,
  onChangeText,
  placeholder = 'Search…',
  onFilterPress,
  style,
  autoFocus,
}: SearchFieldProps) {
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: Layout.borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: Layout.spacing.md,
          height: 50,
          ...Layout.shadow.xs,
        },
        input: {
          flex: 1,
          marginLeft: Layout.spacing.sm,
          fontSize: Typography.fontSize.md,
          color: colors.text,
          paddingVertical: 0,
        },
        divider: {
          width: 1,
          height: 22,
          backgroundColor: colors.border,
          marginHorizontal: Layout.spacing.sm,
        },
      }),
    [colors]
  );

  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search-outline" size={20} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={19} color={colors.muted} />
        </TouchableOpacity>
      )}
      {onFilterPress && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity
            onPress={onFilterPress}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Filters"
          >
            <Ionicons name="options-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
