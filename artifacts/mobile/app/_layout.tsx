import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";

// Suppress fontfaceobserver timeout errors — these come from icon fonts on slow networks
// and do not affect functionality. Icons still render via CSS fallbacks.
if (typeof global !== "undefined") {
  const _ErrorUtils = (global as Record<string, unknown>).ErrorUtils as {
    getGlobalHandler: () => (e: Error, fatal: boolean) => void;
    setGlobalHandler: (h: (e: Error, fatal: boolean) => void) => void;
  } | undefined;
  if (_ErrorUtils) {
    const prev = _ErrorUtils.getGlobalHandler();
    _ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
      const msg = error?.message || "";
      if (msg.includes("timeout exceeded") || msg.includes("fontfaceobserver")) return;
      prev(error, isFatal);
    });
  }
}

if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = (event?.reason as Error)?.message || String(event?.reason || "");
    if (msg.includes("timeout") || msg.includes("fontfaceobserver")) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000 },
  },
});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

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
