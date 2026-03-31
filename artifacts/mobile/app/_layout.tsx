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
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000 },
  },
});

// On web, fonts are loaded via CSS in +html.tsx — no fontfaceobserver needed.
// On native, we use useFonts which bundles the TTF files.
function useAppFonts() {
  const [webReady, setWebReady] = useState(Platform.OS === "web");
  // Icon fonts (@expo/vector-icons v15 + SDK 54) are auto-bundled by the build system.
  // Only load custom Inter fonts here.
  const [fontsLoaded, fontError] = useFonts(
    Platform.OS === "web"
      ? {} // empty on web — CSS handles it
      : {
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        }
  );

  useEffect(() => {
    if (Platform.OS === "web") {
      setWebReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  if (Platform.OS === "web") return { ready: webReady };
  return { ready: fontsLoaded || !!fontError };
}

export default function RootLayout() {
  const { ready } = useAppFonts();

  useEffect(() => {
    if (ready && Platform.OS !== "web") {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

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
                    headerTitle: "Στοιχεία Δελτίου",
                    headerBackTitle: "Πίσω",
                    headerStyle: { backgroundColor: "#fff" },
                    headerTintColor: "#FF6B35",
                  }}
                />
                <Stack.Screen
                  name="ticket/new"
                  options={{
                    headerShown: true,
                    headerTitle: "Νέο Δελτίο",
                    headerBackTitle: "Πίσω",
                    headerStyle: { backgroundColor: "#fff" },
                    headerTintColor: "#FF6B35",
                  }}
                />
                <Stack.Screen
                  name="status/[serviceId]"
                  options={{
                    headerShown: true,
                    headerTitle: "Κατάσταση Δελτίου",
                    headerBackTitle: "Πίσω",
                    headerStyle: { backgroundColor: "#fff" },
                    headerTintColor: "#FF6B35",
                  }}
                />
                <Stack.Screen
                  name="technicians"
                  options={{
                    headerShown: true,
                    headerTitle: "Τεχνικοί",
                    headerBackTitle: "Πίσω",
                    headerStyle: { backgroundColor: "#fff" },
                    headerTintColor: "#FF6B35",
                  }}
                />
                <Stack.Screen
                  name="parts"
                  options={{
                    headerShown: true,
                    headerTitle: "Ανταλλακτικά",
                    headerBackTitle: "Πίσω",
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
