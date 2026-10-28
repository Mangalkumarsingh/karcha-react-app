import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearAccessToken, initToken, setAccessToken } from '../api/client';
import { splitwiseApi } from '../api/splitwiseService';
import { UserProfile } from '../types/splitwise';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, profile?: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (profile: Partial<UserProfile>) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
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
          // Fetch fresh user profile in background
          try {
            const res = await splitwiseApi.getMyProfile();
            if (res.data) {
              setUser(res.data);
              await AsyncStorage.setItem('userProfile', JSON.stringify(res.data));
            }
          } catch {
            // Ignore offline/network error on bootstrap
          }
        }
      } catch (e) {
        console.warn('Failed to restore auth token:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (newToken: string, profile?: UserProfile) => {
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

  const updateUser = (profile: Partial<UserProfile>) => {
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
