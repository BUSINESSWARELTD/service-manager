import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const [notFound, setNotFound] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  const inputRef = useRef<TextInput>(null);
  const refocusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(focusInput, 300);
    return () => clearTimeout(timer);
  }, [focusInput]);

  const handleBlur = useCallback(() => {
    if (refocusTimer.current) clearTimeout(refocusTimer.current);
    refocusTimer.current = setTimeout(focusInput, 150);
  }, [focusInput]);

  useEffect(() => {
    return () => {
      if (refocusTimer.current) clearTimeout(refocusTimer.current);
    };
  }, []);

  const handleSearch = async (val?: string) => {
    const query = (val ?? input).trim();
    if (!query) return;

    setLoading(true);
    setNotFound(false);
    setLastScanned(query);

    try {
      const ticket = await api.tickets.getByServiceId(query);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: "/ticket/[id]", params: { id: ticket.id.toString() } });
      setInput("");
      setNotFound(false);
    } catch {
      setNotFound(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setNotFound(false);
    setInput("");
    router.push({ pathname: "/ticket/new", params: { barcode: lastScanned } });
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
            onChangeText={val => { setInput(val); setNotFound(false); }}
            onSubmitEditing={() => handleSearch()}
            onBlur={handleBlur}
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

        {/* Not found — offer to create new ticket */}
        {notFound ? (
          <View style={styles.notFoundBox}>
            <View style={styles.notFoundRow}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.notFoundText}>
                Δεν βρέθηκε δελτίο για: <Text style={styles.notFoundCode}>{lastScanned}</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.createBtn} onPress={handleCreateNew}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.createBtnText}>Δημιουργία Νέου Δελτίου</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Quick Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Συμβουλές</Text>
          {[
            "Χρησιμοποιήστε το κουμπί σκανδάλης του ME61 για ενεργοποίηση",
            "Η σάρωση barcode ανοίγει αυτόματα το δελτίο",
            "Αν δεν βρεθεί δελτίο, μπορείτε να δημιουργήσετε νέο",
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
  notFoundBox: {
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 14,
    gap: 12,
  },
  notFoundRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notFoundText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
    flex: 1,
  },
  notFoundCode: {
    fontFamily: "Inter_700Bold",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.brand.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
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
