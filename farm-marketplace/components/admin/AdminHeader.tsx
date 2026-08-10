import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onRefresh?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}

export default function AdminHeader({
  title,
  subtitle,
  onBack,
  onRefresh,
  rightIcon,
  onRightPress,
}: AdminHeaderProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Platform.OS === 'android' ? 40 : 20,
          paddingBottom: Layout.spacing.md,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        leftSection: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        backButton: {
          padding: Layout.spacing.xs,
          marginRight: Layout.spacing.sm,
        },
        titleContainer: {
          flex: 1,
        },
        headerTitle: {
          fontSize: Typography.fontSize.lg,
          fontWeight: Typography.fontWeight.bold,
          color: colors.black,
        },
        headerSubtitle: {
          fontSize: Typography.fontSize.xs,
          color: colors.gray,
          marginTop: 2,
        },
        rightButton: {
          padding: Layout.spacing.xs,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        <TouchableOpacity
          onPress={onBack || (() => router.replace('/admin'))}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.admin} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.backButton}>
            <Ionicons name="refresh" size={20} color={colors.admin} />
          </TouchableOpacity>
        )}
        {rightIcon && onRightPress && (
          <TouchableOpacity onPress={onRightPress} style={styles.backButton}>
            <Ionicons name={rightIcon} size={22} color={colors.admin} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}