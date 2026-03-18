import puppeteer from "puppeteer-core";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CHROMIUM_PATH =
  "/nix/store/m7qi78k6711fpwnrm4r2kn4p3ga3jal9-ungoogled-chromium-123.0.6312.105/bin/chromium";

const HTML_FILE = join(ROOT, "ServiceManager_Manual.html");
const OUTPUT_PDF = join(ROOT, "ServiceManager_Εγχειρίδιο_Χρήσης.pdf");

if (!existsSync(HTML_FILE)) {
  console.error(`HTML file not found: ${HTML_FILE}`);
  process.exit(1);
}

if (!existsSync(CHROMIUM_PATH)) {
  console.error(`Chromium not found at: ${CHROMIUM_PATH}`);
  process.exit(1);
}

console.log("Launching Chromium...");
const browser = await puppeteer.launch({
  executablePath: CHROMIUM_PATH,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--font-render-hinting=none",
  ],
});

const page = await browser.newPage();

const fileUrl = `file://${HTML_FILE}`;
console.log(`Loading: ${fileUrl}`);

await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 60000 });

// Allow fonts/images to fully render
await new Promise((r) => setTimeout(r, 2000));

console.log("Generating PDF...");
await page.pdf({
  path: OUTPUT_PDF,
  format: "A4",
  printBackground: true,
  margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  displayHeaderFooter: false,
});

await browser.close();
console.log(`✅ PDF δημιουργήθηκε: ${OUTPUT_PDF}`);
