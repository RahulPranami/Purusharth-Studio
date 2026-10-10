import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/context/auth-context';

// Instruct native splash screen to prevent auto-hiding until ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // Hide the native splash screen as soon as root layout mounts
    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 50);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="admin" />
      </Stack>
    </AuthProvider>
  );
}
