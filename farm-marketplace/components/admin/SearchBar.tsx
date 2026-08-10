import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Search...' }: SearchBarProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          padding: Layout.spacing.md,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        wrapper: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.lighterGray,
          borderRadius: Layout.borderRadius.md,
          paddingHorizontal: Layout.spacing.md,
          height: 44,
          borderWidth: 1,
          borderColor: colors.border,
        },
        icon: {
          marginRight: Layout.spacing.sm,
        },
        input: {
          flex: 1,
          fontSize: Typography.fontSize.sm,
          color: colors.black,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <Ionicons name="search" size={20} color={colors.gray} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.gray}
          value={value}
          onChangeText={onChangeText}
        />
        {value.length > 0 && (
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.gray}
            onPress={() => onChangeText('')}
          />
        )}
      </View>
    </View>
  );
}