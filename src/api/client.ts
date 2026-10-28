import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

// In-memory token cache for synchronous and instant access in interceptors
let cachedToken: string | null = null;

// Determine appropriate default base URL
// On Android emulator localhost is 10.0.2.2; on physical devices / web localhost or LAN IP is used
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  // Android emulator fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api/v1';
  }
  return 'http://localhost:8080/api/v1';
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
    if (typeof window !== 'undefined' && window.localStorage) {
      const webToken = window.localStorage.getItem('accessToken');
      if (webToken) {
        cachedToken = webToken;
        return webToken;
      }
    }
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      cachedToken = token;
      return token;
    }
  } catch (e) {
    console.warn('Error reading token from storage:', e);
  }
  return null;
};

// Set token in storage and cache
export const setAccessToken = async (token: string): Promise<void> => {
  cachedToken = token;
  try {
    await AsyncStorage.setItem('accessToken', token);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('accessToken', token);
    }
  } catch (e) {
    console.error('Error saving access token:', e);
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
    await AsyncStorage.removeItem('accessToken');
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('accessToken');
    }
  } catch (e) {
    console.error('Error removing access token:', e);
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
