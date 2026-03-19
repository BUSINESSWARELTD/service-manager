import React, { useState, useEffect, useRef } from "react";
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
  Linking,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors, { STATUS_COLORS } from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const STATUS_FLOW = [
  { key: "received", label: "Received" },
  { key: "diagnosing", label: "Diagnosing" },
  { key: "repairing", label: "Repairing" },
  { key: "waiting_for_parts", label: "Waiting Parts" },
  { key: "ready_for_pickup", label: "Ready" },
  { key: "delivered", label: "Delivered" },
];

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const ticketId = parseInt(String(id), 10);
  const { technician } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: ticket, isLoading, refetch } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => api.tickets.get(ticketId),
  });

  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showLaborModal, setShowLaborModal] = useState(false);
  const [showWorkSummaryModal, setShowWorkSummaryModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [partName, setPartName] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partPrice, setPartPrice] = useState("");
  const [partWarranty, setPartWarranty] = useState("");
  const [laborMode, setLaborMode] = useState<"timer" | "manual">("timer");
  const [manualHours, setManualHours] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [note, setNote] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [targetStatus, setTargetStatus] = useState("");

  // Labor timer display
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runningLabor = ticket?.laborEntries?.find((l: { isRunning: boolean }) => l.isRunning);

  useEffect(() => {
    if (runningLabor?.startTime) {
      const start = new Date(runningLabor.startTime).getTime();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [runningLabor?.startTime]);

  const formatTimer = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleAddPart = async () => {
    if (!partName.trim() || !partPrice) { Alert.alert("Required", "Part name and price are required"); return; }
    try {
      await api.parts.addToTicket(ticketId, {
        partName: partName.trim(),
        quantity: parseInt(partQty) || 1,
        unitPrice: parseFloat(partPrice),
        warrantyPeriod: partWarranty || null,
        technicianId: technician?.id || null,
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setShowPartsModal(false);
      setPartName(""); setPartQty("1"); setPartPrice(""); setPartWarranty("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add part");
    }
  };

  const handleRemovePart = async (partId: number) => {
    Alert.alert("Remove Part", "Remove this part from the ticket?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await api.parts.removeFromTicket(ticketId, partId);
          await refetch();
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
        },
      },
    ]);
  };

  const handleStartTimer = async () => {
    try {
      await api.labor.add(ticketId, { technicianId: technician?.id || null, mode: "timer" });
      await refetch();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowLaborModal(false);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to start timer");
    }
  };

  const handleStopTimer = async (laborId: number) => {
    try {
      await api.labor.stop(ticketId, laborId);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to stop timer");
    }
  };

  const handleAddManualLabor = async () => {
    if (!manualHours || parseFloat(manualHours) <= 0) { Alert.alert("Required", "Enter hours worked"); return; }
    try {
      await api.labor.add(ticketId, {
        technicianId: technician?.id || null,
        mode: "manual",
        manualHours: parseFloat(manualHours),
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setShowLaborModal(false);
      setManualHours("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to log labor");
    }
  };

  const handleSubmitWorkSummary = async () => {
    if (!workSummary.trim()) { Alert.alert("Required", "Work summary is required"); return; }
    try {
      await api.tickets.submitWorkSummary(ticketId, { workSummary: workSummary.trim(), technicianId: technician?.id || null });
      await refetch();
      setShowWorkSummaryModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit work summary");
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    await api.tickets.addNote(ticketId, note.trim(), technician?.id || undefined);
    await refetch();
    setShowNoteModal(false);
    setNote("");
  };

  const handleStatusChange = async (newStatus: string, confirm?: boolean) => {
    const needsReason = ["received", "diagnosing", "repairing", "waiting_for_parts"].some(
      s => STATUS_FLOW.indexOf(STATUS_FLOW.find(x => x.key === s)!) > STATUS_FLOW.indexOf(STATUS_FLOW.find(x => x.key === newStatus)!)
    );

    try {
      await api.tickets.updateStatus(ticketId, {
        status: newStatus,
        technicianId: technician?.id || null,
        reason: statusReason || null,
        billConfirmed: newStatus === "delivered" ? true : undefined,
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setShowStatusModal(false);
      setStatusReason("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      Alert.alert("Cannot Change Status", e instanceof Error ? e.message : "Status change failed");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Ticket not found</Text>
      </View>
    );
  }

  const totalParts = (ticket.parts || []).reduce((sum: number, p: { totalPrice: number }) => sum + p.totalPrice, 0);
  const totalLabor = (ticket.laborEntries || []).reduce((sum: number, l: { laborCost?: number }) => sum + (l.laborCost || 0), 0);
  const statusColor = STATUS_COLORS[ticket.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.received;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor.bg }]}>
          <Text style={styles.serviceId}>{ticket.serviceId}</Text>
          <Text style={styles.statusLabel}>{statusColor.label}</Text>
        </View>

        {/* Customer Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account" size={18} color={Colors.brand.primary} />
            <Text style={styles.cardTitle}>Customer</Text>
          </View>
          <InfoRow label="Name" value={ticket.customerName} />
          <InfoRow label="Phone" value={ticket.customerPhone} />
          {ticket.customerEmail ? <InfoRow label="Email" value={ticket.customerEmail} /> : null}
        </View>

        {/* Device Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="cellphone" size={18} color={Colors.brand.primary} />
            <Text style={styles.cardTitle}>Device</Text>
          </View>
          <InfoRow label="Brand" value={ticket.deviceBrand} />
          <InfoRow label="Model" value={ticket.deviceModel} />
          <InfoRow label="Problem" value={ticket.problemDescription} />
          {ticket.estimatedCompletion ? <InfoRow label="ETA" value={ticket.estimatedCompletion} /> : null}
          {ticket.technicianName ? <InfoRow label="Technician" value={ticket.technicianName} /> : null}
        </View>

        {/* QR Code — Customer Status Link */}
        {(() => {
          const domain = process.env.EXPO_PUBLIC_DOMAIN;
          const statusUrl = domain
            ? `https://${domain}/status/${ticket.serviceId}`
            : `https://status.example.com/${ticket.serviceId}`;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="qrcode" size={18} color={Colors.brand.primary} />
                <Text style={styles.cardTitle}>QR Κατάστασης Πελάτη</Text>
              </View>
              <View style={styles.qrContainer}>
                <QRCode
                  value={statusUrl}
                  size={140}
                  color="#1a1a2e"
                  backgroundColor="#ffffff"
                />
                <View style={styles.qrInfo}>
                  <Text style={styles.qrLabel}>Ο πελάτης σκανάρει για να δει την κατάσταση</Text>
                  <Text style={styles.qrUrl} numberOfLines={2}>{statusUrl}</Text>
                  <TouchableOpacity
                    style={styles.qrOpenBtn}
                    onPress={() => Linking.openURL(statusUrl).catch(() => {})}
                  >
                    <Ionicons name="open-outline" size={14} color={Colors.brand.primary} />
                    <Text style={styles.qrOpenBtnText}>Άνοιγμα</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Labor Timer */}
        {runningLabor ? (
          <View style={styles.timerCard}>
            <View style={styles.timerRow}>
              <Ionicons name="timer" size={24} color="#22C55E" />
              <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
              <TouchableOpacity
                style={styles.stopBtn}
                onPress={() => handleStopTimer(runningLabor.id)}
              >
                <Ionicons name="stop" size={18} color="#fff" />
                <Text style={styles.stopBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Parts */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="package-variant" size={18} color={Colors.brand.primary} />
              <Text style={styles.cardTitle}>Parts Used</Text>
            </View>
            {ticket.status !== "delivered" ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowPartsModal(true)}>
                <Ionicons name="add" size={18} color={Colors.brand.primary} />
                <Text style={styles.addBtnText}>Add Part</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {(ticket.parts || []).length === 0 ? (
            <Text style={styles.emptySection}>No parts logged yet</Text>
          ) : (
            (ticket.parts as Array<{ id: number; partName: string; quantity: number; unitPrice: number; totalPrice: number; warrantyPeriod?: string }>).map(p => (
              <View key={p.id} style={styles.partRow}>
                <View style={styles.partInfo}>
                  <Text style={styles.partName}>{p.partName}</Text>
                  <Text style={styles.partSub}>x{p.quantity} @ €{p.unitPrice.toFixed(2)}{p.warrantyPeriod ? ` · ${p.warrantyPeriod}` : ""}</Text>
                </View>
                <Text style={styles.partTotal}>€{p.totalPrice.toFixed(2)}</Text>
                {ticket.status !== "delivered" ? (
                  <TouchableOpacity onPress={() => handleRemovePart(p.id)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
          {totalParts > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Parts Total</Text>
              <Text style={styles.totalValue}>€{totalParts.toFixed(2)}</Text>
            </View>
          ) : null}
        </View>

        {/* Labor */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <Ionicons name="time-outline" size={18} color={Colors.brand.primary} />
              <Text style={styles.cardTitle}>Labor</Text>
            </View>
            {ticket.status !== "delivered" && !runningLabor ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowLaborModal(true)}>
                <Ionicons name="add" size={18} color={Colors.brand.primary} />
                <Text style={styles.addBtnText}>Log Labor</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {(ticket.laborEntries || []).length === 0 ? (
            <Text style={styles.emptySection}>No labor logged yet</Text>
          ) : (
            (ticket.laborEntries as Array<{ id: number; isRunning: boolean; totalHours?: number; laborCost?: number; technicianName?: string; manualHours?: number }>).map(l => (
              <View key={l.id} style={styles.laborRow}>
                <View style={styles.laborInfo}>
                  <Text style={styles.laborHours}>
                    {l.isRunning ? "Running..." : `${(l.totalHours || 0).toFixed(2)}h`}
                  </Text>
                  {l.technicianName ? <Text style={styles.laborTech}>{l.technicianName}</Text> : null}
                </View>
                {l.laborCost ? <Text style={styles.laborCost}>€{l.laborCost.toFixed(2)}</Text> : null}
              </View>
            ))
          )}
          {totalLabor > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Labor Total</Text>
              <Text style={styles.totalValue}>€{totalLabor.toFixed(2)}</Text>
            </View>
          ) : null}
        </View>

        {/* Bill Summary */}
        {(ticket.totalAmount || 0) > 0 ? (
          <View style={styles.billCard}>
            <Text style={styles.billTitle}>Bill Summary</Text>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Parts</Text>
              <Text style={styles.billValue}>€{(ticket.totalPartsAmount || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Labor</Text>
              <Text style={styles.billValue}>€{(ticket.totalLaborAmount || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.billRow, styles.billTotal]}>
              <Text style={styles.billTotalLabel}>Total (incl. VAT)</Text>
              <Text style={styles.billTotalValue}>€{(ticket.totalAmount || 0).toFixed(2)}</Text>
            </View>
            {ticket.billConfirmed ? (
              <View style={styles.confirmedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={styles.confirmedText}>Bill Confirmed</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Work Summary */}
        {ticket.workSummary ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={18} color={Colors.brand.primary} />
              <Text style={styles.cardTitle}>Work Summary</Text>
            </View>
            <Text style={styles.workSummaryText}>{ticket.workSummary}</Text>
          </View>
        ) : null}

        {/* Audit Log */}
        {(ticket.auditLog || []).length > 0 ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="history" size={18} color={Colors.brand.primary} />
              <Text style={styles.cardTitle}>Activity Log</Text>
            </View>
            {(ticket.auditLog as Array<{ id: number; action: string; description: string; createdAt: string; technicianName?: string }>).slice(0, 8).map(a => (
              <View key={a.id} style={styles.auditRow}>
                <View style={styles.auditDot} />
                <View style={styles.auditInfo}>
                  <Text style={styles.auditDesc}>{a.description}</Text>
                  <Text style={styles.auditTime}>{new Date(a.createdAt).toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Action Buttons */}
        {ticket.status !== "delivered" ? (
          <View style={styles.actionsSection}>
            {!ticket.workSummary ? (
              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowWorkSummaryModal(true)}>
                <Ionicons name="document-text-outline" size={20} color={Colors.brand.primary} />
                <Text style={styles.actionBtnText}>Submit Work Summary</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowNoteModal(true)}>
              <Ionicons name="chatbubble-outline" size={20} color={Colors.brand.primary} />
              <Text style={styles.actionBtnText}>Add Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => setShowStatusModal(true)}>
              <MaterialCommunityIcons name="swap-horizontal" size={20} color="#fff" />
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Change Status</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Add Part Modal */}
      <Modal visible={showPartsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Part</Text>
              <TouchableOpacity onPress={() => setShowPartsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              <LabeledInput label="Part Name *" value={partName} onChangeText={setPartName} placeholder="iPhone 14 Battery" />
              <LabeledInput label="Quantity" value={partQty} onChangeText={setPartQty} placeholder="1" keyboardType="numeric" />
              <LabeledInput label="Unit Price (€) *" value={partPrice} onChangeText={setPartPrice} placeholder="45.00" keyboardType="decimal-pad" />
              <LabeledInput label="Warranty Period" value={partWarranty} onChangeText={setPartWarranty} placeholder="6 months" />
              <TouchableOpacity style={styles.modalBtn} onPress={handleAddPart}>
                <Text style={styles.modalBtnText}>Add Part</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Labor Modal */}
      <Modal visible={showLaborModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Labor</Text>
              <TouchableOpacity onPress={() => setShowLaborModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.laborModeRow}>
              <TouchableOpacity
                style={[styles.laborModeBtn, laborMode === "timer" && styles.laborModeBtnActive]}
                onPress={() => setLaborMode("timer")}
              >
                <Ionicons name="timer-outline" size={20} color={laborMode === "timer" ? "#fff" : Colors.light.textSecondary} />
                <Text style={[styles.laborModeBtnText, laborMode === "timer" && styles.laborModeBtnTextActive]}>Start Timer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.laborModeBtn, laborMode === "manual" && styles.laborModeBtnActive]}
                onPress={() => setLaborMode("manual")}
              >
                <Ionicons name="create-outline" size={20} color={laborMode === "manual" ? "#fff" : Colors.light.textSecondary} />
                <Text style={[styles.laborModeBtnText, laborMode === "manual" && styles.laborModeBtnTextActive]}>Manual Hours</Text>
              </TouchableOpacity>
            </View>
            {laborMode === "timer" ? (
              <TouchableOpacity style={styles.modalBtn} onPress={handleStartTimer}>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.modalBtnText}>Start Timer</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 12 }}>
                <LabeledInput label="Hours Worked" value={manualHours} onChangeText={setManualHours} placeholder="1.5" keyboardType="decimal-pad" />
                <TouchableOpacity style={styles.modalBtn} onPress={handleAddManualLabor}>
                  <Text style={styles.modalBtnText}>Log Labor</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Work Summary Modal */}
      <Modal visible={showWorkSummaryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Work Summary</Text>
              <TouchableOpacity onPress={() => setShowWorkSummaryModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>Required before marking ticket as Ready for Pickup</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={workSummary}
              onChangeText={setWorkSummary}
              placeholder="Describe the repair performed, parts replaced, and test results..."
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <TouchableOpacity style={[styles.modalBtn, { marginTop: 12 }]} onPress={handleSubmitWorkSummary}>
              <Text style={styles.modalBtnText}>Submit Summary</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Note Modal */}
      <Modal visible={showNoteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Note</Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note to this ticket..."
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity style={[styles.modalBtn, { marginTop: 12 }]} onPress={handleAddNote}>
              <Text style={styles.modalBtnText}>Add Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Status Change Modal */}
      <Modal visible={showStatusModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              {STATUS_FLOW.map(s => {
                const color = STATUS_COLORS[s.key as keyof typeof STATUS_COLORS];
                const isCurrent = ticket.status === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[
                      styles.statusOption,
                      { borderColor: color.bg },
                      isCurrent && { backgroundColor: color.bg },
                    ]}
                    onPress={() => {
                      if (!isCurrent) {
                        setTargetStatus(s.key);
                        handleStatusChange(s.key);
                      }
                    }}
                    disabled={isCurrent}
                  >
                    <View style={[styles.statusDot, { backgroundColor: isCurrent ? "#fff" : color.bg }]} />
                    <Text style={[styles.statusOptionText, isCurrent && { color: "#fff" }]}>{s.label}</Text>
                    {isCurrent ? <Text style={styles.currentTag}>Current</Text> : null}
                  </TouchableOpacity>
                );
              })}
              <View style={{ gap: 6 }}>
                <Text style={styles.modalLabel}>Reason (required for backward transitions)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={statusReason}
                  onChangeText={setStatusReason}
                  placeholder="Optional reason..."
                  placeholderTextColor={Colors.light.textSecondary}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LabeledInput({ label, value, onChangeText, placeholder, keyboardType = "default" }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "email-address";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.modalLabel}>{label}</Text>
      <TextInput
        style={styles.modalInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: Colors.light.textSecondary, fontFamily: "Inter_400Regular" },
  content: { padding: 16 },
  statusBanner: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceId: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)", letterSpacing: 0.5 },
  statusLabel: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, paddingBottom: 10 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 14 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.text },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.brand.primary },
  infoRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.light.border },
  infoLabel: { width: 90, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text },
  emptySection: { padding: 14, paddingTop: 4, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  partRow: { flexDirection: "row", alignItems: "center", padding: 14, borderTopWidth: 1, borderTopColor: Colors.light.border, gap: 8 },
  partInfo: { flex: 1 },
  partName: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.text },
  partSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  partTotal: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.text },
  laborRow: { flexDirection: "row", alignItems: "center", padding: 14, borderTopWidth: 1, borderTopColor: Colors.light.border },
  laborInfo: { flex: 1 },
  laborHours: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  laborTech: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  laborCost: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.brand.primary },
  totalRow: { flexDirection: "row", padding: 14, borderTopWidth: 1, borderTopColor: Colors.light.border, backgroundColor: Colors.light.background },
  totalLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  totalValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.brand.primary },
  billCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 10,
  },
  billTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  billRow: { flexDirection: "row", justifyContent: "space-between" },
  billLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  billValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#fff" },
  billTotal: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", paddingTop: 10, marginTop: 4 },
  billTotalLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  billTotalValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.brand.primary },
  confirmedBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  confirmedText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#22C55E" },
  workSummaryText: { padding: 14, paddingTop: 4, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 22 },
  auditRow: { flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: Colors.light.border },
  auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand.primary, marginTop: 5 },
  auditInfo: { flex: 1 },
  auditDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, lineHeight: 18 },
  auditTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginTop: 3 },
  actionsSection: { gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
  },
  actionBtnPrimary: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  actionBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.brand.primary },
  actionBtnTextPrimary: { color: "#fff" },
  timerCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#22C55E",
  },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  timerText: { flex: 1, fontSize: 28, fontFamily: "Inter_700Bold", color: "#22C55E", fontVariant: ["tabular-nums"] as ("tabular-nums")[] },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stopBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.light.backgroundAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  modalHint: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginBottom: 12 },
  modalLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  modalInput: {
    height: 48,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalInputMultiline: { height: 120, paddingTop: 12, textAlignVertical: "top" },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.brand.primary,
  },
  modalBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  laborModeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  laborModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  laborModeBtnActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  laborModeBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
  laborModeBtnTextActive: { color: "#fff" },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.text },
  currentTag: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  qrContainer: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, paddingTop: 4 },
  qrInfo: { flex: 1, gap: 6 },
  qrLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text, lineHeight: 18 },
  qrUrl: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 16 },
  qrOpenBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  qrOpenBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.brand.primary },
});
