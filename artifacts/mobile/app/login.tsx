import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

const PIN_LENGTH = 4;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [pin, setPin] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handlePress = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = [...pin, digit];
    setPin(next);
    setError("");
    if (next.length === PIN_LENGTH) {
      handleLogin(next.join(""));
    }
  };

  const handleDelete = () => {
    if (pin.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(prev => prev.slice(0, -1));
    setError("");
  };

  const handleLogin = async (pinStr: string) => {
    setLoading(true);
    try {
      const tech = await api.technicians.login(pinStr);
      await login(tech);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError("Invalid PIN. Please try again.");
      setPin([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, paddingBottom: bottomPadding + 20 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons name="tools" size={40} color="#fff" />
        </View>
        <Text style={styles.title}>Service Manager</Text>
        <Text style={styles.subtitle}>Enter your PIN to continue</Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.pinContainer}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.pinDot,
              i < pin.length && styles.pinDotFilled,
              error ? styles.pinDotError : null,
            ]}
          />
        ))}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <Text style={styles.hintText}>Default PINs: 1234 (Manager), 2345 (Tech)</Text>
      )}

      {/* Number Pad */}
      <View style={styles.numpad}>
        {digits.map((digit, i) => {
          if (digit === "") return <View key={i} style={styles.numpadEmpty} />;
          if (digit === "del") {
            return (
              <TouchableOpacity
                key={i}
                style={styles.numpadKey}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Ionicons name="backspace-outline" size={28} color={Colors.light.text} />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={i}
              style={styles.numpadKey}
              onPress={() => handlePress(digit)}
              disabled={loading || pin.length >= PIN_LENGTH}
              activeOpacity={0.7}
            >
              <Text style={styles.numpadDigit}>{digit}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    gap: 12,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: Colors.brand.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  pinContainer: {
    flexDirection: "row",
    gap: 20,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  pinDotError: {
    borderColor: "#EF4444",
    backgroundColor: "#EF4444",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#EF4444",
    textAlign: "center",
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  numpad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    maxWidth: 320,
    gap: 12,
  },
  numpadKey: {
    width: "30%",
    aspectRatio: 1.4,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundAlt,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  numpadEmpty: {
    width: "30%",
    aspectRatio: 1.4,
  },
  numpadDigit: {
    fontSize: 26,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
});
