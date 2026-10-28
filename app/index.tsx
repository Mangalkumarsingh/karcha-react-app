import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)/Home');
      } else {
        router.replace('/auth/Login');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Ionicons name="pie-chart" size={60} color={Color.white} />
        </View>
        <Text style={styles.appName}>Kharcha</Text>
        <Text style={styles.tagline}>Split expenses with friends easily</Text>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator size="small" color={Color.primary} />
        <Text style={styles.loadingText}>Loading your expenses...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.white,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Color.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: Color.text,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: Color.textSecondary,
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Color.textMuted,
  },
});
