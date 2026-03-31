import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    // Auto-focus for ME61 hardware scanner
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSearch = async (val?: string) => {
    const query = (val || input).trim();
    if (!query) return;

    setLoading(true);
    setError("");

    try {
      const ticket = await api.tickets.getByServiceId(query);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: "/ticket/[id]", params: { id: ticket.id.toString() } });
      setInput("");
    } catch {
      setError(`No ticket found for: ${query}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Γρήγορη Σάρωση</Text>
        <Text style={styles.subtitle}>Σαρώστε ένα barcode ή εισάγετε κωδικό δελτίου</Text>
      </View>

      {/* Scanner Viewfinder */}
      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinder}>
          <MaterialCommunityIcons name="barcode-scan" size={80} color={Colors.brand.primary} />
          <Text style={styles.viewfinderText}>
            {Platform.OS !== "web"
              ? "Στρέψτε τον σαρωτή σε ένα barcode\nή εισάγετε τον κωδικό παρακάτω"
              : "Εισάγετε τον κωδικό δελτίου παρακάτω"}
          </Text>
        </View>
      </View>

      {/* Input */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Κωδικός Δελτίου / Barcode</Text>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="SRV-20260318-1234"
            placeholderTextColor={Colors.light.textSecondary}
            value={input}
            onChangeText={val => { setInput(val); setError(""); }}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.searchBtn, !input.trim() && styles.searchBtnDisabled]}
            onPress={() => handleSearch()}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Quick Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Συμβουλές</Text>
          {[
            "Χρησιμοποιήστε το κουμπί σκανδάλης του ME61 για ενεργοποίηση",
            "Η σάρωση barcode ανοίγει αυτόματα το δελτίο",
            "Μορφή κωδικού: SRV-YYYYMMDD-XXXX",
          ].map((tip, i) => (
            <View key={i} style={styles.tip}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  viewfinderContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  viewfinder: {
    width: "100%",
    maxWidth: 320,
    aspectRatio: 1.6,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    gap: 12,
  },
  viewfinderText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  inputSection: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  searchBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.brand.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
    flex: 1,
  },
  tips: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 4,
  },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.brand.primary,
    marginTop: 6,
  },
  tipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
  },
});
