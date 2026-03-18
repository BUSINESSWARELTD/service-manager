import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";

const PERIODS = [
  { key: "week", label: "7 Days" },
  { key: "month", label: "30 Days" },
  { key: "year", label: "12 Months" },
];

type StatCardProps = {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  color?: string;
};

function StatCard({ icon, label, value, sub, color = Colors.brand.primary }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon as "star"} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState("month");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", period],
    queryFn: () => api.analytics.get(period),
  });

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPadding }]}
      contentContainerStyle={{ paddingBottom: bottomPadding + 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Workshop performance overview</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : (
        <>
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="cash-outline"
              label="Total Revenue"
              value={`€${Number(data?.totalRevenue || 0).toFixed(2)}`}
              color={Colors.brand.primary}
            />
            <StatCard
              icon="ticket-outline"
              label="Total Jobs"
              value={String(data?.totalTickets || 0)}
              color="#3B82F6"
            />
            <StatCard
              icon="checkmark-circle-outline"
              label="Completed"
              value={String(data?.completedTickets || 0)}
              color="#22C55E"
            />
            <StatCard
              icon="time-outline"
              label="Avg Repair Time"
              value={`${Number(data?.averageRepairTime || 0).toFixed(1)}h`}
              color="#F97316"
            />
          </View>

          {/* Revenue Chart (simple bar) */}
          {data?.revenueByDay && data.revenueByDay.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Revenue Trend</Text>
              <View style={styles.barChart}>
                {data.revenueByDay.slice(-10).map((d: { date: string; revenue: number }, i: number) => {
                  const maxRev = Math.max(...data.revenueByDay.map((x: { revenue: number }) => x.revenue), 1);
                  const height = Math.max((d.revenue / maxRev) * 100, 4);
                  return (
                    <View key={i} style={styles.barWrapper}>
                      <Text style={styles.barValue}>€{d.revenue > 0 ? d.revenue.toFixed(0) : ""}</Text>
                      <View style={[styles.bar, { height }]} />
                      <Text style={styles.barLabel}>{d.date.slice(5)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Top Failures */}
          {data?.topFailureTypes && data.topFailureTypes.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Most Common Repairs</Text>
              {data.topFailureTypes.slice(0, 5).map((item: { deviceBrand: string; deviceModel: string; count: number }, i: number) => (
                <View key={i} style={styles.rankRow}>
                  <View style={styles.rankNum}>
                    <Text style={styles.rankNumText}>{i + 1}</Text>
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankDevice}>{item.deviceBrand} {item.deviceModel}</Text>
                    <View style={styles.rankBar}>
                      <View style={[styles.rankBarFill, { width: `${Math.min((item.count / (data.topFailureTypes[0]?.count || 1)) * 100, 100)}%` as `${number}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.rankCount}>{item.count} jobs</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Technician Stats */}
          {data?.technicianStats && data.technicianStats.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Technician Performance</Text>
              {data.technicianStats.map((t: { technicianName: string; jobsCompleted: number; avgHoursPerJob: number }, i: number) => (
                <View key={i} style={styles.techRow}>
                  <View style={styles.techAvatar}>
                    <Text style={styles.techAvatarText}>{t.technicianName?.charAt(0) || "?"}</Text>
                  </View>
                  <View style={styles.techInfo}>
                    <Text style={styles.techName}>{t.technicianName}</Text>
                    <Text style={styles.techSub}>{t.jobsCompleted} jobs · {Number(t.avgHoursPerJob || 0).toFixed(1)}h avg</Text>
                  </View>
                  <View style={styles.techScore}>
                    <MaterialCommunityIcons name="star" size={16} color="#EAB308" />
                    <Text style={styles.techScoreText}>{t.jobsCompleted}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
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
    marginBottom: 20,
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
  periodRow: {
    flexDirection: "row",
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  periodBtnActive: {
    backgroundColor: Colors.brand.primary,
  },
  periodText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  periodTextActive: {
    color: "#fff",
  },
  loading: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: "47%",
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  statSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 14,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 130,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 12,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  bar: {
    width: "80%",
    backgroundColor: Colors.brand.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontSize: 8,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  barLabel: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  rankNum: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.light.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  rankNumText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.light.textSecondary,
  },
  rankInfo: {
    flex: 1,
    gap: 6,
  },
  rankDevice: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  rankBar: {
    height: 6,
    backgroundColor: Colors.light.background,
    borderRadius: 3,
    overflow: "hidden",
  },
  rankBarFill: {
    height: 6,
    backgroundColor: Colors.brand.primary,
    borderRadius: 3,
  },
  rankCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
  },
  techRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  techAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.brand.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  techAvatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  techInfo: {
    flex: 1,
    gap: 3,
  },
  techName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  techSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  techScore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  techScoreText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
});
