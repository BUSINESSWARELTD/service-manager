import net from "net";
import { db, settingsTable } from "@workspace/db";

/**
 * Generate TSPL label for TSC MB241T printer
 * Layout (60mm × 40mm):
 *   Left side  — text info (service ID, customer, device, problem, date)
 *   Right side — QR code containing service ID (tech scans → opens ticket)
 *   Bottom     — Code 128 barcode for legacy scanners
 */
export function generateTSPLLabel(params: {
  serviceId: string;
  customerName: string;
  deviceBrand: string;
  deviceModel: string;
  problemDescription: string;
  date: string;
}): string {
  const { serviceId, customerName, deviceBrand, deviceModel, problemDescription, date } = params;

  const sid = serviceId.substring(0, 20);
  const cust = customerName.substring(0, 22);
  const device = `${deviceBrand} ${deviceModel}`.substring(0, 22);
  const desc = problemDescription.substring(0, 38);

  return [
    "SIZE 60 mm, 40 mm",
    "GAP 2 mm, 0",
    "DIRECTION 0",
    "CLS",

    // ── Left column: text ──────────────────────────────────────────
    // Font "3" = 16×24 px per char  |  1x scale → 16 dots/char
    `TEXT 10,5,"3",0,1,1,"${sid}"`,
    // Font "2" = 12×20 px per char  |  1x scale → 12 dots/char
    `TEXT 10,35,"2",0,1,1,"${cust}"`,
    `TEXT 10,57,"2",0,1,1,"${device}"`,
    // Font "1" = 8×12 px per char   |  1x scale → 8 dots/char
    `TEXT 10,79,"1",0,1,1,"${desc}"`,
    `TEXT 10,97,"1",0,1,1,"${date}"`,

    // ── Right column: QR code (service ID) ────────────────────────
    // QRCODE x,y,ECC,cellWidth,mode,rotation,"data"
    // x=350 → 43.75 mm from left edge, cellWidth=4 → ~100×100 dots (12.5 mm)
    `QRCODE 350,5,"M",4,A,0,"${serviceId}"`,

    // ── Bottom: Code 128 barcode (legacy scanners) ─────────────────
    // Starts at y=115 (14.4 mm), height=50 dots (6.25 mm)
    `BARCODE 10,115,"128",50,1,0,2,2,"${serviceId}"`,

    "PRINT 1",
    "",
  ].join("\r\n");
}

/**
 * Send print job to TSC MB241T over WiFi TCP socket
 */
export async function printLabel(tsplCommands: string): Promise<void> {
  const [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings?.printerIp) {
    console.log("Printer IP not configured, skipping print");
    return;
  }

  const ip = settings.printerIp;
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
