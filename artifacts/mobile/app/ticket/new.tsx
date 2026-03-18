import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const COMMON_BRANDS = ["Apple", "Samsung", "Google", "Huawei", "OnePlus", "Xiaomi", "Sony", "LG", "Dell", "HP", "Lenovo", "Asus", "Acer", "Other"];
const COMMON_PROBLEMS = [
  "Screen cracked / broken",
  "Battery draining fast",
  "Won't charge",
  "Water damage",
  "Won't turn on",
  "Overheating",
  "Camera not working",
  "Speaker issue",
  "Microphone not working",
  "Keyboard stuck / broken",
  "Slow performance",
  "Software issue",
];

export default function NewTicketScreen() {
  const insets = useSafeAreaInsets();
  const { technician } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [estimatedCompletion, setEstimatedCompletion] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);

  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const toggleChip = (chip: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedChips(prev => {
      const next = prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip];
      setProblemDescription(next.join(", "));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) { Alert.alert("Required", "Customer name is required"); return; }
    if (!customerPhone.trim()) { Alert.alert("Required", "Customer phone is required"); return; }
    if (!deviceBrand.trim()) { Alert.alert("Required", "Device brand is required"); return; }
    if (!deviceModel.trim()) { Alert.alert("Required", "Device model is required"); return; }
    if (!problemDescription.trim()) { Alert.alert("Required", "Problem description is required"); return; }

    setLoading(true);
    try {
      const ticket = await api.tickets.create({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || null,
        deviceBrand: deviceBrand.trim(),
        deviceModel: deviceModel.trim(),
        problemDescription: problemDescription.trim(),
        technicianId: technician?.id || null,
        estimatedCompletion: estimatedCompletion.trim() || null,
      });

      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        "Ticket Created",
        `Service ID: ${ticket.serviceId}\n\nLabel print job sent to printer.`,
        [
          {
            text: "View Ticket",
            onPress: () => router.replace({ pathname: "/ticket/[id]", params: { id: ticket.id.toString() } }),
          },
          { text: "New Ticket", onPress: () => router.back() },
        ]
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create ticket";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: bottomPadding + 20 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Customer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="John Smith"
              placeholderTextColor={Colors.light.textSecondary}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+1 555 000 0000"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (optional)</Text>
            <TextInput
              style={styles.input}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              placeholder="john@example.com"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>

      {/* Device Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Information</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand *</Text>
            <TextInput
              style={styles.input}
              value={deviceBrand}
              onChangeText={setDeviceBrand}
              placeholder="Apple, Samsung, etc."
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 16, gap: 8 }}
          >
            {COMMON_BRANDS.map(brand => (
              <TouchableOpacity
                key={brand}
                style={[styles.chip, deviceBrand === brand && styles.chipActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDeviceBrand(brand); }}
              >
                <Text style={[styles.chipText, deviceBrand === brand && styles.chipTextActive]}>{brand}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Model *</Text>
            <TextInput
              style={styles.input}
              value={deviceModel}
              onChangeText={setDeviceModel}
              placeholder="iPhone 15 Pro, Galaxy S24, etc."
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
        </View>
      </View>

      {/* Problem Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Problem Description *</Text>
        <View style={styles.card}>
          <Text style={styles.chipHint}>Quick select common issues:</Text>
          <View style={styles.chipGrid}>
            {COMMON_PROBLEMS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, selectedChips.includes(p) && styles.chipActive]}
                onPress={() => toggleChip(p)}
              >
                <Text style={[styles.chipText, selectedChips.includes(p) && styles.chipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.divider} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={problemDescription}
              onChangeText={val => {
                setProblemDescription(val);
                setSelectedChips([]);
              }}
              placeholder="Describe the problem in detail..."
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      {/* Estimated Completion */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estimated Completion</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={estimatedCompletion}
              onChangeText={setEstimatedCompletion}
              placeholder="2-3 business days, March 25, etc."
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="ticket-plus" size={22} color="#fff" />
            <Text style={styles.submitText}>Create Ticket + Print Label</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    overflow: "hidden",
  },
  inputGroup: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 16,
  },
  chipScroll: {
    marginBottom: 4,
  },
  chipHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.inputBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  chipTextActive: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 58,
    borderRadius: 16,
    backgroundColor: Colors.brand.primary,
    marginBottom: 24,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
