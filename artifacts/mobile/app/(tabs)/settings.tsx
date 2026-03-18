import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function SettingRow({ label, value, onChangeText, placeholder, keyboardType = "default", secureTextEntry = false }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "decimal-pad";
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TextInput
        style={styles.settingInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { technician, logout } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings.get(),
  });

  const [hourlyRate, setHourlyRate] = useState("30");
  const [vatRate, setVatRate] = useState("24");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioFrom, setTwilioFrom] = useState("");
  const [emailHost, setEmailHost] = useState("");
  const [emailPort, setEmailPort] = useState("587");
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [printerIp, setPrinterIp] = useState("");
  const [printerPort, setPrinterPort] = useState("9100");

  useEffect(() => {
    if (settings) {
      setHourlyRate(String(settings.hourlyRate || 30));
      setVatRate(String(settings.vatRate || 24));
      setTwilioSid(settings.twilioAccountSid || "");
      setTwilioToken(settings.twilioAuthToken || "");
      setTwilioFrom(settings.twilioFromNumber || "");
      setEmailHost(settings.emailHost || "");
      setEmailPort(String(settings.emailPort || 587));
      setEmailUser(settings.emailUser || "");
      setEmailPass(settings.emailPass || "");
      setEmailFrom(settings.emailFrom || "");
      setPrinterIp(settings.printerIp || "");
      setPrinterPort(String(settings.printerPort || 9100));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.settings.update({
        hourlyRate: parseFloat(hourlyRate) || 30,
        vatRate: parseFloat(vatRate) || 24,
        twilioAccountSid: twilioSid || null,
        twilioAuthToken: twilioToken || null,
        twilioFromNumber: twilioFrom || null,
        emailHost: emailHost || null,
        emailPort: parseInt(emailPort) || 587,
        emailUser: emailUser || null,
        emailPass: emailPass || null,
        emailFrom: emailFrom || null,
        printerIp: printerIp || null,
        printerPort: parseInt(printerPort) || 9100,
      });
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Settings updated successfully");
    } catch (e) {
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSeedData = async () => {
    Alert.alert("Seed Sample Data", "This will add sample tickets and parts. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Seed Data",
        onPress: async () => {
          setSeeding(true);
          try {
            await api.seed();
            await queryClient.invalidateQueries({ queryKey: ["tickets"] });
            Alert.alert("Success", "Sample data seeded successfully");
          } catch (e) {
            Alert.alert("Error", "Failed to seed data");
          } finally {
            setSeeding(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPadding }]}
      contentContainerStyle={{ paddingBottom: bottomPadding + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Admin configuration</Text>
      </View>

      {/* Technician Info */}
      <View style={styles.techCard}>
        <View style={styles.techAvatar}>
          <Text style={styles.techAvatarText}>{technician?.name?.charAt(0) || "?"}</Text>
        </View>
        <View style={styles.techInfo}>
          <Text style={styles.techName}>{technician?.name}</Text>
          <Text style={styles.techRole}>{technician?.role === "manager" ? "Manager" : "Technician"}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => logout()}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Billing Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cash-outline" size={20} color={Colors.brand.primary} />
          <Text style={styles.sectionTitle}>Billing</Text>
        </View>
        <View style={styles.sectionCard}>
          <SettingRow
            label="Hourly Rate (€)"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="30"
            keyboardType="decimal-pad"
          />
          <View style={styles.divider} />
          <SettingRow
            label="VAT Rate (%)"
            value={vatRate}
            onChangeText={setVatRate}
            placeholder="24"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Printer Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="printer" size={20} color={Colors.brand.primary} />
          <Text style={styles.sectionTitle}>Label Printer (TSC MB241T)</Text>
        </View>
        <View style={styles.sectionCard}>
          <SettingRow
            label="Printer IP Address"
            value={printerIp}
            onChangeText={setPrinterIp}
            placeholder="192.168.1.100"
          />
          <View style={styles.divider} />
          <SettingRow
            label="Printer Port"
            value={printerPort}
            onChangeText={setPrinterPort}
            placeholder="9100"
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Twilio SMS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="message-text" size={20} color={Colors.brand.primary} />
          <Text style={styles.sectionTitle}>SMS Notifications (Twilio)</Text>
        </View>
        <View style={styles.sectionCard}>
          <SettingRow label="Account SID" value={twilioSid} onChangeText={setTwilioSid} placeholder="AC..." />
          <View style={styles.divider} />
          <SettingRow label="Auth Token" value={twilioToken} onChangeText={setTwilioToken} placeholder="••••••" secureTextEntry />
          <View style={styles.divider} />
          <SettingRow label="From Number" value={twilioFrom} onChangeText={setTwilioFrom} placeholder="+1234567890" />
        </View>
      </View>

      {/* Email */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mail-outline" size={20} color={Colors.brand.primary} />
          <Text style={styles.sectionTitle}>Email Notifications</Text>
        </View>
        <View style={styles.sectionCard}>
          <SettingRow label="SMTP Host" value={emailHost} onChangeText={setEmailHost} placeholder="smtp.gmail.com" />
          <View style={styles.divider} />
          <SettingRow label="SMTP Port" value={emailPort} onChangeText={setEmailPort} placeholder="587" keyboardType="numeric" />
          <View style={styles.divider} />
          <SettingRow label="Username" value={emailUser} onChangeText={setEmailUser} placeholder="your@email.com" keyboardType="email-address" />
          <View style={styles.divider} />
          <SettingRow label="Password" value={emailPass} onChangeText={setEmailPass} placeholder="••••••" secureTextEntry />
          <View style={styles.divider} />
          <SettingRow label="From Email" value={emailFrom} onChangeText={setEmailFrom} placeholder="noreply@shop.com" keyboardType="email-address" />
        </View>
      </View>

      {/* Manage Technicians */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="account-group" size={20} color={Colors.brand.primary} />
          <Text style={styles.sectionTitle}>Team</Text>
        </View>
        <TouchableOpacity style={styles.actionRow} onPress={() => router.push("/technicians")}>
          <Text style={styles.actionRowText}>Manage Technicians</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Parts Inventory */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="package-variant" size={20} color={Colors.brand.primary} />
          <Text style={styles.sectionTitle}>Inventory</Text>
        </View>
        <TouchableOpacity style={styles.actionRow} onPress={() => router.push("/parts")}>
          <Text style={styles.actionRowText}>Manage Parts Inventory</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.seedBtn} onPress={handleSeedData} disabled={seeding}>
          {seeding ? (
            <ActivityIndicator size="small" color={Colors.brand.primary} />
          ) : (
            <MaterialCommunityIcons name="database-plus" size={20} color={Colors.brand.primary} />
          )}
          <Text style={styles.seedText}>Seed Sample Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="save-outline" size={20} color="#fff" />
          )}
          <Text style={styles.saveText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
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
  techCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  techAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.brand.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  techAvatarText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  techInfo: {
    flex: 1,
    gap: 3,
  },
  techName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  techRole: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textTransform: "capitalize",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  logoutText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#EF4444",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  sectionCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    overflow: "hidden",
  },
  settingRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  settingInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 16,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  actionRowText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  actionsSection: {
    gap: 12,
    marginTop: 8,
  },
  seedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    backgroundColor: "transparent",
  },
  seedText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.brand.primary,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.brand.primary,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
