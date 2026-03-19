import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";

if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event?.reason?.message || "";
    if (msg.includes("timeout") || msg.includes("fontfaceobserver")) {
      event.preventDefault();
    }
  });
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const str = args.join(" ");
    if (str.includes("timeout exceeded") || str.includes("fontfaceobserver")) return;
    origError(...args);
  };
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000 },
  },
});

export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      setFontsReady(true);
      SplashScreen.hideAsync().catch(() => {});
      return;
    }
    Font.loadAsync({
      Inter_400Regular,
      Inter_500Medium,
      Inter_600SemiBold,
      Inter_700Bold,
    })
      .catch(() => {})
      .finally(() => {
        setFontsReady(true);
        SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

  if (!fontsReady) return null;

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
