import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import { ScreenHeader, Card, Input, Button } from '../../components/ui';

export default function FarmerEditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [farmName, setFarmName] = useState('Nashik Organic Orchards');
  const [avatarUri, setAvatarUri] = useState('https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=300&auto=format&fit=crop');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        setName(user.name || '');
        setEmail(user.email || '');
        setMobile(user.mobile || '');
        setAddress(typeof user.address === 'string' ? user.address : 'Nashik Green Valley, MH');
        if (user.farmName) setFarmName(user.farmName);
        if (user.avatar) setAvatarUri(user.avatar);
      }
    } catch (error) {
      logApiError('Load Profile', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const handlePickAvatar = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Gallery permission is required to change profile picture.');
        return;
      }
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err) {
      logApiError('Pick avatar error', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showAlert('Error', 'Full Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    const cleanName = name.trim();
    const cleanAddress = address.trim();
    const cleanMobile = mobile.trim();

    try {
      const response = await api.put('/users/profile', {
        name: cleanName,
        address: cleanAddress,
        mobile: cleanMobile,
        farmName: farmName.trim(),
      });

      const updatedUser = response.data?.user;
      const finalName = updatedUser?.name || cleanName;
      const finalAddress = (typeof updatedUser?.address === 'string' ? updatedUser.address : cleanAddress);
      const finalMobile = updatedUser?.mobile || cleanMobile;

      const storedUserData = await AsyncStorage.getItem('currentUser');
      if (storedUserData) {
        const userObj = JSON.parse(storedUserData);
        const updatedObj = {
          ...userObj,
          name: finalName,
          address: finalAddress,
          mobile: finalMobile,
          farmName: farmName.trim(),
          avatar: avatarUri,
        };
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedObj));
        await AsyncStorage.setItem('user', JSON.stringify(updatedObj));
      }

      showAlert('Profile Updated', 'Your profile details have been successfully saved.', () => {
        router.back();
      });
    } catch (error) {
      logApiError('Save profile error', error);
      // Local fallback save
      try {
        const storedUserData = await AsyncStorage.getItem('currentUser');
        if (storedUserData) {
          const userObj = JSON.parse(storedUserData);
          const updatedObj = {
            ...userObj,
            name: cleanName,
            address: cleanAddress,
            mobile: cleanMobile,
            farmName: farmName.trim(),
            avatar: avatarUri,
          };
          await AsyncStorage.setItem('currentUser', JSON.stringify(updatedObj));
          await AsyncStorage.setItem('user', JSON.stringify(updatedObj));
        }
      } catch (e) {}

      showAlert('Profile Saved', 'Profile updated locally.', () => {
        router.back();
      });
    } finally {
      setIsSaving(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContent: {
          padding: Layout.spacing.lg,
          paddingBottom: Layout.spacing.xxl + 40,
        },
        avatarCard: {
          alignItems: 'center',
          paddingVertical: Layout.spacing.xl,
          marginBottom: Layout.spacing.md,
          backgroundColor: colors.surface,
          borderRadius: 24,
          ...Layout.shadow.xs,
        },
        avatarWrapper: {
          position: 'relative',
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: '#ABF4AC',
        },
        avatarImage: {
          width: 100,
          height: 100,
          borderRadius: 50,
        },
        avatarEditBadge: {
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#0D631B',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
        farmerRoleBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: '#E6F1E5',
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 14,
          marginTop: Layout.spacing.sm,
        },
        farmerRoleText: {
          fontSize: 12,
          fontWeight: Typography.fontWeight.bold,
          color: '#0D631B',
        },
        sectionCard: {
          padding: Layout.spacing.lg,
          marginBottom: Layout.spacing.md,
          backgroundColor: colors.surface,
          borderRadius: 24,
          ...Layout.shadow.xs,
        },
        sectionHead: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
          marginBottom: Layout.spacing.md,
        },
        sectionIconWell: {
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: '#E6F1E5',
          alignItems: 'center',
          justifyContent: 'center',
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
        },
        bottomBar: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.md,
        },
      }),
    [colors]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0D631B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Edit Profile Details"
        subtitle="Manage your farmer account & contact information"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar & Role Header */}
          <View style={styles.avatarCard}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} activeOpacity={0.85}>
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.farmerRoleBadge}>
              <Ionicons name="leaf" size={14} color="#0D631B" />
              <Text style={styles.farmerRoleText}>Verified Farmer Partner</Text>
            </View>
          </View>

          {/* Personal Information */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIconWell}>
                <Ionicons name="person-outline" size={20} color="#0D631B" />
              </View>
              <Text style={styles.sectionTitle}>Personal Details</Text>
            </View>

            <Input
              label="Full Name"
              required
              icon="person-outline"
              placeholder="e.g. Ramesh Patel"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Email Address"
              icon="mail-outline"
              placeholder="e.g. ramesh@farm.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={false}
              hint="Email cannot be changed directly"
            />

            <Input
              label="Mobile Phone Number"
              icon="call-outline"
              placeholder="e.g. +91 9876543210"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              containerStyle={{ marginBottom: 0 }}
            />
          </Card>

          {/* Farm Location & Organization */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIconWell}>
                <Ionicons name="location-outline" size={20} color="#0D631B" />
              </View>
              <Text style={styles.sectionTitle}>Farm & Location</Text>
            </View>

            <Input
              label="Farm / Cooperative Name"
              icon="business-outline"
              placeholder="e.g. Nashik Organic Orchards"
              value={farmName}
              onChangeText={setFarmName}
            />

            <Input
              label="Farm Address / District"
              required
              icon="map-outline"
              placeholder="e.g. Nashik Green Valley, Maharashtra"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              containerStyle={{ marginBottom: 0 }}
            />
          </Card>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Layout.spacing.md) }]}>
          <Button
            title="Save Profile Details"
            size="lg"
            icon="checkmark-circle-outline"
            loading={isSaving}
            onPress={handleSaveProfile}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
