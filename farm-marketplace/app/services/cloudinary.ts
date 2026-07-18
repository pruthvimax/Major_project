import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import CryptoJS from 'crypto-js';

// Get Cloudinary credentials from app.json
const CLOUDINARY_CLOUD_NAME = Constants.expoConfig?.extra?.cloudinaryCloudName || 'dclx9vzjp';
const CLOUDINARY_API_KEY = Constants.expoConfig?.extra?.cloudinaryApiKey || '374796258128269';
const CLOUDINARY_API_SECRET = Constants.expoConfig?.extra?.cloudinaryApiSecret || 'rlfihV-6NmxL3dELWGBJ9OhcZx8';

/**
 * Generate Cloudinary signature for signed uploads
 * Signature = SHA1("timestamp=" + timestamp + "&" + sorted_params + API_SECRET)
 */
const generateSignature = (timestamp: number, params: Record<string, string>): string => {
  // Sort parameters alphabetically and concatenate
  const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  const toSign = `timestamp=${timestamp}${sortedParams ? '&' + sortedParams : ''}${CLOUDINARY_API_SECRET}`;
  
  return CryptoJS.SHA1(toSign).toString();
};

export const uploadImageToCloudinary = async (imageUri: string): Promise<string> => {
  try {
    const formData = new FormData();
    const timestamp = Math.floor(Date.now() / 1000);
    
    if (Platform.OS === 'web') {
      // For web browser file uploads, resolve local blob URI to a Blob object
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('file', blob);
    } else {
      // For mobile app file uploads, pass the file details as FormData fields
      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      formData.append('file', {
        uri: imageUri,
        name: `upload.${fileType}`,
        type: `image/${fileType}`,
      } as any);
    }

    // Add signed upload parameters
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', timestamp.toString());
    
    // Generate signature
    const signature = generateSignature(timestamp, {});
    formData.append('signature', signature);

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
    } else {
      throw new Error('Cloudinary response did not contain secure_url');
    }
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    const errorMsg = error.response?.data?.error?.message || error.message || 'Image upload failed';
    throw new Error(errorMsg);
  }
};
