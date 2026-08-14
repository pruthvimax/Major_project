import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import useColors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import SearchField from '../ui/SearchField';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/**
 * Admin search bar. Delegates to the shared <SearchField/> and keeps the
 * surrounding toolbar surface the admin list screens rely on.
 */
export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
}: SearchBarProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.md,
          paddingBottom: Layout.spacing.md,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <SearchField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
      />
    </View>
  );
}
