import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearAccessToken, getAccessToken, initToken, setAccessToken } from '../api/client';
import { splitwiseApi } from '../api/splitwiseService';
import { AuthResponse, RequestEmailOtpResponse, User } from '../types/splitwise';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, profile?: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (profile: Partial<User>) => void;
  refreshProfile: () => Promise<void>;
  requestEmailOtp: (email: string) => Promise<RequestEmailOtpResponse>;
  verifyEmailOtp: (email: string, otp: string) => Promise<AuthResponse>;
  loginWithGoogle: (googleToken: string) => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on app launch
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await initToken();
        const storedUser = await AsyncStorage.getItem('userProfile');

        if (storedToken) {
          setTokenState(storedToken);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (e) {
        console.warn('Failed to restore auth token:', e);
      } finally {
        setIsLoading(false);
      }

      // Refresh profile in background non-blockingly if not demo
      try {
        const activeToken = await getAccessToken();
        if (activeToken && !activeToken.startsWith('mock_') && !activeToken.startsWith('demo_')) {
          splitwiseApi.getMyProfile().then((res) => {
            if (res.data) {
              setUser(res.data);
              AsyncStorage.setItem('userProfile', JSON.stringify(res.data)).catch(() => {});
            }
          }).catch(() => {});
        }
      } catch {
        // Ignore background sync errors
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (newToken: string, profile?: User) => {
    setTokenState(newToken);
    await setAccessToken(newToken);

    if (profile) {
      setUser(profile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
    } else {
      try {
        const res = await splitwiseApi.getMyProfile();
        if (res.data) {
          setUser(res.data);
          await AsyncStorage.setItem('userProfile', JSON.stringify(res.data));
        }
      } catch (err) {
        console.warn('Could not fetch profile during login:', err);
      }
    }
  };

  const logout = async () => {
    setTokenState(null);
    setUser(null);
    await clearAccessToken();
    await AsyncStorage.removeItem('userProfile');
  };

  const requestEmailOtp = async (email: string): Promise<RequestEmailOtpResponse> => {
    const trimmedEmail = email.trim().toLowerCase();
    const response = await splitwiseApi.requestEmailOtp(trimmedEmail);
    return response.data;
  };

  const verifyEmailOtp = async (email: string, otp: string): Promise<AuthResponse> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();
    const response = await splitwiseApi.verifyEmailOtp(trimmedEmail, trimmedOtp);
    const data = response.data;

    if (data?.accessToken) {
      const resolvedUser: User = data.user || {
        id: data.id || '',
        name: data.name || (data.email ? data.email.split('@')[0] : 'Kharcha User'),
        email: data.email ?? trimmedEmail,
        phoneNumber: data.phoneNumber ?? null,
      };
      await login(data.accessToken, resolvedUser);
    }
    return data;
  };

  const loginWithGoogle = async (googleToken: string): Promise<AuthResponse> => {
    const response = await splitwiseApi.googleLogin(googleToken);
    const data = response.data;

    if (data?.accessToken) {
      const resolvedUser: User = data.user || {
        id: data.id || '',
        name: data.name || (data.email ? data.email.split('@')[0] : 'Google User'),
        email: data.email ?? null,
        phoneNumber: data.phoneNumber ?? null,
      };
      await login(data.accessToken, resolvedUser);
    }
    return data;
  };

  const updateUser = (profile: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...profile };
      AsyncStorage.setItem('userProfile', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const refreshProfile = async () => {
    try {
      const res = await splitwiseApi.getMyProfile();
      if (res.data) {
        setUser(res.data);
        await AsyncStorage.setItem('userProfile', JSON.stringify(res.data));
      }
    } catch (e) {
      console.warn('Failed to refresh profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        logout,
        updateUser,
        refreshProfile,
        requestEmailOtp,
        verifyEmailOtp,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
