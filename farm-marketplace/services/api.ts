import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set EXPO_PUBLIC_API_URL in farm-marketplace/.env
// For physical Android device: http://<your-PC-LAN-IP>:5000/api
// For Android emulator:        http://10.0.2.2:5000/api
// Run `ipconfig` on your PC to find the correct LAN IP.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.137.1:5000/api';

console.log('📡 API Base URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return config;
    }
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config?.method?.toUpperCase(), response.config?.url);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.config?.method?.toUpperCase(), error.config?.url, error.response.data);
    } else if (error.request) {
      console.error('❌ No response. URL:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default api;
