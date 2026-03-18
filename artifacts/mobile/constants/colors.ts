export const STATUS_COLORS = {
  received: { bg: "#64748B", light: "#F1F5F9", text: "#fff", label: "Received" },
  diagnosing: { bg: "#3B82F6", light: "#EFF6FF", text: "#fff", label: "Diagnosing" },
  repairing: { bg: "#F97316", light: "#FFF7ED", text: "#fff", label: "Repairing" },
  waiting_for_parts: { bg: "#EAB308", light: "#FEFCE8", text: "#fff", label: "Waiting Parts" },
  ready_for_pickup: { bg: "#22C55E", light: "#F0FDF4", text: "#fff", label: "Ready" },
  delivered: { bg: "#1E293B", light: "#F8FAFC", text: "#fff", label: "Delivered" },
};

const BRAND = {
  primary: "#FF6B35",
  primaryDark: "#E85A22",
  secondary: "#1E293B",
  accent: "#22C55E",
};

const Colors = {
  brand: BRAND,
  light: {
    text: "#0F172A",
    textSecondary: "#64748B",
    background: "#F8FAFC",
    backgroundAlt: "#FFFFFF",
    border: "#E2E8F0",
    card: "#FFFFFF",
    tint: BRAND.primary,
    tabIconDefault: "#94A3B8",
    tabIconSelected: BRAND.primary,
    inputBackground: "#F1F5F9",
    divider: "#E2E8F0",
  },
};

export default Colors;
