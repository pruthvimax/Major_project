import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { getApiErrorMessage } from './apiError';

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const getBaseApiUrl = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5000/api`;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const metroIp = hostUri.split(':')[0];
    if (metroIp && metroIp !== 'localhost' && metroIp !== '127.0.0.1') {
      return `http://${metroIp}:5000/api`;
    }
  }

  const envUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && !envUrl.includes('172.17.6.232')) {
    return envUrl;
  }

  return 'http://172.17.5.232:5000/api';
};

const BASE_URL = getBaseApiUrl();

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
  async (error) => {
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

        // Handle 401 Unauthorized - clear invalid token and redirect to login
        // But exclude login and register endpoints since 401 there means wrong credentials, not invalid token
        const requestUrl = (typeof url === 'string' ? url : '') || '';
        const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

        if (status === 401 && !isAuthEndpoint) {
          console.log('🔒 Token invalid, clearing storage and redirecting to login');
          await AsyncStorage.multiRemove(['currentUser', 'token', 'user']);
          // Use setTimeout to avoid navigation during request processing
          setTimeout(() => {
            router.replace('/auth/login');
          }, 100);
        }
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
