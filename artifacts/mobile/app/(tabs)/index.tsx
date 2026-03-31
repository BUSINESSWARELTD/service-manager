import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors, { STATUS_COLORS } from "@/constants/colors";
import { TicketCard } from "@/components/TicketCard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const STATUSES = [
  { key: "all", label: "Όλα" },
  { key: "received", label: "Παραλαβή" },
  { key: "diagnosing", label: "Διάγνωση" },
  { key: "repairing", label: "Επισκευή" },
  { key: "waiting_for_parts", label: "Αναμονή" },
  { key: "ready_for_pickup", label: "Έτοιμο" },
  { key: "delivered", label: "Παραδόθηκε" },
];

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const { technician, logout } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", activeStatus, search],
    queryFn: () =>
      api.tickets.list({
        status: activeStatus === "all" ? undefined : activeStatus,
        search: search || undefined,
      }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    setRefreshing(false);
  }, [queryClient]);

  const handleNewTicket = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/ticket/new");
  };

  const handleScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/scan");
  };

  const groupedByStatus = STATUSES.filter(s => s.key !== "all").map(s => ({
    ...s,
    count: (tickets as { status: string }[]).filter((t) => t.status === s.key).length,
  }));

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Workshop</Text>
          <Text style={styles.techName}>{technician?.name || "Επισκέπτης"}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleScan}>
            <MaterialCommunityIcons name="barcode-scan" size={24} color={Colors.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => logout()}>
            <Ionicons name="log-out-outline" size={22} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.summaryRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {groupedByStatus.filter(s => s.count > 0).map(s => {
          const color = STATUS_COLORS[s.key as keyof typeof STATUS_COLORS];
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.summaryChip, { backgroundColor: color?.light || "#F1F5F9" }]}
              onPress={() => setActiveStatus(s.key)}
            >
              <View style={[styles.summaryDot, { backgroundColor: color?.bg || "#64748B" }]} />
              <Text style={[styles.summaryLabel, { color: color?.bg || "#64748B" }]}>{s.label}</Text>
              <Text style={[styles.summaryCount, { color: color?.bg || "#64748B" }]}>{s.count}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search + Filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Αναζήτηση πελάτη ή ID..."
            placeholderTextColor={Colors.light.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterRow}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[
              styles.filterChip,
              activeStatus === s.key && styles.filterChipActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveStatus(s.key);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                activeStatus === s.key && styles.filterChipTextActive,
              ]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ticket List */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={tickets as Record<string, unknown>[]}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <TicketCard ticket={item as Parameters<typeof TicketCard>[0]["ticket"]} />}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPadding + 90 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="ticket-outline" size={56} color={Colors.light.border} />
              <Text style={styles.emptyTitle}>Δεν βρέθηκαν δελτία</Text>
              <Text style={styles.emptyText}>
                {search ? "Δοκιμάστε διαφορετική αναζήτηση" : "Δημιουργήστε ένα νέο δελτίο για να ξεκινήσετε"}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(tickets as unknown[]).length}
        />
      )}

      {/* FAB - New Ticket */}
      <TouchableOpacity style={[styles.fab, { bottom: bottomPadding + (Platform.OS === "web" ? 90 : 75) }]} onPress={handleNewTicket}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  techName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryRow: {
    marginBottom: 10,
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  summaryCount: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    padding: 0,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.brand.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
