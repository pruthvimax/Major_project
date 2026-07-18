import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Client-side uploads must use an *unsigned* upload preset.
 * Never put Cloudinary API secrets in the mobile app — they ship in the bundle.
 *
 * Setup: Cloudinary Console → Settings → Upload → Add upload preset → Signing mode: Unsigned
 */
const CLOUDINARY_CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  Constants.expoConfig?.extra?.cloudinaryCloudName ||
  '';

const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
  Constants.expoConfig?.extra?.cloudinaryUploadPreset ||
  '';

export const uploadImageToCloudinary = async (imageUri: string): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in farm-marketplace/.env'
    );
  }

  try {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('file', blob);
    } else {
      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('file', {
        uri: imageUri,
        name: `upload.${fileType}`,
        type: `image/${fileType}`,
      } as any);
    }

    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.data && response.data.secure_url) {
      return response.data.secure_url;
    }

    throw new Error('Cloudinary response did not contain secure_url');
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    const errorMsg = error.response?.data?.error?.message || error.message || 'Image upload failed';
    throw new Error(errorMsg);
  }
};
