import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your computer's IP - confirmed working in phone browser
const BASE_URL = 'http://172.17.3.100:5000/api';

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
    console.log('✅ API Response:', response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ No response. URL:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default api;