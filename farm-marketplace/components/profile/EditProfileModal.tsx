import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import { uploadImageToCloudinary } from '../../services/cloudinary';
import { useTheme } from '../../context/ThemeContext';

export interface UserProfileData {
  name: string;
  email?: string;
  mobile?: string;
  address?: string;
  profileImage?: string;
  role?: string;
}

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  initialData: UserProfileData;
  onProfileUpdated: (updatedData: UserProfileData) => void;
  roleLabel?: string;
}

export default function EditProfileModal({
  visible,
  onClose,
  initialData,
  onProfileUpdated,
  roleLabel,
}: EditProfileModalProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const [name, setName] = useState(initialData.name || '');
  const [mobile, setMobile] = useState(initialData.mobile || '');
  const [address, setAddress] = useState(initialData.address || '');
  const [profileImage, setProfileImage] = useState(initialData.profileImage || '');
  const [selectedLocalImage, setSelectedLocalImage] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  // Form error states
  const [errors, setErrors] = useState<{ name?: string; mobile?: string; address?: string }>({});

  useEffect(() => {
    if (visible) {
      setName(initialData.name || '');
      setMobile(initialData.mobile || '');
      setAddress(initialData.address || '');
      setProfileImage(initialData.profileImage || '');
      setSelectedLocalImage(null);
      setErrors({});
    }
  }, [visible, initialData]);

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const handlePickImage = async (useCamera = false) => {
    try {
      if (Platform.OS !== 'web') {
        const perm = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (perm.status !== 'granted') {
          showAlert(
            'Permission Needed',
            `Please grant ${useCamera ? 'camera' : 'photo library'} permissions to update your profile picture.`
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setSelectedLocalImage(result.assets[0].uri);
      }
    } catch (err) {
      logApiError('Pick image error', err);
      showAlert('Error', 'Could not open photo selector. Please try again.');
    }
  };

  const showImagePickerOptions = () => {
    if (Platform.OS === 'web') {
      handlePickImage(false);
      return;
    }

    Alert.alert('Change Profile Picture', 'Select an option to update your picture:', [
      { text: 'Choose from Gallery', onPress: () => handlePickImage(false) },
      { text: 'Take a Photo', onPress: () => handlePickImage(true) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const validateForm = (): boolean => {
    const errs: { name?: string; mobile?: string; address?: string } = {};

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      errs.name = 'Full name must be at least 2 characters';
    }

    let cleanMobile = mobile.trim().replace(/\D/g, '');
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      cleanMobile = cleanMobile.slice(2);
    }
    if (!cleanMobile) {
      errs.mobile = 'Mobile phone number is required';
    } else if (cleanMobile.length !== 10) {
      errs.mobile = 'Please enter a valid 10-digit mobile number';
    }

    const cleanAddress = address.trim();
    if (!cleanAddress) {
      errs.address = 'Address cannot be empty';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    let finalImageUrl = profileImage;

    try {
      // 1. If user selected a new local image, upload to Cloudinary
      if (selectedLocalImage) {
        setIsUploading(true);
        setUploadProgressMsg('Uploading profile picture to Cloudinary…');
        try {
          finalImageUrl = await uploadImageToCloudinary(selectedLocalImage);
        } catch (uploadErr: any) {
          logApiError('Cloudinary profile picture upload failed', uploadErr);
          // If Cloudinary fails, fallback to local image uri so the UI doesn't break
          finalImageUrl = selectedLocalImage;
          showAlert('Upload Note', 'Profile photo upload to Cloudinary encountered an issue, keeping local preview.');
        } finally {
          setIsUploading(false);
          setUploadProgressMsg('');
        }
      }

      // 2. Normalize inputs
      const cleanName = name.trim();
      let cleanMobile = mobile.trim().replace(/\D/g, '');
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.slice(2);
      }
      const cleanAddress = address.trim();

      // 3. Save to backend database
      const response = await api.put('/users/profile', {
        name: cleanName,
        mobile: cleanMobile,
        address: cleanAddress,
        profileImage: finalImageUrl,
      });

      const updatedUser = response.data?.user;
      const finalUserPayload: UserProfileData = {
        name: updatedUser?.name || cleanName,
        mobile: updatedUser?.mobile || cleanMobile,
        address: updatedUser?.address || cleanAddress,
        profileImage: updatedUser?.profileImage || finalImageUrl,
        email: initialData.email,
        role: initialData.role,
      };

      // 4. Update AsyncStorage currentUser & user to persist across reload & sessions
      try {
        const stored = await AsyncStorage.getItem('currentUser');
        if (stored) {
          const parsed = JSON.parse(stored);
          const merged = {
            ...parsed,
            name: finalUserPayload.name,
            mobile: finalUserPayload.mobile,
            address: finalUserPayload.address,
            profileImage: finalUserPayload.profileImage,
          };
          await AsyncStorage.setItem('currentUser', JSON.stringify(merged));
          await AsyncStorage.setItem('user', JSON.stringify(merged));
        }
      } catch (storageErr) {
        logApiError('AsyncStorage update error', storageErr);
      }

      // 5. Notify parent dashboard immediately
      onProfileUpdated(finalUserPayload);

      showAlert('Profile Updated', 'Your profile details have been saved successfully!', () => {
        onClose();
      });
    } catch (error: any) {
      logApiError('Save profile error', error);
      const errMsg = error.response?.data?.message || 'Failed to update profile. Please try again.';
      showAlert('Update Failed', errMsg);
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const displayedImageUri = selectedLocalImage || profileImage;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Layout.spacing.md,
        },
        card: {
          width: '100%',
          maxWidth: 480,
          maxHeight: '92%',
          backgroundColor: isDark ? '#1C261F' : '#FFFFFF',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? '#2A3A2C' : '#E6F1E5',
          overflow: 'hidden',
          ...Layout.shadow.lg,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Layout.spacing.lg,
          paddingVertical: Layout.spacing.md + 2,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#2A3A2C' : '#E6F1E5',
          backgroundColor: isDark ? '#1F2E23' : '#F7FDF8',
        },
        headerTitleCol: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.xs + 2,
        },
        title: {
          fontSize: Typography.fontSize.lg,
          fontWeight: Typography.fontWeight.bold,
          color: isDark ? '#F1F5F2' : '#151E17',
        },
        roleBadge: {
          backgroundColor: isDark ? '#254B2A' : '#ABF4AC',
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 6,
          marginLeft: 4,
        },
        roleBadgeText: {
          fontSize: 9,
          fontWeight: Typography.fontWeight.bold,
          color: isDark ? '#A1F0A2' : '#07521D',
          textTransform: 'uppercase',
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#283D2C' : '#EAF5EC',
        },
        body: {
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.lg,
          paddingBottom: Layout.spacing.md,
        },
        // Avatar upload section
        avatarSection: {
          alignItems: 'center',
          marginBottom: Layout.spacing.lg,
        },
        avatarContainer: {
          position: 'relative',
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: isDark ? '#283D2C' : '#E8F8EE',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: '#6CC51D',
          ...Layout.shadow.sm,
        },
        avatarImg: {
          width: '100%',
          height: '100%',
          borderRadius: 46,
        },
        cameraBadge: {
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#0D631B',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: isDark ? '#1C261F' : '#FFFFFF',
          ...Layout.shadow.xs,
        },
        changePhotoText: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.semibold,
          color: '#0D631B',
          marginTop: 6,
        },
        uploadNotice: {
          fontSize: 11,
          color: isDark ? '#81C784' : '#0D631B',
          marginTop: 3,
        },
        // Form Fields
        fieldGroup: {
          marginBottom: Layout.spacing.md,
        },
        labelRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        },
        label: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.bold,
          color: isDark ? '#DDE5DF' : '#303932',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        inputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? '#141D17' : '#F4F7F5',
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: isDark ? '#2A3A2C' : '#DDE5DF',
          paddingHorizontal: 12,
        },
        inputContainerError: {
          borderColor: '#BA1A1A',
        },
        inputIcon: {
          marginRight: 8,
        },
        textInput: {
          flex: 1,
          fontSize: Typography.fontSize.sm,
          color: isDark ? '#F1F5F2' : '#151E17',
          paddingVertical: Platform.OS === 'ios' ? 12 : 9,
        },
        textInputMulti: {
          minHeight: 70,
          textAlignVertical: 'top',
          paddingTop: 10,
        },
        disabledInput: {
          backgroundColor: isDark ? '#1A211B' : '#EBF0ED',
          opacity: 0.8,
        },
        readOnlyText: {
          color: isDark ? '#8E9C91' : '#707A72',
        },
        errorText: {
          fontSize: 11,
          color: '#BA1A1A',
          marginTop: 4,
          marginLeft: 2,
        },
        // Footer Buttons
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.md,
          paddingHorizontal: Layout.spacing.lg,
          paddingVertical: Layout.spacing.md,
          borderTopWidth: 1,
          borderTopColor: isDark ? '#2A3A2C' : '#E6F1E5',
          backgroundColor: isDark ? '#1F2E23' : '#F7FDF8',
        },
        cancelBtn: {
          flex: 1,
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#26382A' : '#E8EFEA',
        },
        cancelBtnText: {
          fontSize: Typography.fontSize.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: isDark ? '#F1F5F2' : '#2C3A2E',
        },
        saveBtn: {
          flex: 1.5,
          flexDirection: 'row',
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: '#0D631B',
        },
        saveBtnDisabled: {
          opacity: 0.65,
        },
        saveBtnText: {
          fontSize: Typography.fontSize.sm,
          fontWeight: Typography.fontWeight.bold,
          color: '#FFFFFF',
        },
      }),
    [colors, isDark]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <Ionicons name="person-circle" size={24} color="#0D631B" />
              <Text style={styles.title}>Edit Profile</Text>
              {roleLabel ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              disabled={isSaving || isUploading}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color={isDark ? '#DDE5DF' : '#303932'} />
            </TouchableOpacity>
          </View>

          {/* Form Scroll Area */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile Image Picker */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={showImagePickerOptions}
                activeOpacity={0.8}
                disabled={isSaving || isUploading}
                accessibilityLabel="Change profile picture"
              >
                {displayedImageUri ? (
                  <Image source={{ uri: displayedImageUri }} style={styles.avatarImg} />
                ) : (
                  <Ionicons name="person" size={44} color="#0D631B" />
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={showImagePickerOptions} disabled={isSaving || isUploading}>
                <Text style={styles.changePhotoText}>
                  {displayedImageUri ? 'Change Picture' : 'Upload Picture'}
                </Text>
              </TouchableOpacity>
              {selectedLocalImage ? (
                <Text style={styles.uploadNotice}>New photo selected (will sync via Cloudinary)</Text>
              ) : null}
            </View>

            {/* Email (Read-only) */}
            {initialData.email ? (
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Account Email</Text>
                  <Ionicons name="lock-closed" size={12} color="#8E9C91" />
                </View>
                <View style={[styles.inputContainer, styles.disabledInput]}>
                  <Ionicons name="mail-outline" size={18} color="#8E9C91" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, styles.readOnlyText]}
                    value={initialData.email}
                    editable={false}
                  />
                </View>
              </View>
            ) : null}

            {/* Full Name Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Full Name *</Text>
              </View>
              <View style={[styles.inputContainer, errors.name && styles.inputContainerError]}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={errors.name ? '#BA1A1A' : '#0D631B'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Enter your full name"
                  placeholderTextColor="#8E9C91"
                  autoCapitalize="words"
                />
              </View>
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* Phone Number Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Phone Number (10 digits) *</Text>
              </View>
              <View style={[styles.inputContainer, errors.mobile && styles.inputContainerError]}>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={errors.mobile ? '#BA1A1A' : '#0D631B'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={mobile}
                  onChangeText={(val) => {
                    setMobile(val);
                    if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: undefined }));
                  }}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#8E9C91"
                  keyboardType="phone-pad"
                  maxLength={13}
                />
              </View>
              {errors.mobile ? <Text style={styles.errorText}>{errors.mobile}</Text> : null}
            </View>

            {/* Residential / Delivery / Farm Address */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Residential / Contact Address *</Text>
              </View>
              <View style={[styles.inputContainer, errors.address && styles.inputContainerError]}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={errors.address ? '#BA1A1A' : '#0D631B'}
                  style={[styles.inputIcon, { marginTop: 8, alignSelf: 'flex-start' }]}
                />
                <TextInput
                  style={[styles.textInput, styles.textInputMulti]}
                  value={address}
                  onChangeText={(val) => {
                    setAddress(val);
                    if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  placeholder="Street, City, State, Pincode"
                  placeholderTextColor="#8E9C91"
                  multiline
                  numberOfLines={3}
                />
              </View>
              {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSaving || isUploading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, (isSaving || isUploading) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving || isUploading}
              activeOpacity={0.8}
            >
              {isSaving || isUploading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {isUploading ? 'Uploading…' : 'Saving Changes…'}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
