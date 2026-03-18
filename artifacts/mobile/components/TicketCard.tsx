import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors, { STATUS_COLORS } from "@/constants/colors";
import { StatusBadge } from "./StatusBadge";

type Ticket = {
  id: number;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  problemDescription: string;
  status: string;
  technicianName?: string | null;
  createdAt: string;
  totalAmount?: number | null;
};

type Props = {
  ticket: Ticket;
};

export function TicketCard({ ticket }: Props) {
  const statusColor = STATUS_COLORS[ticket.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.received;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/ticket/[id]", params: { id: ticket.id.toString() } });
  };

  const dateStr = new Date(ticket.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: statusColor.bg }]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <View style={styles.iconWrapper}>
          <MaterialCommunityIcons name="cellphone" size={24} color={statusColor.bg} />
        </View>
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.serviceId}>{ticket.serviceId}</Text>
            <StatusBadge status={ticket.status} size="sm" />
          </View>
          <Text style={styles.customer}>{ticket.customerName}</Text>
          <Text style={styles.device}>{ticket.deviceBrand} {ticket.deviceModel}</Text>
          <Text style={styles.problem} numberOfLines={1}>{ticket.problemDescription}</Text>
          <View style={styles.bottomRow}>
            <Text style={styles.date}>{dateStr}</Text>
            {ticket.technicianName ? (
              <View style={styles.techRow}>
                <MaterialCommunityIcons name="account" size={12} color={Colors.light.textSecondary} />
                <Text style={styles.tech}>{ticket.technicianName}</Text>
              </View>
            ) : null}
            {ticket.totalAmount ? (
              <Text style={styles.amount}>€{ticket.totalAmount.toFixed(2)}</Text>
            ) : null}
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.light.border} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceId: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.brand.primary,
    letterSpacing: 0.3,
  },
  customer: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  device: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  problem: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
  },
  techRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  tech: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  amount: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.brand.primary,
  },
});
