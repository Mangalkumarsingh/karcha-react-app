import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// In-memory token cache for synchronous and instant access in interceptors
let cachedToken: string | null = null;

// Secure token storage helpers
const SECURE_TOKEN_KEY = 'kharcha_access_token';

// Determine appropriate default base URL
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  return 'https://kharcha-backend-node.vercel.app/api/v1';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize cached token on app start
export const initToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        const webToken = window.localStorage.getItem(SECURE_TOKEN_KEY);
        if (webToken) {
          cachedToken = webToken;
          return webToken;
        }
      }
    } else {
      const secureToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
      if (secureToken) {
        cachedToken = secureToken;
        return secureToken;
      }
    }

    // Fallback to AsyncStorage for migration from previous app versions
    const legacyToken = await AsyncStorage.getItem('accessToken');
    if (legacyToken) {
      cachedToken = legacyToken;
      // Migrate to secure storage
      await setAccessToken(legacyToken);
      await AsyncStorage.removeItem('accessToken').catch(() => {});
      return legacyToken;
    }
  } catch (e) {
    console.warn('Error reading token from secure storage:', e);
  }
  return null;
};

// Set token in storage and cache
export const setAccessToken = async (token: string): Promise<void> => {
  cachedToken = token;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SECURE_TOKEN_KEY, token);
      }
    } else {
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);
    }
  } catch (e) {
    console.error('Error saving access token to secure store:', e);
    // Fallback to AsyncStorage if SecureStore fails
    try {
      await AsyncStorage.setItem('accessToken', token);
    } catch {}
  }
};

// Get current access token
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedToken) return cachedToken;
  return await initToken();
};

// Clear token on logout
export const clearAccessToken = async (): Promise<void> => {
  cachedToken = null;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(SECURE_TOKEN_KEY);
      }
    } else {
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
    }
    await AsyncStorage.removeItem('accessToken');
  } catch (e) {
    console.error('Error removing access token from storage:', e);
  }
};

// Automatically attach Bearer token to every request
api.interceptors.request.use(
  async (config) => {
    // Check cached token first for high performance
    let token = cachedToken;
    if (!token) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          token = window.localStorage.getItem('accessToken');
        }
        if (!token) {
          token = await AsyncStorage.getItem('accessToken');
        }
        if (token) {
          cachedToken = token;
        }
      } catch {
        // Continue without token if storage access fails
      }
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling 401 unauthorized or server errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized request - session expired or invalid token');
      // Could trigger logout or event listener here
    }
    return Promise.reject(error);
  }
);

export default api;
