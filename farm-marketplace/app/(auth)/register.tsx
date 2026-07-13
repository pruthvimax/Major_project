import React, { useState } from 'react';
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
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../services/api';

type Role = 'farmer' | 'buyer';

export default function RegisterScreen() {
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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile: string) => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
  };
const handleRegister = async () => {
  if (!fullName || !mobile || !email || !password || !confirmPassword || !address) {
    Alert.alert('Error', 'Please fill in all fields');
    return;
  }

  if (fullName.length < 2) {
    Alert.alert('Error', 'Full name must be at least 2 characters');
    return;
  }

  if (!validateMobile(mobile)) {
    Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
    return;
  }

  if (!validateEmail(email)) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }

  if (password.length < 6) {
    Alert.alert('Error', 'Password must be at least 6 characters');
    return;
  }

  if (password !== confirmPassword) {
    Alert.alert('Error', 'Passwords do not match');
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

    console.log('✅ SUCCESS:', response.data);
    console.log('========================================');

    if (response.data.success) {
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      await AsyncStorage.setItem('currentUser', JSON.stringify({
        ...response.data.user,
        role: selectedRole,
      }));

      Alert.alert(
        'Success',
        'Registration completed successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (selectedRole === 'farmer') {
                router.replace('/(farmer)');
              } else {
                router.replace('/(buyer)');
              }
            },
          },
        ]
      );
    }
  } catch (error: any) {
    console.log('========================================');
    console.log('❌ REGISTRATION FAILED');
    console.log('❌ Error object:', error);
    
    if (error.response) {
      console.log('❌ Response status:', error.response.status);
      console.log('❌ Response data:', JSON.stringify(error.response.data, null, 2));
      console.log('❌ Response headers:', error.response.headers);
    } else if (error.request) {
      console.log('❌ No response received');
      console.log('❌ Request:', error.request);
      console.log('❌ URL attempted:', error.config?.url);
      console.log('❌ Base URL:', api.defaults.baseURL);
    } else {
      console.log('❌ Error message:', error.message);
    }
    console.log('========================================');

    let errorMessage = 'Something went wrong. Please try again.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    Alert.alert('Registration Failed', errorMessage);
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
      >
        <TouchableOpacity style={styles.backButton} onPress={navigateToLogin}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register as a {selectedRole}</Text>
        </View>

        <View style={styles.roleContainer}>
          {(['farmer', 'buyer'] as Role[]).map((role) => (
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
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.gray}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor={Colors.gray}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={Colors.gray}
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
            <Ionicons name="lock-closed-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter password (min 6 characters)"
              placeholderTextColor={Colors.gray}
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
                color={Colors.gray}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor={Colors.gray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={Colors.gray}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your address"
              placeholderTextColor={Colors.gray}
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.registerButtonText}>Register</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.xl,
    paddingTop: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl,
  },
  backButton: {
    marginBottom: Layout.spacing.md,
  },
  headerContainer: {
    marginBottom: Layout.spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.black,
    marginBottom: Layout.spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.gray,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.lighterGray,
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
    backgroundColor: Colors.primary,
  },
  roleButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray,
  },
  roleButtonTextActive: {
    color: Colors.white,
  },
  inputContainer: {
    marginBottom: Layout.spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.black,
    marginBottom: Layout.spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lighterGray,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginRight: Layout.spacing.md,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: Typography.fontSize.md,
    color: Colors.black,
  },
  eyeIcon: {
    padding: Layout.spacing.sm,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  registerButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray,
  },
  loginLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
});