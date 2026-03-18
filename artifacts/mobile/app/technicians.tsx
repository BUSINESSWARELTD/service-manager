import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Technician = {
  id: number;
  name: string;
  role: string;
  isActive: boolean;
  pin?: string;
};

export default function TechniciansScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { technician: me } = useAuth();
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"technician" | "manager">("technician");
  const [saving, setSaving] = useState(false);

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ["technicians"],
    queryFn: () => api.technicians.list(),
  });

  const handleDeactivate = (tech: Technician) => {
    if (tech.id === me?.id) {
      Alert.alert("Αδύνατο", "Δεν μπορείτε να απενεργοποιήσετε τον εαυτό σας.");
      return;
    }
    Alert.alert(
      "Απενεργοποίηση Τεχνικού",
      `Ο/Η "${tech.name}" θα απενεργοποιηθεί και δεν θα μπορεί να συνδεθεί. Το ιστορικό tickets διατηρείται. Συνέχεια;`,
      [
        { text: "Άκυρο", style: "cancel" },
        {
          text: "Απενεργοποίηση",
          style: "destructive",
          onPress: async () => {
            try {
              await api.technicians.deactivate(tech.id);
              await queryClient.invalidateQueries({ queryKey: ["technicians"] });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e: unknown) {
              Alert.alert("Σφάλμα", e instanceof Error ? e.message : "Αποτυχία απενεργοποίησης");
            }
          },
        },
      ]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert("Required", "Name is required"); return; }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { Alert.alert("Required", "PIN must be 4 digits"); return; }
    setSaving(true);
    try {
      await api.technicians.create({ name: name.trim(), pin, role });
      await queryClient.invalidateQueries({ queryKey: ["technicians"] });
      setShowModal(false);
      setName(""); setPin(""); setRole("technician");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create technician");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.brand.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Technicians</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.brand.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {(technicians as Technician[]).map(tech => (
            <View key={tech.id} style={styles.techCard}>
              <View style={[styles.techAvatar, !tech.isActive && { backgroundColor: Colors.light.border }]}>
                <Text style={styles.techAvatarText}>{tech.name.charAt(0)}</Text>
              </View>
              <View style={styles.techInfo}>
                <Text style={styles.techName}>{tech.name}</Text>
                <Text style={styles.techRole}>{tech.role === "manager" ? "Manager" : "Technician"}</Text>
              </View>
              <View style={[styles.statusBadge, !tech.isActive && styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, !tech.isActive && styles.statusBadgeTextInactive]}>
                  {tech.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
              {tech.isActive && tech.id !== me?.id && (
                <TouchableOpacity
                  style={styles.deactivateBtn}
                  onPress={() => handleDeactivate(tech)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {(technicians as Technician[]).length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group" size={56} color={Colors.light.border} />
              <Text style={styles.emptyText}>No technicians yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Technician</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 6 }}>
                <Text style={styles.modalLabel}>Full Name *</Text>
                <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="Alice Smith" placeholderTextColor={Colors.light.textSecondary} autoCapitalize="words" />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={styles.modalLabel}>4-Digit PIN *</Text>
                <TextInput style={styles.modalInput} value={pin} onChangeText={setPin} placeholder="1234" placeholderTextColor={Colors.light.textSecondary} keyboardType="numeric" maxLength={4} secureTextEntry />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={styles.modalLabel}>Role</Text>
                <View style={styles.roleRow}>
                  {["technician", "manager"].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                      onPress={() => setRole(r as "technician" | "manager")}
                    >
                      <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                        {r === "manager" ? "Manager" : "Technician"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Technician</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.light.card, justifyContent: "center", alignItems: "center" },
  title: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.brand.primary, justifyContent: "center", alignItems: "center" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  techCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.light.card,
    borderRadius: 16, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  techAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.brand.primary, justifyContent: "center", alignItems: "center" },
  techAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  techInfo: { flex: 1 },
  techName: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  techRole: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textTransform: "capitalize" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: "#F0FDF4" },
  statusBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#22C55E" },
  statusBadgeInactive: { backgroundColor: "#F1F5F9" },
  statusBadgeTextInactive: { color: Colors.light.textSecondary },
  deactivateBtn: { padding: 6, marginLeft: 4 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.light.backgroundAlt, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  modalLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  modalInput: { height: 48, backgroundColor: Colors.light.inputBackground, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border },
  roleRow: { flexDirection: "row", gap: 10 },
  roleBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 2, borderColor: Colors.light.border, justifyContent: "center", alignItems: "center" },
  roleBtnActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  roleBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  roleBtnTextActive: { color: "#fff" },
  saveBtn: { height: 52, borderRadius: 14, backgroundColor: Colors.brand.primary, justifyContent: "center", alignItems: "center", marginTop: 4 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
