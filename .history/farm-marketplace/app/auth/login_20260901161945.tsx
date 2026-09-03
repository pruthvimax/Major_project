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

type Role = 'farmer' | 'buyer' | 'admin';

const ROLE_ICONS: Record<Role, keyof typeof Ionicons.glyphMap> = {
  farmer: 'leaf-outline',
  buyer: 'basket-outline',
  admin: 'shield-checkmark-outline',
};

// Single authorized admin account — Admin can ONLY log in with these credentials
const ADMIN_EMAIL = 'admin@farm.com';
const ADMIN_PASSWORD = 'admin@123';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<Role>('farmer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
      paddingTop: insets.top + Layout.spacing.lg,
      paddingHorizontal: Layout.spacing.xl,
      paddingBottom: Layout.spacing.xxl + Layout.spacing.xl,
      overflow: 'hidden',
    },
    heroBlobOne: {
      position: 'absolute',
      top: -70,
      right: -50,
      width: 190,
      height: 190,
      borderRadius: Layout.borderRadius.full,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroBlobTwo: {
      position: 'absolute',
      bottom: -90,
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
    logoWell: {
      width: 58,
      height: 58,
      borderRadius: Layout.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.38)',
    },
    heroBrand: {
      marginTop: Layout.spacing.lg,
      fontSize: Typography.fontSize.xl,
      lineHeight: Typography.leading.xl,
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
      fontSize: Typography.fontSize.huge,
      lineHeight: Typography.leading.huge,
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
      gap: Layout.spacing.xs,
      backgroundColor: colors.surfaceAlt,
      borderRadius: Layout.borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Layout.spacing.xs,
      marginBottom: Layout.spacing.xl,
    },
    roleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Layout.spacing.xs + 2,
      minHeight: Layout.touchTarget,
      paddingHorizontal: Layout.spacing.xs,
      borderRadius: Layout.borderRadius.md,
    },
    roleButtonActive: {
      backgroundColor: colors.primary,
      ...Layout.shadow.xs,
    },
    roleButtonText: {
      flexShrink: 1,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    roleButtonTextActive: {
      color: colors.white,
    },
    optionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Layout.spacing.md,
      marginTop: Layout.spacing.xs,
      marginBottom: Layout.spacing.xl,
    },
    rememberContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      minHeight: Layout.touchTarget,
      paddingRight: Layout.spacing.sm,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: Layout.borderRadius.sm,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      marginRight: Layout.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    rememberText: {
      flexShrink: 1,
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
    forgotButton: {
      justifyContent: 'center',
      minHeight: Layout.touchTarget,
    },
    forgotText: {
      fontSize: Typography.fontSize.sm,
      color: colors.primary,
      fontWeight: Typography.fontWeight.semibold,
    },
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: Layout.spacing.lg,
    },
    registerText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
    registerLink: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
    },
  }), [colors, insets.top, insets.bottom]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const redirectTo = (path: string) => {
    const performRedirect = () => {
      router.replace(path as never);
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(performRedirect);
    } else {
      setTimeout(performRedirect, 0);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    // Restrict Admin login to the single authorized admin account only
  const ADMIN_EMAIL = "admin@farm.com";
const ADMIN_PASSWORD = "admin123";

if (selectedRole === 'admin') {
  if (
    email.trim().toLowerCase() !== ADMIN_EMAIL ||
    password !== ADMIN_PASSWORD
  ) {
    showAlert(
      'Login Failed',
      'Invalid admin credentials. Use admin@farm.com / admin123'
    );
    return;
  }

  // Navigate to Admin Dashboard
  router.replace('/admin');
  return;
}

    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      if (response.data.success) {
        const user = response.data.user;

        // Check if role matches selected role
        if (user.role !== selectedRole) {
          showAlert('Error', `This account is registered as ${user.role}, not ${selectedRole}`);
          setIsLoading(false);
          return;
        }

        // Store token and user data
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        await AsyncStorage.setItem('currentUser', JSON.stringify(user));

        if (selectedRole === 'farmer') {
          redirectTo('/farmer');
        } else if (selectedRole === 'buyer') {
          redirectTo('/buyer');
        } else {
          redirectTo('/admin');
        }
      }
    } catch (error: any) {
      // Safe logging — passing the raw Axios error to console.error crashes
      // Hermes/LogBox with "Property 'c' doesn't exist" and hides the real
      // message. We log flat primitives and show the backend's message
      // ("Invalid credentials", "User not found", "Incorrect password", etc.).
      logApiError('LOGIN FAILED', error);

      const userMessage = getApiErrorMessage(
        error,
        'Something went wrong. Please try again later.'
      );

      showAlert('Login Failed', userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    router.push('/auth/register');
  };

  const handleForgotPassword = () => {
    showAlert('Forgot Password', 'Please contact support to reset your password.');
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
            <View style={styles.logoWell}>
              <Ionicons name="leaf" size={28} color={colors.white} />
            </View>
            <ThemeToggle />
          </View>
          <Text style={styles.heroBrand} numberOfLines={1}>
            Farm Marketplace
          </Text>
        </LinearGradient>

        <View style={styles.sheet}>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <Text style={styles.fieldLabel}>I am a</Text>
          <View style={styles.roleContainer}>
            {(['farmer', 'buyer', 'admin'] as Role[]).map((role) => (
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
                  size={16}
                  color={selectedRole === role ? colors.white : colors.muted}
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
            placeholder="Enter your password"
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

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.rememberContainer}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color={colors.white} />}
              </View>
              <Text style={styles.rememberText}>Remember Me</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Login"
            onPress={handleLogin}
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={isLoading}
          />

          {selectedRole !== 'admin' && (
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={navigateToRegister}>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
