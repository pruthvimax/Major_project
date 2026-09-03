import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiErrorMessage } from './apiError';

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
        // Detect stale hardcoded admin token from old login bypass
        if (token === 'admin-token-hardcoded') {
          await AsyncStorage.multiRemove(['token', 'user', 'currentUser']);
          return config;
        }
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
    // Crash-resistant logging.
    //
    // Never pass the raw Axios `error` or `error.response.data` here — they can
    // contain deep/circular references that make Hermes' console/LogBox polyfill
    // throw `ReferenceError: Property 'c' doesn't exist` while it tries to
    // serialize them. We only log flat primitive values.
    try {
      const status: unknown = error?.response?.status;
      const url: unknown = error?.config?.url;
      const method: unknown = error?.config?.method;
      const code: unknown = error?.code;
      const serverMessage: unknown = error?.response?.data?.message ?? error?.response?.data?.error;

      if (error?.response) {
        console.error('❌ API Error:', {
          status: typeof status === 'number' ? status : undefined,
          method: typeof method === 'string' ? method.toUpperCase() : undefined,
          url: typeof url === 'string' ? url : undefined,
          serverMessage: typeof serverMessage === 'string' ? serverMessage : undefined,
        });
      } else if (error?.request) {
        console.error('❌ No response (network/timeout):', {
          code: typeof code === 'string' ? code : undefined,
          method: typeof method === 'string' ? method.toUpperCase() : undefined,
          url: typeof url === 'string' ? url : undefined,
        });
      }
    } catch {
      // Logging must never crash the app.
    }

    // Attach a safe, user-friendly summary to the error object so screens can
    // simply read `error.friendlyMessage` instead of re-deriving it.
    try {
      if (error && typeof error === 'object') {
        const msg = getApiErrorMessage(error);
        Object.defineProperty(error, 'friendlyMessage', {
          value: msg,
          writable: true,
          configurable: true,
          enumerable: false,
        });
      }
    } catch {
      // ignore — never mutate errors in a way that could throw
    }

    return Promise.reject(error);
  }
);

export default api;
