import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { logApiError } from '../../services/apiError';
import { uploadImageToCloudinary } from '../../services/cloudinary';
import { ScreenHeader, Card, Input, Button, Chip } from '../../components/ui';

const CATEGORIES = ['vegetables', 'fruits', 'grains', 'dairy'];

export default function AddProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
      padding: Layout.spacing.lg,
      marginBottom: Layout.spacing.md,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm + 2,
      marginBottom: Layout.spacing.md,
    },
    sectionIconWell: {
      width: 34,
      height: 34,
      borderRadius: Layout.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      flex: 1,
      flexShrink: 1,
      fontSize: Typography.fontSize.md,
      lineHeight: Typography.leading.md,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
    },
    fieldLabel: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
      marginBottom: Layout.spacing.xs + 2,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Layout.spacing.sm,
      marginBottom: Layout.spacing.md,
    },
    inputRow: {
      flexDirection: 'row',
      gap: Layout.spacing.md,
    },
    flexField: {
      flex: 1,
      minWidth: 0,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Layout.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: Layout.spacing.md,
      minHeight: Layout.touchTarget,
    },
    switchLabel: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
    },
    switchDesc: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    uploadWell: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.borderStrong,
      borderRadius: Layout.borderRadius.lg,
      backgroundColor: colors.surfaceAlt,
      padding: Layout.spacing.lg,
      alignItems: 'center',
    },
    uploadIconWell: {
      width: 48,
      height: 48,
      borderRadius: Layout.borderRadius.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Layout.spacing.sm + 2,
    },
    uploadTitle: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.leading.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.text,
      textAlign: 'center',
    },
    uploadHint: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 2,
    },
    uploadActions: {
      flexDirection: 'row',
      gap: Layout.spacing.sm,
      marginTop: Layout.spacing.md,
      alignSelf: 'stretch',
    },
    thumbCaption: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
      marginTop: Layout.spacing.md,
    },
    thumbGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Layout.spacing.md,
      marginTop: Layout.spacing.sm,
    },
    thumbWrap: {
      width: '46%',
      aspectRatio: 4 / 3,
      borderRadius: Layout.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      overflow: 'hidden',
    },
    thumb: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    thumbRemove: {
      position: 'absolute',
      top: Layout.spacing.sm,
      right: Layout.spacing.sm,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    urlBlock: {
      marginTop: Layout.spacing.md,
    },
    bottomBar: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: Layout.spacing.lg,
      paddingTop: Layout.spacing.md,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Layout.spacing.xs + 2,
      marginBottom: Layout.spacing.sm,
    },
    progressText: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.leading.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
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
      logApiError('Gallery picker', err);
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
      logApiError('Camera capture', err);
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
          router.replace('/farmer');
        });
      }
    } catch (error: any) {
      logApiError('Add product failed', error);
      const errMsg = error.response?.data?.message || 'Failed to list product. Please try again.';
      showAlert('Error', errMsg);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Add New Product"
        subtitle="List fresh produce on the marketplace"
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
          {/* Product details */}
          <Card style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.sectionIconWell, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="leaf-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Product details</Text>
            </View>

            <Input
              label="Product Name"
              required
              icon="pricetag-outline"
              placeholder="e.g. Fresh Tomatoes"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Description"
              required
              icon="document-text-outline"
              placeholder="Describe the product (freshness, harvesting date, etc.)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipWrap}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  active={category === cat}
                  onPress={() => setCategory(cat)}
                />
              ))}
            </View>

            {/* Organic Switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={styles.switchLabel}>Organic Certified</Text>
                <Text style={styles.switchDesc}>Select if this product is fully organic</Text>
              </View>
              <Switch
                value={isOrganic}
                onValueChange={setIsOrganic}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </Card>

          {/* Pricing & stock */}
          <Card style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.sectionIconWell, { backgroundColor: colors.tintBlue }]}>
                <Ionicons name="cash-outline" size={18} color={colors.info} />
              </View>
              <Text style={styles.sectionTitle}>Pricing & stock</Text>
            </View>

            <View style={styles.inputRow}>
              <Input
                label="Price (₹)"
                required
                icon="pricetags-outline"
                placeholder="Price"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                containerStyle={styles.flexField}
              />
              <Input
                label="Unit"
                required
                icon="scale-outline"
                placeholder="e.g. kg, piece, bundle"
                value={unit}
                onChangeText={setUnit}
                containerStyle={styles.flexField}
              />
            </View>

            <Input
              label="Stock Quantity Available"
              required
              icon="cube-outline"
              placeholder="e.g. 50"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              containerStyle={{ marginBottom: 0 }}
            />
          </Card>

          {/* Location */}
          <Card style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.sectionIconWell, { backgroundColor: colors.tintAmber }]}>
                <Ionicons name="location-outline" size={18} color={colors.warning} />
              </View>
              <Text style={styles.sectionTitle}>Farm location</Text>
            </View>

            <Input
              label="Farm Location Address"
              required
              icon="map-outline"
              placeholder="e.g. Mangalore, Karnataka"
              value={address}
              onChangeText={setAddress}
              containerStyle={{ marginBottom: 0 }}
            />
          </Card>

          {/* Images */}
          <Card style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.sectionIconWell, { backgroundColor: colors.tintPurple }]}>
                <Ionicons name="image-outline" size={18} color={colors.secondary} />
              </View>
              <Text style={styles.sectionTitle}>Product image</Text>
            </View>

            <View style={styles.uploadWell}>
              <View style={styles.uploadIconWell}>
                <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.uploadTitle}>Add a photo of your produce</Text>
              <Text style={styles.uploadHint}>Capture a new photo or choose one from your gallery</Text>
              <View style={styles.uploadActions}>
                <Button
                  title="Take Photo"
                  variant="outline"
                  size="sm"
                  icon="camera"
                  fullWidth={false}
                  onPress={takePhoto}
                  style={styles.flexField}
                />
                <Button
                  title="From Gallery"
                  variant="ghost"
                  size="sm"
                  icon="images"
                  fullWidth={false}
                  onPress={pickImage}
                  style={styles.flexField}
                />
              </View>
            </View>

            {selectedImage ? (
              <>
                <Text style={styles.thumbCaption}>Selected image preview</Text>
                <View style={styles.thumbGrid}>
                  <View style={styles.thumbWrap}>
                    <Image source={{ uri: selectedImage }} style={styles.thumb} />
                    <TouchableOpacity
                      onPress={() => setSelectedImage(null)}
                      style={styles.thumbRemove}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Remove selected image"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={16} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.urlBlock}>
                {/* Fallback Manual URL Input */}
                <Input
                  label="Or paste product image URL"
                  icon="link-outline"
                  placeholder="e.g. https://images.unsplash.com/... or direct image link"
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  autoCapitalize="none"
                  containerStyle={{ marginBottom: 0 }}
                />

                {imageUrl ? (
                  <>
                    <Text style={styles.thumbCaption}>URL image preview</Text>
                    <View style={styles.thumbGrid}>
                      <View style={styles.thumbWrap}>
                        <Image source={{ uri: imageUrl }} style={styles.thumb} />
                      </View>
                    </View>
                  </>
                ) : null}
              </View>
            )}
          </Card>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Layout.spacing.md) }]}>
          {isLoading && (
            <View style={styles.progressRow}>
              <Ionicons name="sync-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.progressText}>
                {isUploading ? 'Uploading Image...' : 'Securing On-Chain...'}
              </Text>
            </View>
          )}
          <Button
            title="List Produce & Secure On-Chain"
            size="lg"
            icon="shield-checkmark-outline"
            loading={isLoading}
            onPress={handleAddProduct}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
