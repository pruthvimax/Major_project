import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import useColors from '../constants/Colors';
import Layout from '../constants/Layout';

export default function ThemeToggle() {
  const { toggleTheme, isDark } = useTheme();
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: 40,
          height: 40,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
        },
      }),
    [colors]
  );

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={styles.container}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.text} />
    </TouchableOpacity>
  );
}
