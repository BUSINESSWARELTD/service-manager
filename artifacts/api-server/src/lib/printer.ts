import net from "net";
import { db, settingsTable } from "@workspace/db";

/**
 * Generate TSPL label for TSC MB241T printer
 * Includes: Service ID as barcode, customer name, date, device info
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
  const desc = problemDescription.substring(0, 40);

  return [
    "SIZE 60 mm, 40 mm",
    "GAP 2 mm, 0",
    "DIRECTION 0",
    "CLS",
    `TEXT 10,5,"3",0,1,1,"${serviceId}"`,
    `TEXT 10,35,"2",0,1,1,"${customerName.substring(0, 25)}"`,
    `TEXT 10,55,"2",0,1,1,"${deviceBrand} ${deviceModel.substring(0, 20)}"`,
    `TEXT 10,75,"1",0,1,1,"${desc}"`,
    `TEXT 10,95,"1",0,1,1,"Date: ${date}"`,
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
