import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';

type Role = 'farmer' | 'buyer' | 'admin';

export default function LoginScreen() {
  const colors = useColors();
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
      paddingHorizontal: Layout.spacing.xl,
      paddingTop: Layout.spacing.xxl * 2,
      paddingBottom: Layout.spacing.xl,
    },
    headerContainer: {
      marginBottom: Layout.spacing.xxl,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    title: {
      fontSize: Typography.fontSize.huge,
      fontWeight: Typography.fontWeight.bold,
      color: colors.black,
      marginBottom: Layout.spacing.sm,
    },
    subtitle: {
      fontSize: Typography.fontSize.md,
      color: colors.gray,
    },
    roleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.lighterGray,
      borderRadius: Layout.borderRadius.md,
      padding: Layout.spacing.xs,
      marginBottom: Layout.spacing.xl,
    },
    roleButton: {
      flex: 1,
      paddingVertical: Layout.spacing.sm,
      borderRadius: Layout.borderRadius.sm,
      alignItems: 'center',
    },
    roleButtonActive: {
      backgroundColor: colors.primary,
    },
    roleButtonText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.gray,
    },
    roleButtonTextActive: {
      color: colors.white,
    },
    inputContainer: {
      marginBottom: Layout.spacing.lg,
    },
    label: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.black,
      marginBottom: Layout.spacing.sm,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.lighterGray,
      borderRadius: Layout.borderRadius.md,
      paddingHorizontal: Layout.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputIcon: {
      marginRight: Layout.spacing.md,
    },
    input: {
      flex: 1,
      height: 50,
      fontSize: Typography.fontSize.md,
      color: colors.black,
    },
    eyeIcon: {
      padding: Layout.spacing.sm,
    },
    optionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Layout.spacing.xxl,
    },
    rememberContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: Layout.borderRadius.xs,
      borderWidth: 2,
      borderColor: colors.primary,
      marginRight: Layout.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxActive: {
      backgroundColor: colors.primary,
    },
    rememberText: {
      fontSize: Typography.fontSize.sm,
      color: colors.gray,
    },
    forgotText: {
      fontSize: Typography.fontSize.sm,
      color: colors.primary,
      fontWeight: Typography.fontWeight.semibold,
    },
    loginButton: {
      backgroundColor: colors.primary,
      borderRadius: Layout.borderRadius.md,
      paddingVertical: Layout.spacing.md,
      alignItems: 'center',
      marginBottom: Layout.spacing.lg,
    },
    loginButtonText: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
      color: colors.white,
    },
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    registerText: {
      fontSize: Typography.fontSize.sm,
      color: colors.gray,
    },
    registerLink: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primary,
    },
  }), [colors]);

  const ADMIN_EMAIL = 'admin@farm.com';
  const ADMIN_PASSWORD = 'admin123';

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      if (selectedRole === 'admin') {
        // Admin login - still local for now
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          const adminData = {
            id: 'admin_1',
            email: ADMIN_EMAIL,
            role: 'admin',
            name: 'Admin',
          };
          await AsyncStorage.setItem('currentUser', JSON.stringify(adminData));
          router.replace('/(admin)');
        } else {
          showAlert('Error', 'Invalid admin credentials');
        }
      } else {
        // Farmer/Buyer login - call backend API
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
            router.replace('/(farmer)');
          } else {
            router.replace('/(buyer)');
          }
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login credentials do not match. Please try again.';
      showAlert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    router.push('/(auth)/register');
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
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>
            <ThemeToggle />
          </View>
        </View>

        <View style={styles.roleContainer}>
          {(['farmer', 'buyer', 'admin'] as Role[]).map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.roleButton,
                selectedRole === role && styles.roleButtonActive,
              ]}
              onPress={() => setSelectedRole(role)}
            >
              <Text
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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={colors.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.gray}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.rememberContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
              {rememberMe && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
            <Text style={styles.rememberText}>Remember Me</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {selectedRole !== 'admin' && (
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}