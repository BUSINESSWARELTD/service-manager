import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";

type Part = {
  id: number;
  partNumber: string;
  partName: string;
  description: string | null;
  unitCost: number;
  unitPrice: number;
  stockQuantity: number;
  barcode: string | null;
  category: string | null;
};

export default function PartsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["parts", search],
    queryFn: () => api.parts.list(search || undefined),
  });

  const openCreate = () => {
    setSelectedPart(null);
    setPartName(""); setPartNumber(""); setDescription(""); setUnitCost("");
    setUnitPrice(""); setStock("0"); setBarcode(""); setCategory("");
    setShowModal(true);
  };

  const openEdit = (part: Part) => {
    setSelectedPart(part);
    setPartName(part.partName); setPartNumber(part.partNumber); setDescription(part.description || "");
    setUnitCost(String(part.unitCost)); setUnitPrice(String(part.unitPrice));
    setStock(String(part.stockQuantity)); setBarcode(part.barcode || ""); setCategory(part.category || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!partName.trim()) { Alert.alert("Required", "Part name is required"); return; }
    if (!unitPrice) { Alert.alert("Required", "Unit price is required"); return; }
    setSaving(true);
    const payload = {
      partName: partName.trim(),
      partNumber: partNumber.trim() || undefined,
      description: description.trim() || null,
      unitCost: parseFloat(unitCost) || 0,
      unitPrice: parseFloat(unitPrice) || 0,
      stockQuantity: parseInt(stock) || 0,
      barcode: barcode.trim() || null,
      category: category.trim() || null,
    };
    try {
      if (selectedPart) {
        await api.parts.update(selectedPart.id, payload);
      } else {
        await api.parts.create(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["parts"] });
      setShowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save part");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (part: Part) => {
    Alert.alert("Delete Part", `Delete "${part.partName}" from inventory?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.parts.delete(part.id);
          await queryClient.invalidateQueries({ queryKey: ["parts"] });
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.brand.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Parts Inventory</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Colors.light.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search parts..."
          placeholderTextColor={Colors.light.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={parts as Part[]}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.partCard} onPress={() => openEdit(item)} activeOpacity={0.85}>
              <View style={styles.partIcon}>
                <MaterialCommunityIcons name="cog" size={24} color={Colors.brand.primary} />
              </View>
              <View style={styles.partInfo}>
                <Text style={styles.partName}>{item.partName}</Text>
                {item.partNumber ? <Text style={styles.partNumber}>{item.partNumber}</Text> : null}
                <Text style={styles.partPrice}>€{item.unitPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.stockBadge}>
                <Text style={[styles.stockText, item.stockQuantity === 0 && styles.stockEmpty]}>
                  {item.stockQuantity} in stock
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="package-variant" size={56} color={Colors.light.border} />
              <Text style={styles.emptyText}>No parts found</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedPart ? "Edit Part" : "New Part"}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              {[
                { label: "Part Name *", value: partName, onChange: setPartName, placeholder: "iPhone 14 Battery" },
                { label: "Part Number", value: partNumber, onChange: setPartNumber, placeholder: "IPH14-BAT" },
                { label: "Barcode", value: barcode, onChange: setBarcode, placeholder: "123456789" },
                { label: "Category", value: category, onChange: setCategory, placeholder: "Batteries" },
                { label: "Cost Price (€)", value: unitCost, onChange: setUnitCost, placeholder: "20.00", keyboard: "decimal-pad" },
                { label: "Sell Price (€) *", value: unitPrice, onChange: setUnitPrice, placeholder: "45.00", keyboard: "decimal-pad" },
                { label: "Stock Quantity", value: stock, onChange: setStock, placeholder: "10", keyboard: "numeric" },
              ].map(f => (
                <View key={f.label} style={{ gap: 6 }}>
                  <Text style={styles.modalLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={f.value}
                    onChangeText={f.onChange}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.light.textSecondary}
                    keyboardType={(f.keyboard as "default" | "decimal-pad" | "numeric") || "default"}
                  />
                </View>
              ))}
              <View style={{ gap: 6 }}>
                <Text style={styles.modalLabel}>Description</Text>
                <TextInput
                  style={[styles.modalInput, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional description..."
                  placeholderTextColor={Colors.light.textSecondary}
                  multiline
                />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{selectedPart ? "Update Part" : "Add Part"}</Text>}
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
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.light.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.light.border },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  partCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.light.card,
    borderRadius: 16, padding: 14, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  partIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.brand.light, justifyContent: "center", alignItems: "center" },
  partInfo: { flex: 1, gap: 2 },
  partName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  partNumber: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  partPrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.brand.primary },
  stockBadge: { backgroundColor: Colors.light.inputBackground, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stockText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  stockEmpty: { color: "#EF4444" },
  deleteBtn: { padding: 4 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.light.backgroundAlt, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  modalLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  modalInput: { height: 48, backgroundColor: Colors.light.inputBackground, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border },
  saveBtn: { height: 52, borderRadius: 14, backgroundColor: Colors.brand.primary, justifyContent: "center", alignItems: "center", marginTop: 4 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
