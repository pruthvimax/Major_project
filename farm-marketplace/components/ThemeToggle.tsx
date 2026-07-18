import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import useColors from '../constants/Colors';

export default function ThemeToggle() {
  const { toggleTheme, isDark } = useTheme();
  const colors = useColors();

  return (
    <TouchableOpacity 
      onPress={toggleTheme} 
      style={styles.container}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={isDark ? 'sunny' : 'moon'} 
        size={24} 
        color={colors.text} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 20,
  },
});
