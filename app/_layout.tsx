import { AuthProvider } from '@/src/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

// QueryClient singleton
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/Login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/otp" options={{ headerShown: false }} />
          <Stack.Screen name="GroupDetail" options={{ headerShown: false }} />
          <Stack.Screen name="AddExpense" options={{ headerShown: false }} />
          <Stack.Screen name="ExpenseDetail" options={{ headerShown: false }} />
          <Stack.Screen name="SettleUp" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
