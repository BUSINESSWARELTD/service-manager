import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Colors, { STATUS_COLORS } from "@/constants/colors";
import { api } from "@/lib/api";

const STATUS_STEPS = [
  { key: "received", label: "Received", icon: "receipt" as const },
  { key: "diagnosing", label: "Diagnosing", icon: "magnify" as const },
  { key: "repairing", label: "Repairing", icon: "wrench" as const },
  { key: "waiting_for_parts", label: "Waiting for Parts", icon: "clock-outline" as const },
  { key: "ready_for_pickup", label: "Ready for Pickup", icon: "check-circle-outline" as const },
  { key: "delivered", label: "Delivered", icon: "package-check" as const },
];

export default function PublicStatusScreen() {
  const { serviceId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: status, isLoading, error } = useQuery({
    queryKey: ["public-status", serviceId],
    queryFn: () => api.tickets.publicStatus(String(serviceId)),
    retry: 1,
  });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  if (error || !status) {
    return (
      <View style={styles.loading}>
        <Ionicons name="alert-circle-outline" size={56} color={Colors.light.border} />
        <Text style={styles.errorTitle}>Ticket Not Found</Text>
        <Text style={styles.errorText}>No ticket found for ID: {serviceId}</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[status.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.received;
  const currentIndex = STATUS_STEPS.findIndex(s => s.key === status.status);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Status Header */}
      <View style={[styles.statusHeader, { backgroundColor: statusColor.bg }]}>
        <View style={styles.statusIcon}>
          <MaterialCommunityIcons
            name={STATUS_STEPS[currentIndex]?.icon || "ticket"}
            size={48}
            color="#fff"
          />
        </View>
        <Text style={styles.statusTitle}>{statusColor.label}</Text>
        <Text style={styles.statusServiceId}>{status.serviceId}</Text>
      </View>

      {/* Device Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Device</Text>
          <Text style={styles.infoValue}>{status.deviceBrand} {status.deviceModel}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Customer</Text>
          <Text style={styles.infoValue}>{status.customerName}</Text>
        </View>
        {status.estimatedCompletion ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Est. Ready</Text>
            <Text style={styles.infoValue}>{status.estimatedCompletion}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Submitted</Text>
          <Text style={styles.infoValue}>{new Date(status.createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Last Updated</Text>
          <Text style={styles.infoValue}>{new Date(status.updatedAt).toLocaleDateString()}</Text>
        </View>
      </View>

      {/* Progress Steps */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Repair Progress</Text>
        {STATUS_STEPS.map((step, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const pending = i > currentIndex;
          return (
            <View key={step.key} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View style={[
                  styles.stepDot,
                  done && styles.stepDotDone,
                  current && { backgroundColor: statusColor.bg },
                  pending && styles.stepDotPending,
                ]}>
                  {done ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : current ? (
                    <MaterialCommunityIcons name={step.icon} size={14} color="#fff" />
                  ) : (
                    <View style={styles.stepDotInner} />
                  )}
                </View>
                {i < STATUS_STEPS.length - 1 ? (
                  <View style={[styles.stepLine, (done || current) && styles.stepLineDone]} />
                ) : null}
              </View>
              <Text style={[
                styles.stepLabel,
                current && { color: statusColor.bg, fontFamily: "Inter_700Bold" },
                pending && styles.stepLabelPending,
              ]}>
                {step.label}
              </Text>
              {current && <Text style={[styles.currentBadge, { backgroundColor: statusColor.bg }]}>NOW</Text>}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: Colors.light.background },
  errorTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  errorText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  content: { backgroundColor: Colors.light.background, minHeight: "100%" },
  statusHeader: { padding: 32, alignItems: "center", gap: 10 },
  statusIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  statusTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  statusServiceId: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)", letterSpacing: 1 },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    margin: 16,
    marginBottom: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.text, padding: 16, paddingBottom: 10 },
  infoRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  infoLabel: { width: 100, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingHorizontal: 16, paddingBottom: 0 },
  stepLeft: { alignItems: "center", width: 24 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  stepDotDone: { backgroundColor: "#22C55E" },
  stepDotPending: { backgroundColor: Colors.light.border },
  stepDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.light.textSecondary },
  stepLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: Colors.light.border, marginTop: 2 },
  stepLineDone: { backgroundColor: "#22C55E" },
  stepLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.text, paddingTop: 17, paddingBottom: 18 },
  stepLabelPending: { color: Colors.light.textSecondary },
  currentBadge: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 17 },
});
