import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { uploadImageToCloudinary } from '../../services/cloudinary';

const CATEGORIES = ['vegetables', 'fruits', 'grains', 'dairy'];

export default function AddProductScreen() {
  const colors = useColors();
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
  card: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Layout.spacing.xxl,
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
  textArea: {
    height: 90,
    paddingTop: Layout.spacing.sm,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Layout.spacing.md,
  },
  categoryTab: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.xl,
    backgroundColor: colors.lighterGray,
    marginRight: Layout.spacing.xs,
    marginBottom: Layout.spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.gray,
  },
  categoryTextActive: {
    color: colors.white,
  },
  inputRow: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Layout.spacing.md,
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
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
  },
  submitBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: Typography.fontSize.md,
  },
  previewContainer: {
    marginBottom: Layout.spacing.md,
  },
  previewLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: Layout.spacing.xs,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: Layout.borderRadius.sm,
    resizeMode: 'cover',
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.md,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: Layout.borderRadius.sm,
    paddingVertical: Layout.spacing.sm,
    flex: 0.48,
  },
  pickerBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: Typography.fontSize.xs,
    marginLeft: 6,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#C62828',
    fontWeight: 'bold',
    fontSize: Typography.fontSize.xs,
    marginLeft: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: Typography.fontSize.md,
    marginLeft: 8,
  },
}), [colors]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('vegetables');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [quantity, setQuantity] = useState('');
  const [isOrganic, setIsOrganic] = useState(false);
  const [address, setAddress] = useState('Mangalore'); // Default address
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (libraryStatus.status !== 'granted' || cameraStatus.status !== 'granted') {
        showAlert('Permissions Required', 'We need camera and gallery permissions to pick or capture images.');
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setSelectedImage(result.assets[0].uri);
        setImageUrl(''); // Clear manual text URL if local image is selected
      }
    } catch (err: any) {
      console.error('Gallery picker error:', err);
      showAlert('Error', 'Failed to open image gallery.');
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setSelectedImage(result.assets[0].uri);
        setImageUrl(''); // Clear manual text URL if camera photo is taken
      }
    } catch (err: any) {
      console.error('Camera capture error:', err);
      showAlert('Error', 'Failed to open camera.');
    }
  };

  const handleAddProduct = async () => {
    if (!name || !description || !price || !unit || !quantity || !address) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    const priceNum = parseFloat(price);
    const qtyNum = parseFloat(quantity);

    if (isNaN(priceNum) || priceNum <= 0) {
      showAlert('Error', 'Please enter a valid positive price');
      return;
    }

    if (isNaN(qtyNum) || qtyNum <= 0) {
      showAlert('Error', 'Please enter a valid positive quantity');
      return;
    }

    setIsLoading(true);

    try {
      let finalImageUrl = imageUrl;

      // Upload local image from device to Cloudinary if selected
      if (selectedImage) {
        setIsUploading(true);
        try {
          finalImageUrl = await uploadImageToCloudinary(selectedImage);
        } catch (uploadError: any) {
          showAlert('Upload Failed', `Could not upload image to Cloudinary: ${uploadError.message}`);
          setIsLoading(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const response = await api.post('/products', {
        name,
        description,
        category,
        price: priceNum,
        unit,
        quantity: qtyNum,
        isOrganic,
        location: {
          address,
        },
        images: finalImageUrl ? [finalImageUrl] : [],
      });

      if (response.data.success) {
        const product = response.data.product;
        let msg = 'Product listed successfully!';
        if (product.blockchainTxHash) {
          msg += `\n\n⛓️ Listed On-Chain!\nTx Hash: ${product.blockchainTxHash.substring(0, 20)}...`;
        }
        showAlert('Success', msg, () => {
          router.replace('/(farmer)');
        });
      }
    } catch (error: any) {
      console.error('Add product failed:', error);
      const errMsg = error.response?.data?.message || 'Failed to list product. Please try again.';
      showAlert('Error', errMsg);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Product</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {/* Name */}
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fresh Tomatoes"
              placeholderTextColor={colors.gray}
              value={name}
              onChangeText={setName}
            />

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the product (freshness, harvesting date, etc.)"
              placeholderTextColor={colors.gray}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            {/* Category Select */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryTab,
                    category === cat && styles.categoryTabActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price & Unit row */}
            <View style={styles.inputRow}>
              <View style={{ flex: 1, marginRight: Layout.spacing.sm }}>
                <Text style={styles.label}>Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Price"
                  placeholderTextColor={colors.gray}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. kg, piece, bundle"
                  placeholderTextColor={colors.gray}
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>

            {/* Quantity */}
            <Text style={styles.label}>Stock Quantity Available</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50"
              placeholderTextColor={colors.gray}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />

            {/* Address */}
            <Text style={styles.label}>Farm Location Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mangalore, Karnataka"
              placeholderTextColor={colors.gray}
              value={address}
              onChangeText={setAddress}
            />

            {/* Device Image Picker */}
            <Text style={styles.label}>Product Image</Text>
            <View style={styles.pickerButtonsRow}>
              <TouchableOpacity style={styles.pickerBtn} onPress={takePhoto}>
                <Ionicons name="camera" size={18} color={colors.primary} />
                <Text style={styles.pickerBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerBtn} onPress={pickImage}>
                <Ionicons name="images" size={18} color={colors.primary} />
                <Text style={styles.pickerBtnText}>From Gallery</Text>
              </TouchableOpacity>
            </View>

            {selectedImage ? (
              <View style={styles.previewContainer}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewLabel}>Selected Image Preview:</Text>
                  <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImageBtn}>
                    <Ionicons name="close-circle" size={18} color="#C62828" />
                    <Text style={styles.removeImageText}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              </View>
            ) : (
              <View>
                {/* Fallback Manual URL Input */}
                <Text style={[styles.label, { marginTop: Layout.spacing.sm }]}>Or Paste Product Image URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. https://images.unsplash.com/... or direct image link"
                  placeholderTextColor={colors.gray}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  autoCapitalize="none"
                />

                {imageUrl ? (
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>URL Image Preview:</Text>
                    <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                  </View>
                ) : null}
              </View>
            )}

            {/* Organic Switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Organic Certified</Text>
                <Text style={styles.switchDesc}>Select if this product is fully organic</Text>
              </View>
              <Switch
                value={isOrganic}
                onValueChange={setIsOrganic}
                trackColor={{ false: '#767577', true: colors.primary }}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleAddProduct} disabled={isLoading}>
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.white} />
                  <Text style={styles.loadingText}>
                    {isUploading ? 'Uploading Image...' : 'Securing On-Chain...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>List Produce & Secure On-Chain</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

