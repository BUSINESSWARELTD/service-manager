import net from "net";
import { db, settingsTable } from "@workspace/db";

/**
 * Build the public status URL for a ticket.
 * Uses REPLIT_DOMAINS env var (primary domain) at runtime.
 */
function buildStatusUrl(serviceId: string): string {
  const domains = process.env.REPLIT_DOMAINS ?? "";
  const primary = domains.split(",")[0]?.trim();
  if (primary) return `https://${primary}/status/${serviceId}`;
  return `https://service.example.com/status/${serviceId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LABEL 1 — Device label (stays on the device, for technicians)
// Size: 60 mm × 40 mm | Layout: text left, service-ID QR right, barcode bottom
// Technician scans the QR → Scan tab → ticket opens instantly in the app
// ─────────────────────────────────────────────────────────────────────────────
export function generateTSPLLabel(params: {
  serviceId: string;
  customerName: string;
  deviceBrand: string;
  deviceModel: string;
  problemDescription: string;
  date: string;
}): string {
  const { serviceId, customerName, deviceBrand, deviceModel, problemDescription, date } = params;

  const sid    = serviceId.substring(0, 20);
  const cust   = customerName.substring(0, 22);
  const device = `${deviceBrand} ${deviceModel}`.substring(0, 22);
  const desc   = problemDescription.substring(0, 38);

  return [
    "SIZE 60 mm, 40 mm",
    "GAP 2 mm, 0",
    "DIRECTION 0",
    "CLS",

    // Left column — text info
    `TEXT 10,5,"3",0,1,1,"${sid}"`,
    `TEXT 10,35,"2",0,1,1,"${cust}"`,
    `TEXT 10,57,"2",0,1,1,"${device}"`,
    `TEXT 10,79,"1",0,1,1,"${desc}"`,
    `TEXT 10,97,"1",0,1,1,"${date}"`,

    // Right column — QR code with service ID (tech scans → opens ticket)
    `QRCODE 350,5,"M",4,A,0,"${serviceId}"`,

    // Bottom — Code 128 barcode for legacy scanners
    `BARCODE 10,115,"128",50,1,0,2,2,"${serviceId}"`,

    "PRINT 1",
    "",
  ].join("\r\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// LABEL 2 — Customer voucher (customer takes home)
// Size: 60 mm × 60 mm | Larger label so it's easy to read
// QR code links to the PUBLIC status page — customer scans from home to track
// ─────────────────────────────────────────────────────────────────────────────
export function generateCustomerVoucherLabel(params: {
  serviceId: string;
  customerName: string;
  deviceBrand: string;
  deviceModel: string;
  date: string;
  shopName?: string;
  shopPhone?: string;
}): string {
  const {
    serviceId,
    customerName,
    deviceBrand,
    deviceModel,
    date,
    shopName  = "Υπηρεσία Επισκευής",
    shopPhone = "",
  } = params;

  const statusUrl = buildStatusUrl(serviceId);
  const cust      = customerName.substring(0, 24);
  const device    = `${deviceBrand} ${deviceModel}`.substring(0, 24);
  const shop      = shopName.substring(0, 26);
  const phone     = shopPhone.substring(0, 20);

  const lines: string[] = [
    "SIZE 60 mm, 60 mm",
    "GAP 2 mm, 0",
    "DIRECTION 0",
    "CLS",

    // ── Header: shop name ─────────────────────────────────────────
    `TEXT 10,5,"2",0,1,1,"${shop}"`,
    ...(phone ? [`TEXT 10,28,"1",0,1,1,"${phone}"`] : []),

    // ── Divider line ─────────────────────────────────────────────
    "BAR 10,45,460,2",

    // ── Left column: ticket info ──────────────────────────────────
    `TEXT 10,55,"3",0,1,1,"${serviceId.substring(0, 18)}"`,
    `TEXT 10,88,"2",0,1,1,"${cust}"`,
    `TEXT 10,112,"2",0,1,1,"${device}"`,
    `TEXT 10,136,"1",0,1,1,"${date}"`,

    // ── Right column: QR code with PUBLIC status URL ───────────────
    // Customer scans this to track their repair online
    `QRCODE 340,55,"M",4,A,0,"${statusUrl}"`,
    `TEXT 340,165,"1",0,1,1,"SCAN ME"`,

    // ── Footer ────────────────────────────────────────────────────
    "BAR 10,182,460,2",
    `TEXT 10,190,"1",0,1,1,"Σκανάρετε για ενημέρωση κατάστασης"`,
    `TEXT 10,206,"1",0,1,1,"επισκευής χωρίς τηλεφώνημα"`,

    "PRINT 1",
    "",
  ];

  return lines.join("\r\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Send TSPL job to TSC MB241T via WiFi TCP socket
// ─────────────────────────────────────────────────────────────────────────────
export async function printLabel(tsplCommands: string): Promise<void> {
  const [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings?.printerIp) {
    console.log("Printer IP not configured, skipping print");
    return;
  }

  const ip   = settings.printerIp;
  const port = settings.printerPort || 9100;

  return new Promise((resolve) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      console.error("Printer connection timeout");
      resolve();
    }, 5000);

    client.connect(port, ip, () => {
      client.write(tsplCommands, "utf8", () => {
        clearTimeout(timeout);
        client.destroy();
        console.log(`Label sent to printer at ${ip}:${port}`);
        resolve();
      });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.error("Printer error:", err.message);
      resolve();
    });
  });
}
