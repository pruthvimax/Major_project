import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { gradients } from '../../constants/ThemeColors';
import { Button, Input } from '../../components/ui';
import api from '../../services/api';
import { getApiErrorMessage, logApiError } from '../../services/apiError';
import ThemeToggle from '../../components/ThemeToggle';

type Role = 'farmer' | 'buyer';

const ROLE_ICONS: Record<Role, keyof typeof Ionicons.glyphMap> = {
  farmer: 'leaf-outline',
  buyer: 'basket-outline',
};

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<Role>('farmer');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: 0,
    },
    hero: {
      paddingTop: insets.top + Layout.spacing.md,
      paddingHorizontal: Layout.spacing.xl,
      paddingBottom: Layout.spacing.xxl + Layout.spacing.md,
      overflow: 'hidden',
    },
    heroBlobOne: {
      position: 'absolute',
      top: -80,
      right: -50,
      width: 190,
      height: 190,
      borderRadius: Layout.borderRadius.full,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroBlobTwo: {
      position: 'absolute',
      bottom: -100,
      left: -60,
      width: 170,
      height: 170,
      borderRadius: Layout.borderRadius.full,
      backgroundColor: 'rgba(255,255,255,0.10)',
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Layout.spacing.md,
    },
    backButton: {
      width: Layout.touchTarget,
      height: Layout.touchTarget,
      borderRadius: Layout.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.38)',
    },
    heroBrandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm + 2,
      marginTop: Layout.spacing.lg,
    },
    logoWell: {
      width: 46,
      height: 46,
      borderRadius: Layout.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.38)',
    },
    heroBrand: {
      flexShrink: 1,
      fontSize: Typography.fontSize.lg,
      lineHeight: Typography.leading.lg,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.white,
      letterSpacing: Typography.letterSpacing.wide,
    },
    sheet: {
      flex: 1,
      backgroundColor: colors.surface,
      borderTopLeftRadius: Layout.borderRadius.xxl,
      borderTopRightRadius: Layout.borderRadius.xxl,
      marginTop: -Layout.spacing.xxl,
      paddingHorizontal: Layout.spacing.xl,
      paddingTop: Layout.spacing.xl,
      paddingBottom: insets.bottom + Layout.spacing.xxl,
      ...Layout.shadow.lg,
    },
    title: {
      fontSize: Typography.fontSize.xxxl,
      lineHeight: Typography.leading.xxxl,
      fontWeight: Typography.fontWeight.extrabold,
      color: colors.text,
      letterSpacing: Typography.letterSpacing.tight,
    },
    subtitle: {
      marginTop: Layout.spacing.xs,
      marginBottom: Layout.spacing.xl,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      color: colors.textSecondary,
    },
    fieldLabel: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textSecondary,
      letterSpacing: Typography.letterSpacing.wider,
      textTransform: 'uppercase',
      marginBottom: Layout.spacing.sm,
    },
    roleContainer: {
      flexDirection: 'row',
      gap: Layout.spacing.sm,
      marginBottom: Layout.spacing.xl,
    },
    roleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Layout.spacing.sm,
      minHeight: 52,
      paddingHorizontal: Layout.spacing.sm,
      borderRadius: Layout.borderRadius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    roleButtonActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
      ...Layout.shadow.xs,
    },
    roleButtonText: {
      flexShrink: 1,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    roleButtonTextActive: {
      color: colors.primaryDark,
      fontWeight: Typography.fontWeight.bold,
    },
    submitWrap: {
      marginTop: Layout.spacing.sm,
    },
    loginContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: Layout.spacing.lg,
    },
    loginText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
    loginLink: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
    },
  }), [colors, insets.top, insets.bottom]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile: string) => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
  };
  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !mobile || !email || !password || !confirmPassword || !address) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    if (fullName.length < 2) {
      showAlert('Error', 'Full name must be at least 2 characters');
      return;
    }

    if (!validateMobile(mobile)) {
      showAlert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    if (!validateEmail(email)) {
      showAlert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // DEBUG: Log everything
      console.log('========================================');
      console.log('📝 REGISTRATION ATTEMPT');
      console.log('📝 API Base URL:', api.defaults.baseURL);
      console.log('📝 Data being sent:');
      console.log('  - Name:', fullName);
      console.log('  - Email:', email);
      console.log('  - Mobile:', mobile);
      console.log('  - Address:', address);
      console.log('  - Role:', selectedRole);
      console.log('  - Password length:', password.length);
      console.log('========================================');

      const response = await api.post('/auth/register', {
        name: fullName,
        email: email,
        password: password,
        mobile: mobile,
        address: address,
        role: selectedRole,
      });

      console.log('✅ SUCCESS: status', response.status, '| user id:', response.data?.user?._id ?? 'n/a');
      console.log('========================================');

      if (response.data.success) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('currentUser', JSON.stringify({
          ...response.data.user,
          role: selectedRole,
        }));

        showAlert(
          'Success',
          'Registration completed successfully!',
          () => {
            if (selectedRole === 'farmer') {
              router.replace('/farmer');
            } else {
              router.replace('/buyer');
            }
          }
        );
      }
    } catch (error: any) {
      // Safe logging — passing the raw Axios error to console.log crashes
      // Hermes/LogBox with "Property 'c' doesn't exist". We only log flat
      // primitives and surface the real backend message to the user.
      logApiError('REGISTRATION FAILED', error);

      const errorMessage = getApiErrorMessage(
        error,
        'Something went wrong. Please try again.'
      );
      showAlert('Registration Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBlobOne} pointerEvents="none" />
          <View style={styles.heroBlobTwo} pointerEvents="none" />
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={navigateToLogin}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
            <ThemeToggle />
          </View>
          <View style={styles.heroBrandRow}>
            <View style={styles.logoWell}>
              <Ionicons name="leaf" size={22} color={colors.white} />
            </View>
            <Text style={styles.heroBrand} numberOfLines={1}>
              Farm Marketplace
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.sheet}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register as a {selectedRole}</Text>

          <Text style={styles.fieldLabel}>I am a</Text>
          <View style={styles.roleContainer}>
            {(['farmer', 'buyer'] as Role[]).map((role) => (
              <TouchableOpacity
                key={role}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedRole === role }}
                style={[
                  styles.roleButton,
                  selectedRole === role && styles.roleButtonActive,
                ]}
                onPress={() => setSelectedRole(role)}
              >
                <Ionicons
                  name={ROLE_ICONS[role]}
                  size={18}
                  color={selectedRole === role ? colors.primary : colors.muted}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.roleButtonText,
                    selectedRole === role && styles.roleButtonTextActive,
                  ]}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Full Name"
            icon="person-outline"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
          />

          <Input
            label="Mobile Number"
            icon="call-outline"
            placeholder="Enter 10-digit mobile number"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <Input
            label="Email"
            icon="mail-outline"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            rightAdornment={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
            }
          />

          <Input
            label="Confirm Password"
            icon="lock-closed-outline"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            rightAdornment={
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
            }
          />

          <Input
            label="Address"
            icon="location-outline"
            placeholder="Enter your address"
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <View style={styles.submitWrap}>
            <Button
              title="Register"
              onPress={handleRegister}
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
            />
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
