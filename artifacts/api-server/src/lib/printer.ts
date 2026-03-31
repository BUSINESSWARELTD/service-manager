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
// Size: 60 mm × 40 mm = 480 × 320 dots @ 203 dpi
//
// Font widths @ 203dpi:  font1=8px/char  font2=12px/char  font3=16px/char
// Left column X=10, QR at X=338 → max text width = 328px
//   font3 max: 328/16 = ~20 chars
//   font2 max: 328/12 = ~27 chars
//   font1 max: 328/8  = ~41 chars
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

  const sid     = serviceId.substring(0, 20);
  const cust    = customerName.substring(0, 27);
  const device  = `${deviceBrand} ${deviceModel}`.substring(0, 27);
  const desc1   = problemDescription.substring(0, 38);
  const desc2   = problemDescription.length > 38 ? problemDescription.substring(38, 76) : "";

  return [
    "SIZE 60 mm, 40 mm",
    "GAP 2 mm, 0",
    "DIRECTION 0",
    "CLS",

    // ── Service ID (large, top-left) ───────────────────────────────
    `TEXT 10,5,"3",0,1,1,"${sid}"`,

    // ── Customer & device ──────────────────────────────────────────
    `TEXT 10,35,"2",0,1,1,"${cust}"`,
    `TEXT 10,60,"2",0,1,1,"${device}"`,

    // ── Problem description (up to 2 lines) ────────────────────────
    `TEXT 10,86,"1",0,1,1,"${desc1}"`,
    ...(desc2 ? [`TEXT 10,100,"1",0,1,1,"${desc2}"`] : []),

    // ── Date ───────────────────────────────────────────────────────
    `TEXT 10,118,"1",0,1,1,"${date}"`,

    // ── QR code (right column) — tech scans → opens ticket in app ──
    `QRCODE 338,5,"M",4,A,0,"${serviceId}"`,

    // ── Divider ────────────────────────────────────────────────────
    "BAR 10,136,460,2",

    // ── Code 128 barcode (tall = easy to scan with gun/terminal) ───
    `BARCODE 10,142,"128",110,1,0,2,2,"${serviceId}"`,

    "PRINT 1",
    "",
  ].join("\r\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// LABEL 2 — Customer voucher (customer takes home)
// Size: 60 mm × 40 mm = 480 × 320 dots @ 203 dpi
// QR links to the PUBLIC status page — customer scans to track repair online
// ─────────────────────────────────────────────────────────────────────────────
export function generateCustomerVoucherLabel(params: {
  serviceId: string;
  customerName: string;
  customerPhone?: string;
  deviceBrand: string;
  deviceModel: string;
  date: string;
  shopName?: string;
  shopPhone?: string;
}): string {
  const {
    serviceId,
    customerName,
    customerPhone = "",
    deviceBrand,
    deviceModel,
    date,
    shopName  = "Υπηρεσία Επισκευής",
    shopPhone = "",
  } = params;

  const statusUrl = buildStatusUrl(serviceId);
  const cust      = customerName.substring(0, 26);
  const custPhone = customerPhone.substring(0, 20);
  const device    = `${deviceBrand} ${deviceModel}`.substring(0, 26);
  const shop      = shopName.substring(0, 26);
  const phone     = shopPhone.substring(0, 20);

  // At 203dpi: QR module 3 → 3px/module. For serviceId URL (~50 chars)
  // QR version ~5 = 37×37 modules × 3 = 111 dots (13.9mm).
  // Place QR at X=335, Y=50 → ends at X=446, Y=161

  return [
    "SIZE 60 mm, 40 mm",
    "GAP 2 mm, 0",
    "DIRECTION 0",
    "CLS",

    // ── Header: shop info ──────────────────────────────────────────
    `TEXT 10,5,"2",0,1,1,"${shop}"`,
    ...(phone ? [`TEXT 10,28,"1",0,1,1,"Tel: ${phone}"`] : []),

    // ── Divider ────────────────────────────────────────────────────
    "BAR 10,44,460,2",

    // ── Service ID (prominent) ─────────────────────────────────────
    `TEXT 10,50,"3",0,1,1,"${serviceId.substring(0, 18)}"`,

    // ── Customer info ──────────────────────────────────────────────
    `TEXT 10,80,"1",0,1,1,"Πελατης: ${cust}"`,
    ...(custPhone ? [`TEXT 10,94,"1",0,1,1,"Τηλ: ${custPhone}"`] : []),

    // ── Device & date ──────────────────────────────────────────────
    `TEXT 10,${custPhone ? 110 : 94},"1",0,1,1,"Συσκ: ${device}"`,
    `TEXT 10,${custPhone ? 124 : 108},"1",0,1,1,"Ημ/νια: ${date}"`,

    // ── QR code (right column) — public status URL ─────────────────
    `QRCODE 335,50,"M",3,A,0,"${statusUrl}"`,

    // ── Footer ─────────────────────────────────────────────────────
    "BAR 10,166,460,2",
    `TEXT 10,172,"1",0,1,1,"Σκανάρετε το QR για"`,
    `TEXT 10,186,"1",0,1,1,"κατάσταση επισκευής online"`,

    "PRINT 1",
    "",
  ].join("\r\n");
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
