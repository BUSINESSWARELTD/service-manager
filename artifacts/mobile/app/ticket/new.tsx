import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const DEFAULT_BRANDS = ["Makita","Bosch","DeWalt","Metabo","Hilti","Milwaukee","Festool","Ryobi","AEG","Black & Decker","Skil","HiKOKI (Hitachi)","Einhell","Worx","Άλλο"];
const DEFAULT_ISSUES = ["Δεν ξεκινάει / Won't start","Μοτέρ καμένο / Burnt motor","Μπαταρία δεν φορτίζει / Battery won't charge","Διακόπτης χαλασμένος / Switch failure","Υπερθέρμανση / Overheating","Γρανάζια φθαρμένα / Gear damage","Τσοκ μπλοκαρισμένο / Chuck stuck","Ψήκτρες άνθρακα φθαρμένες / Carbon brushes worn","Καλώδιο κομμένο / Cable damage","Δίσκος / λεπίδα δεν γυρίζει / Blade not turning","Κτύπος / θόρυβος / Abnormal noise","Μηχανική βλάβη / Mechanical failure"];

function parseJsonArray(val: string | null | undefined, fallback: string[]): string[] {
  if (val === null || val === undefined) return fallback;
  if (val === "[]" || val === "") return [];
  try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : fallback; }
  catch { return fallback; }
}

export default function NewTicketScreen() {
  const insets = useSafeAreaInsets();
  const { technician } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [successTicket, setSuccessTicket] = useState<{ id: number; serviceId: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.settings.get() });
  const COMMON_BRANDS = parseJsonArray((settings as Record<string, string> | undefined)?.deviceBrands, DEFAULT_BRANDS);
  const COMMON_PROBLEMS = parseJsonArray((settings as Record<string, string> | undefined)?.commonIssues, DEFAULT_ISSUES);

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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = "Απαιτείται όνομα πελάτη";
    if (!customerPhone.trim()) e.customerPhone = "Απαιτείται τηλέφωνο";
    if (!deviceBrand.trim()) e.deviceBrand = "Απαιτείται μάρκα";
    if (!deviceModel.trim()) e.deviceModel = "Απαιτείται μοντέλο";
    if (!problemDescription.trim()) e.problemDescription = "Απαιτείται περιγραφή βλάβης";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

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

      await queryClient.refetchQueries({ queryKey: ["tickets"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessTicket({ id: ticket.id, serviceId: ticket.serviceId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Αποτυχία δημιουργίας ticket";
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ error }: { error?: string }) =>
    error ? <Text style={styles.errorText}>⚠ {error}</Text> : null;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: bottomPadding + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Στοιχεία Πελάτη</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ονοματεπώνυμο *</Text>
              <TextInput
                style={[styles.input, errors.customerName && styles.inputError]}
                value={customerName}
                onChangeText={v => { setCustomerName(v); setErrors(p => ({ ...p, customerName: "" })); }}
                placeholder="π.χ. Γιώργος Παπαδόπουλος"
                placeholderTextColor={Colors.light.textSecondary}
                autoCapitalize="words"
              />
              <Field error={errors.customerName} />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Τηλέφωνο *</Text>
              <TextInput
                style={[styles.input, errors.customerPhone && styles.inputError]}
                value={customerPhone}
                onChangeText={v => { setCustomerPhone(v); setErrors(p => ({ ...p, customerPhone: "" })); }}
                placeholder="6900000000"
                placeholderTextColor={Colors.light.textSecondary}
                keyboardType="phone-pad"
              />
              <Field error={errors.customerPhone} />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (προαιρετικό)</Text>
              <TextInput
                style={styles.input}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                placeholder="info@example.com"
                placeholderTextColor={Colors.light.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Device Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Στοιχεία Εργαλείου</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Μάρκα *</Text>
              <TextInput
                style={[styles.input, errors.deviceBrand && styles.inputError]}
                value={deviceBrand}
                onChangeText={v => { setDeviceBrand(v); setErrors(p => ({ ...p, deviceBrand: "" })); }}
                placeholder="Makita, Bosch, κ.λπ."
                placeholderTextColor={Colors.light.textSecondary}
              />
              <Field error={errors.deviceBrand} />
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
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDeviceBrand(brand); setErrors(p => ({ ...p, deviceBrand: "" })); }}
                >
                  <Text style={[styles.chipText, deviceBrand === brand && styles.chipTextActive]}>{brand}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Μοντέλο / Τύπος *</Text>
              <TextInput
                style={[styles.input, errors.deviceModel && styles.inputError]}
                value={deviceModel}
                onChangeText={v => { setDeviceModel(v); setErrors(p => ({ ...p, deviceModel: "" })); }}
                placeholder="π.χ. DHR242, GBH 2-26, κ.λπ."
                placeholderTextColor={Colors.light.textSecondary}
              />
              <Field error={errors.deviceModel} />
            </View>
          </View>
        </View>

        {/* Problem Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Περιγραφή Βλάβης *</Text>
          <View style={styles.card}>
            <Text style={styles.chipHint}>Γρήγορη επιλογή κοινών βλαβών:</Text>
            <View style={styles.chipGrid}>
              {COMMON_PROBLEMS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, selectedChips.includes(p) && styles.chipActive]}
                  onPress={() => { toggleChip(p); setErrors(prev => ({ ...prev, problemDescription: "" })); }}
                >
                  <Text style={[styles.chipText, selectedChips.includes(p) && styles.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Αναλυτική Περιγραφή</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, errors.problemDescription && styles.inputError]}
                value={problemDescription}
                onChangeText={val => {
                  setProblemDescription(val);
                  setSelectedChips([]);
                  setErrors(p => ({ ...p, problemDescription: "" }));
                }}
                placeholder="Περιγράψτε αναλυτικά τη βλάβη..."
                placeholderTextColor={Colors.light.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Field error={errors.problemDescription} />
            </View>
          </View>
        </View>

        {/* Estimated Completion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Εκτιμώμενη Ολοκλήρωση</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ημερομηνία (προαιρετικό)</Text>
              <TextInput
                style={styles.input}
                value={estimatedCompletion}
                onChangeText={setEstimatedCompletion}
                placeholder="π.χ. 2-3 εργάσιμες, 25 Μαρτίου κ.λπ."
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
          </View>
        </View>

        {errors.submit && (
          <View style={styles.submitError}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.submitErrorText}>{errors.submit}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="ticket-plus" size={22} color="#fff" />
              <Text style={styles.submitText}>Δημιουργία Ticket</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={!!successTicket} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={52} color="#22C55E" />
            </View>
            <Text style={styles.modalTitle}>Ticket Δημιουργήθηκε!</Text>
            <Text style={styles.modalServiceId}>{successTicket?.serviceId}</Text>
            <Text style={styles.modalHint}>Η ετικέτα στάλθηκε στον εκτυπωτή.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => {
                  setSuccessTicket(null);
                  router.back();
                }}
              >
                <Text style={styles.modalBtnSecondaryText}>Νέο Ticket</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={() => {
                  const id = successTicket!.id;
                  setSuccessTicket(null);
                  router.replace({ pathname: "/ticket/[id]", params: { id: id.toString() } });
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>Προβολή Ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  section: { marginBottom: 20 },
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
  inputGroup: { paddingHorizontal: 16, paddingVertical: 12 },
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
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FFF5F5",
  },
  inputMultiline: { minHeight: 100, paddingTop: 12 },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
    marginTop: 5,
  },
  divider: { height: 1, backgroundColor: Colors.light.border, marginHorizontal: 16 },
  chipScroll: { marginBottom: 4 },
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
  chipActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  chipText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text },
  chipTextActive: { color: "#fff", fontFamily: "Inter_500Medium" },
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
  submitText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  submitError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  submitErrorText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#EF4444", flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center",
  },
  modalServiceId: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.brand.primary,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 24,
    textAlign: "center",
  },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtnSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnSecondaryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.brand.primary,
  },
  modalBtnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.brand.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnPrimaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
