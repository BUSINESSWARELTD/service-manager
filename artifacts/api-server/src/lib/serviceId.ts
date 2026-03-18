/**
 * Generates a unique Service ID in format SRV-YYYYMMDD-XXXX
 */
export function generateServiceId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
  return `SRV-${datePart}-${randomPart}`;
}

export const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  diagnosing: "Diagnosing",
  repairing: "In Repair",
  waiting_for_parts: "Waiting for Parts",
  ready_for_pickup: "Ready for Pickup",
  delivered: "Delivered",
};

export const STATUS_ORDER = [
  "received",
  "diagnosing",
  "repairing",
  "waiting_for_parts",
  "ready_for_pickup",
  "delivered",
];
