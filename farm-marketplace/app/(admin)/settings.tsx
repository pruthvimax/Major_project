import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useTheme } from '../../context/ThemeContext';

export default function AdminSettingsScreen() {
  const colors = useColors();
  const { isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  backButton: {
    padding: Layout.spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
  },
  scrollContent: {
    padding: Layout.spacing.md,
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
    marginBottom: Layout.spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.black,
    marginBottom: Layout.spacing.xs,
  },
  input: {
    backgroundColor: colors.lighterGray,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Layout.borderRadius.sm,
    height: 48,
    paddingHorizontal: Layout.spacing.md,
    fontSize: Typography.fontSize.sm,
    color: colors.black,
    marginBottom: Layout.spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextCol: {
    flex: 1,
    marginRight: Layout.spacing.md,
  },
  switchLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.black,
  },
  switchDesc: {
    fontSize: Typography.fontSize.xs,
    color: colors.gray,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: colors.admin,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.xxl,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: Typography.fontSize.md,
  },
}), [colors]);
  const [ethNode, setEthNode] = useState('http://127.0.0.1:8545');
  const [gasLimit, setGasLimit] = useState('3000000');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    }
  };

  const handleSave = () => {
    showAlert('Success', 'Admin settings updated successfully!');
    router.replace('/(admin)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(admin)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.admin} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchLabel}>Dark Mode</Text>
                <Text style={styles.switchDesc}>
                  {isDark ? 'Using dark theme' : 'Using light theme'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => toggleTheme()}
                trackColor={{ false: '#767577', true: colors.admin }}
              />
            </View>
          </View>
        </View>

        {/* Blockchain Config */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⛓️ Blockchain Network Configurations</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Local JSON-RPC Ethereum Node URL</Text>
            <TextInput
              style={styles.input}
              value={ethNode}
              onChangeText={setEthNode}
              placeholder="e.g. http://127.0.0.1:8545"
              placeholderTextColor={colors.gray}
            />

            <Text style={styles.label}>Default Gas Limit</Text>
            <TextInput
              style={styles.input}
              value={gasLimit}
              onChangeText={setGasLimit}
              placeholder="e.g. 3000000"
              placeholderTextColor={colors.gray}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Global Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Global App Settings</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchLabel}>Maintenance Mode</Text>
                <Text style={styles.switchDesc}>Puts the mobile app in read-only maintenance mode</Text>
              </View>
              <Switch
                value={maintenanceMode}
                onValueChange={setMaintenanceMode}
                trackColor={{ false: '#767577', true: colors.admin }}
              />
            </View>

            <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Layout.spacing.md, marginTop: Layout.spacing.md }]}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchLabel}>System Email Notifications</Text>
                <Text style={styles.switchDesc}>Sends emails to farmers on new order placement</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#767577', true: colors.admin }}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Configurations</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

