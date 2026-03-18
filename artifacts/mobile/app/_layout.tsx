import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000 },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="ticket/[id]"
                  options={{
                    headerShown: true,
                    headerTitle: "Ticket Detail",
                    headerBackTitle: "Back",
                    headerStyle: { backgroundColor: "#fff" },
                    headerTintColor: "#FF6B35",
                  }}
                />
                <Stack.Screen
                  name="ticket/new"
                  options={{
                    headerShown: true,
                    headerTitle: "New Ticket",
                    headerBackTitle: "Back",
                    headerStyle: { backgroundColor: "#fff" },
                    headerTintColor: "#FF6B35",
                  }}
                />
                <Stack.Screen
                  name="status/[serviceId]"
                  options={{
                    headerShown: true,
                    headerTitle: "Ticket Status",
                    headerBackTitle: "Back",
                    headerStyle: { backgroundColor: "#fff" },
                    headerTintColor: "#FF6B35",
                  }}
                />
                <Stack.Screen
                  name="technicians"
                  options={{
                    headerShown: true,
                    headerTitle: "Technicians",
                    headerBackTitle: "Back",
                    headerStyle: { backgroundColor: "#fff" },
                    headerTintColor: "#FF6B35",
                  }}
                />
                <Stack.Screen
                  name="parts"
                  options={{
                    headerShown: true,
                    headerTitle: "Parts Inventory",
                    headerBackTitle: "Back",
                    headerStyle: { backgroundColor: "#fff" },
                    headerTintColor: "#FF6B35",
                  }}
                />
              </Stack>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
