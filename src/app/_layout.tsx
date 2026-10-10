import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/auth-context';

import { Platform } from 'react-native';

// Instruct native splash screen to prevent auto-hiding until ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // Hide the native splash screen as soon as root layout mounts
    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 50);

    // Ensure Material Symbols font is loaded on web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('material-symbols-font')) {
        const link = document.createElement('link');
        link.id = 'material-symbols-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
        document.head.appendChild(link);
      }
    }

    return () => clearTimeout(timeout);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="event/[id]" />
          <Stack.Screen name="admin" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
