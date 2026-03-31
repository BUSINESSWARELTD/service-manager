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
  role: "technician" | "manager";
  isActive: boolean;
  pin?: string;
};

type ModalMode = "create" | "edit";

export default function TechniciansScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { technician: me } = useAuth();
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Technician | null>(null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"technician" | "manager">("technician");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmTech, setConfirmTech] = useState<(Technician & { _selfError?: boolean }) | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ["technicians"],
    queryFn: () => api.technicians.list(),
  });

  const openCreate = () => {
    setModalMode("create");
    setEditTarget(null);
    setName(""); setPin(""); setRole("technician"); setFormError("");
    setShowModal(true);
  };

  const openEdit = (tech: Technician) => {
    setModalMode("edit");
    setEditTarget(tech);
    setName(tech.name);
    setPin("");
    setRole(tech.role);
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError("");
    if (!name.trim()) { setFormError("Το όνομα είναι υποχρεωτικό"); return; }
    if (modalMode === "create" && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
      setFormError("Το PIN πρέπει να είναι 4 ψηφία");
      return;
    }
    if (modalMode === "edit" && pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
      setFormError("Το PIN πρέπει να είναι 4 ψηφία");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "create") {
        await api.technicians.create({ name: name.trim(), pin, role });
      } else if (editTarget) {
        const updates: Record<string, unknown> = { name: name.trim(), role };
        if (pin) updates.pin = pin;
        await api.technicians.update(editTarget.id, updates);
      }
      setShowModal(false);
      await queryClient.refetchQueries({ queryKey: ["technicians"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Σφάλμα αποθήκευσης";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (tech: Technician) => {
    if (tech.id === me?.id) {
      setConfirmTech({ ...tech, _selfError: true });
      return;
    }
    setConfirmTech(tech);
  };

  const doDeactivate = async () => {
    if (!confirmTech) return;
    setDeactivating(true);
    try {
      await api.technicians.deactivate(confirmTech.id);
      await queryClient.refetchQueries({ queryKey: ["technicians"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmTech(null);
    } catch (e: unknown) {
      setConfirmTech(null);
      Alert.alert("Σφάλμα", e instanceof Error ? e.message : "Αποτυχία απενεργοποίησης");
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.brand.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Τεχνικοί</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
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
                <View style={styles.roleBadgeRow}>
                  <View style={[styles.roleBadge, tech.role === "manager" && styles.roleBadgeManager]}>
                    <MaterialCommunityIcons
                      name={tech.role === "manager" ? "shield-crown" : "account-wrench"}
                      size={12}
                      color={tech.role === "manager" ? "#7C3AED" : Colors.light.textSecondary}
                    />
                    <Text style={[styles.roleBadgeText, tech.role === "manager" && styles.roleBadgeTextManager]}>
                      {tech.role === "manager" ? "Manager" : "Τεχνικός"}
                    </Text>
                  </View>
                  <View style={[styles.statusDot, !tech.isActive && styles.statusDotInactive]} />
                  <Text style={styles.statusText}>{tech.isActive ? "Ενεργός" : "Ανενεργός"}</Text>
                </View>
              </View>

              {tech.isActive && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEdit(tech)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="pencil-outline" size={18} color={Colors.brand.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeactivate(tech)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {(technicians as Technician[]).length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group" size={56} color={Colors.light.border} />
              <Text style={styles.emptyText}>Δεν υπάρχουν τεχνικοί</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={openCreate}>
                <Text style={styles.emptyAddText}>+ Προσθήκη τεχνικού</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Deactivate confirmation */}
      <Modal visible={!!confirmTech} animationType="fade" transparent>
        <View style={[styles.modalOverlay, { justifyContent: "center" }]}>
          <View style={[styles.modalSheet, { borderRadius: 20, marginHorizontal: 24 }]}>
            {confirmTech?._selfError ? (
              <>
                <View style={styles.confirmIcon}>
                  <Ionicons name="warning-outline" size={32} color="#F59E0B" />
                </View>
                <Text style={styles.confirmTitle}>Αδύνατο</Text>
                <Text style={styles.confirmText}>Δεν μπορείτε να απενεργοποιήσετε τον εαυτό σας ενώ είστε συνδεδεμένοι.</Text>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: Colors.light.card, marginTop: 0 }]} onPress={() => setConfirmTech(null)}>
                  <Text style={[styles.confirmBtnText, { color: Colors.light.text }]}>Εντάξει</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.confirmIcon}>
                  <Ionicons name="person-remove-outline" size={32} color="#EF4444" />
                </View>
                <Text style={styles.confirmTitle}>Απενεργοποίηση</Text>
                <Text style={styles.confirmText}>
                  Ο/Η <Text style={{ fontFamily: "Inter_700Bold", color: Colors.light.text }}>{confirmTech?.name}</Text> θα απενεργοποιηθεί και δεν θα μπορεί να συνδεθεί.{"\n\n"}Το ιστορικό δελτίων διατηρείται.
                </Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: Colors.light.card }]} onPress={() => setConfirmTech(null)} disabled={deactivating}>
                    <Text style={[styles.confirmBtnText, { color: Colors.light.text }]}>Άκυρο</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: "#EF4444" }]} onPress={doDeactivate} disabled={deactivating}>
                    {deactivating
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={[styles.confirmBtnText, { color: "#fff" }]}>Απενεργοποίηση</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === "create" ? "Νέος Τεχνικός" : "Επεξεργασία"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 6 }}>
                <Text style={styles.modalLabel}>Ονοματεπώνυμο *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={name}
                  onChangeText={t => { setName(t); setFormError(""); }}
                  placeholder="π.χ. Γιώργος Παπαδόπουλος"
                  placeholderTextColor={Colors.light.textSecondary}
                  autoCapitalize="words"
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={styles.modalLabel}>
                  {modalMode === "create" ? "PIN (4 ψηφία) *" : "Νέο PIN (αφήστε κενό για να μην αλλάξει)"}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={pin}
                  onChangeText={t => { setPin(t); setFormError(""); }}
                  placeholder="****"
                  placeholderTextColor={Colors.light.textSecondary}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>

              <View style={{ gap: 8 }}>
                <Text style={styles.modalLabel}>Ρόλος</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleBtn, role === "technician" && styles.roleBtnActive]}
                    onPress={() => setRole("technician")}
                  >
                    <MaterialCommunityIcons name="account-wrench" size={18} color={role === "technician" ? "#fff" : Colors.light.textSecondary} />
                    <Text style={[styles.roleBtnText, role === "technician" && styles.roleBtnTextActive]}>Τεχνικός</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, role === "manager" && styles.roleBtnActive, role === "manager" && { borderColor: "#7C3AED", backgroundColor: "#7C3AED" }]}
                    onPress={() => setRole("manager")}
                  >
                    <MaterialCommunityIcons name="shield-crown" size={18} color={role === "manager" ? "#fff" : Colors.light.textSecondary} />
                    <Text style={[styles.roleBtnText, role === "manager" && styles.roleBtnTextActive]}>Manager</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.roleHint}>
                  {role === "manager"
                    ? "Ο manager μπορεί να διαχειρίζεται τεχνικούς και ρυθμίσεις"
                    : "Ο τεχνικός μπορεί να δημιουργεί και να επεξεργάζεται δελτία"}
                </Text>
              </View>

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>{modalMode === "create" ? "Δημιουργία" : "Αποθήκευση"}</Text>
                }
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
    borderRadius: 16, padding: 14, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  techAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.brand.primary, justifyContent: "center", alignItems: "center" },
  techAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  techInfo: { flex: 1, gap: 4 },
  techName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  roleBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: Colors.light.backgroundAlt,
  },
  roleBadgeManager: { backgroundColor: "#F3E8FF" },
  roleBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  roleBadgeTextManager: { color: "#7C3AED" },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22C55E" },
  statusDotInactive: { backgroundColor: Colors.light.border },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  actions: { flexDirection: "row", gap: 4 },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  emptyAddBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.brand.primary },
  emptyAddText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  confirmIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text, textAlign: "center", marginBottom: 10 },
  confirmText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmActions: { flexDirection: "row", gap: 10 },
  confirmBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  confirmBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.light.backgroundAlt, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  modalLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  modalInput: { height: 48, backgroundColor: Colors.light.inputBackground, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border },
  roleRow: { flexDirection: "row", gap: 10 },
  roleBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 2, borderColor: Colors.light.border, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  roleBtnActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  roleBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  roleBtnTextActive: { color: "#fff" },
  roleHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 18 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#EF4444" },
  saveBtn: { height: 52, borderRadius: 14, backgroundColor: Colors.brand.primary, justifyContent: "center", alignItems: "center", marginTop: 4 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
