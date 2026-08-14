import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useTheme } from '../../context/ThemeContext';
import {
  ScreenHeader,
  Card,
  Input,
  Button,
  SectionHeader,
} from '../../components/ui';

export default function AdminSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  section: {
    marginBottom: Layout.spacing.xl,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    minHeight: Layout.touchTarget,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextCol: {
    flex: 1,
    minWidth: 0,
  },
  settingLabel: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.leading.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.text,
  },
  settingDesc: {
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.leading.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: Layout.spacing.md,
  },
  footer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    router.replace('/admin');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="System Settings"
        onBack={() => router.replace('/admin')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <View style={styles.section}>
          <SectionHeader title="Appearance" />
          <Card elevation="xs">
            <View style={styles.settingRow}>
              <View style={[styles.iconWell, { backgroundColor: colors.tintPurple }]}>
                <Ionicons
                  name={isDark ? 'moon-outline' : 'sunny-outline'}
                  size={20}
                  color={colors.admin}
                />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDesc}>
                  {isDark ? 'Using dark theme' : 'Using light theme'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => toggleTheme()}
                trackColor={{ false: colors.borderStrong, true: colors.primaryLight }}
                thumbColor={isDark ? colors.primary : colors.white}
              />
            </View>
          </Card>
        </View>

        {/* Blockchain Config */}
        <View style={styles.section}>
          <SectionHeader title="Blockchain Network Configurations" />
          <Card elevation="xs">
            <Input
              label="Local JSON-RPC Ethereum Node URL"
              icon="globe-outline"
              value={ethNode}
              onChangeText={setEthNode}
              placeholder="e.g. http://127.0.0.1:8545"
              autoCapitalize="none"
            />

            <Input
              label="Default Gas Limit"
              icon="speedometer-outline"
              value={gasLimit}
              onChangeText={setGasLimit}
              placeholder="e.g. 3000000"
              keyboardType="numeric"
              containerStyle={{ marginBottom: 0 }}
            />
          </Card>
        </View>

        {/* Global Controls */}
        <View style={styles.section}>
          <SectionHeader title="Global App Settings" />
          <Card elevation="xs">
            <View style={styles.settingRow}>
              <View style={[styles.iconWell, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="construct-outline" size={20} color={colors.warning} />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Maintenance Mode</Text>
                <Text style={styles.settingDesc}>
                  Puts the mobile app in read-only maintenance mode
                </Text>
              </View>
              <Switch
                value={maintenanceMode}
                onValueChange={setMaintenanceMode}
                trackColor={{ false: colors.borderStrong, true: colors.primaryLight }}
                thumbColor={maintenanceMode ? colors.primary : colors.white}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={[styles.iconWell, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>System Email Notifications</Text>
                <Text style={styles.settingDesc}>
                  Sends emails to farmers on new order placement
                </Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.borderStrong, true: colors.primaryLight }}
                thumbColor={notifications ? colors.primary : colors.white}
              />
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Layout.spacing.md) + Layout.spacing.sm }]}>
        <Button title="Save Configurations" onPress={handleSave} size="lg" icon="save-outline" />
      </View>
    </View>
  );
}
