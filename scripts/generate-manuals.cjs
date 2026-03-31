const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD    = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const OUTPUT_DIR   = path.join(__dirname, "../.canvas/assets");

const BRAND  = "#FF6B35";
const DARK   = "#1A202C";
const GRAY   = "#718096";
const LIGHT  = "#F7FAFC";
const WHITE  = "#FFFFFF";
const LINE   = "#E2E8F0";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const ML = 55, MR = 55, MT = 55, MB = 65;
const CW = PAGE_W - ML - MR;

// ─── helpers ──────────────────────────────────────────────────────

function setFont(doc, bold, size) {
  doc.font(bold ? FONT_BOLD : FONT_REGULAR).fontSize(size);
}

function ensureSpace(doc, y, need) {
  if (y + need > PAGE_H - MB) {
    doc.addPage({ size: "A4", margins: { top: MT, bottom: MB, left: ML, right: MR } });
    return MT;
  }
  return y;
}

function drawRect(doc, x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

function drawLine(doc, x1, y1, x2, y2, color, lw) {
  doc.save().moveTo(x1, y1).lineTo(x2, y2)
     .strokeColor(color).lineWidth(lw).stroke().restore();
}

// ─── content blocks ───────────────────────────────────────────────

function chapterHeading(doc, title) {
  doc.addPage({ size: "A4", margins: { top: MT, bottom: MB, left: ML, right: MR } });
  const barH = 46;
  drawRect(doc, ML, MT, CW, barH, BRAND);
  setFont(doc, true, 20);
  const th = doc.heightOfString(title, { width: CW - 28 });
  const ty = MT + (barH - th) / 2;
  doc.fill(WHITE).text(title, ML + 14, ty, { width: CW - 28 });
  doc.fill(DARK);
  return MT + barH + 18;
}

function sectionHeading(doc, y, title) {
  setFont(doc, true, 12);
  const th = doc.heightOfString(title, { width: CW });
  y = ensureSpace(doc, y, th + 22);
  y += 10;
  doc.fill(BRAND).text(title, ML, y, { width: CW });
  y += th + 3;
  drawLine(doc, ML, y, ML + CW, y, BRAND, 0.8);
  doc.fill(DARK);
  return y + 8;
}

function bodyText(doc, y, text) {
  setFont(doc, false, 10.5);
  const opts = { width: CW, lineGap: 2 };
  const th = doc.heightOfString(text, opts);
  y = ensureSpace(doc, y, th + 8);
  doc.fill(DARK).text(text, ML, y, opts);
  return y + th + 8;
}

function bulletItem(doc, y, text) {
  setFont(doc, false, 10.5);
  const INDENT = 16;
  const opts = { width: CW - INDENT, lineGap: 1 };
  const th = doc.heightOfString(text, opts);
  y = ensureSpace(doc, y, th + 6);
  doc.save().circle(ML + 5, y + 5, 2.5).fill(BRAND).restore();
  doc.fill(DARK).text(text, ML + INDENT, y, opts);
  return y + th + 5;
}

function numberedStep(doc, y, num, text) {
  setFont(doc, false, 10.5);
  const INDENT = 22;
  const opts = { width: CW - INDENT, lineGap: 1 };
  const th = doc.heightOfString(text, opts);
  y = ensureSpace(doc, y, th + 6);
  setFont(doc, true, 10.5);
  doc.fill(BRAND).text(`${num}.`, ML, y, { width: 18, lineBreak: false });
  setFont(doc, false, 10.5);
  doc.fill(DARK).text(text, ML + INDENT, y, opts);
  return y + th + 5;
}

function noteBox(doc, y, text) {
  setFont(doc, false, 10);
  const PAD = 10;
  const opts = { width: CW - PAD * 2 - 6, lineGap: 2 };
  const th = doc.heightOfString(text, opts);
  const boxH = th + PAD * 2;
  y = ensureSpace(doc, y, boxH + 14);
  drawRect(doc, ML, y, CW, boxH, LIGHT);
  drawRect(doc, ML, y, 3, boxH, BRAND);
  doc.fill(GRAY).text(text, ML + PAD + 5, y + PAD, opts);
  doc.fill(DARK);
  return y + boxH + 14;
}

function drawTable(doc, y, rows, colWidths) {
  const PAD_X = 7, PAD_Y = 5;

  // measure every row first
  const rowMetas = rows.map((row, ri) => {
    setFont(doc, ri === 0, 9.5);
    const h = Math.max(...row.map((cell, ci) =>
      doc.heightOfString(cell, { width: colWidths[ci] * CW - PAD_X * 2, lineGap: 1 })
    )) + PAD_Y * 2;
    return h;
  });

  y = ensureSpace(doc, y, rowMetas[0] + 4);

  rows.forEach((row, ri) => {
    const rowH = rowMetas[ri];
    const isHeader = ri === 0;

    // page break mid-table
    if (y + rowH > PAGE_H - MB) {
      doc.addPage({ size: "A4", margins: { top: MT, bottom: MB, left: ML, right: MR } });
      y = MT;
      // re-draw header on new page
      const hH = rowMetas[0];
      drawRect(doc, ML, y, CW, hH, BRAND);
      let hx = ML;
      rows[0].forEach((cell, ci) => {
        setFont(doc, true, 9.5);
        doc.fill(WHITE).text(cell, hx + PAD_X, y + PAD_Y, {
          width: colWidths[ci] * CW - PAD_X * 2, lineGap: 1,
        });
        hx += colWidths[ci] * CW;
      });
      y += hH;
    }

    drawRect(doc, ML, y, CW, rowH, isHeader ? BRAND : (ri % 2 === 0 ? WHITE : LIGHT));
    drawLine(doc, ML, y + rowH, ML + CW, y + rowH, LINE, 0.4);

    let x = ML;
    row.forEach((cell, ci) => {
      const colW = colWidths[ci] * CW;
      setFont(doc, isHeader, 9.5);
      doc.fill(isHeader ? WHITE : DARK).text(cell, x + PAD_X, y + PAD_Y, {
        width: colW - PAD_X * 2, lineGap: 1,
      });
      x += colW;
    });

    y += rowH;
  });

  doc.fill(DARK);
  return y + 14;
}

function addFooters(doc, T) {
  const range = doc.bufferedPageRange();
  const total = range.count - 1;
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawLine(doc, ML, PAGE_H - MB + 6, ML + CW, PAGE_H - MB + 6, LINE, 0.5);
    setFont(doc, false, 8.5);
    doc.fill(GRAY).text(
      `Service Manager  |  BUSINESSWARE M LTD  |  ${T.page} ${i} / ${total}`,
      ML, PAGE_H - MB + 13, { width: CW, align: "center" }
    );
  }
}

// ─── BUILDER ─────────────────────────────────────────────────────

function buildManual(lang) {
  const isGR = lang === "gr";
  const T = isGR ? STRINGS_GR : STRINGS_EN;

  const doc = new PDFDocument({
    size: "A4",
    autoFirstPage: false,
    bufferPages: true,
    info: { Title: T.docTitle, Author: "BUSINESSWARE M LTD", Subject: T.docSubject },
  });

  const outPath = path.join(OUTPUT_DIR, isGR ? "manual_gr.pdf" : "manual_en.pdf");
  doc.pipe(fs.createWriteStream(outPath));

  // COVER
  doc.addPage({ size: "A4", margins: { top: MT, bottom: MB, left: ML, right: MR } });
  drawRect(doc, 0, 0, PAGE_W, PAGE_H, "#0F172A");
  drawRect(doc, 0, 0, PAGE_W, 6, BRAND);
  drawRect(doc, 0, PAGE_H - 6, PAGE_W, 6, BRAND);
  drawRect(doc, ML, 148, CW, 3, BRAND);

  setFont(doc, true, 36);
  doc.fill(WHITE).text("Service Manager", ML, 165, { width: CW, align: "center" });
  setFont(doc, false, 16);
  doc.fill(BRAND).text(T.coverSubtitle, ML, 218, { width: CW, align: "center" });
  drawRect(doc, ML + 40, 255, CW - 80, 1, "#334155");
  setFont(doc, false, 12);
  doc.fill("#94A3B8").text("BUSINESSWARE M LTD", ML, 270, { width: CW, align: "center" });
  setFont(doc, false, 11);
  doc.fill("#CBD5E1").text(T.coverFor, ML, 340, { width: CW, align: "center" });
  setFont(doc, true, 14);
  doc.fill(WHITE).text("MEFERI ME61", ML, 362, { width: CW, align: "center" });
  setFont(doc, false, 10);
  doc.fill("#475569").text(`${T.coverVersion} 1.0  |  ${T.coverDate}`, ML, PAGE_H - 108, { width: CW, align: "center" });

  // TOC
  doc.addPage({ size: "A4", margins: { top: MT, bottom: MB, left: ML, right: MR } });
  let y = MT;
  setFont(doc, true, 22);
  doc.fill(BRAND).text(T.tocTitle, ML, y, { width: CW, align: "center" });
  y += 34;
  drawLine(doc, ML, y, ML + CW, y, BRAND, 1);
  y += 18;
  T.toc.forEach((item, i) => {
    setFont(doc, false, 11);
    const num = String(i + 1).padStart(2, " ");
    const line = `${num}.   ${item}`;
    const th = doc.heightOfString(line, { width: CW });
    doc.fill(DARK).text(line, ML, y, { width: CW });
    y += th + 9;
  });

  // CH 1
  y = chapterHeading(doc, T.ch1Title);
  y = bodyText(doc, y, T.ch1Body1);
  y = bodyText(doc, y, T.ch1Body2);
  y = sectionHeading(doc, y, T.ch1KeyFeaturesTitle);
  T.ch1Features.forEach(f => { y = bulletItem(doc, y, f); });

  // CH 2
  y = chapterHeading(doc, T.ch2Title);
  y = bodyText(doc, y, T.ch2Body);
  y = sectionHeading(doc, y, T.ch2StepsTitle);
  T.ch2Steps.forEach((s, i) => { y = numberedStep(doc, y, i + 1, s); });
  y += 6;
  y = noteBox(doc, y, T.ch2Note);

  // CH 3
  y = chapterHeading(doc, T.ch3Title);
  y = bodyText(doc, y, T.ch3Body);
  y += 4;
  y = drawTable(doc, y, [[T.tblRole, T.tblPin, T.tblAccess], ...T.ch3Roles], [0.3, 0.18, 0.52]);
  y = noteBox(doc, y, T.ch3Note);

  // CH 4
  y = chapterHeading(doc, T.ch4Title);
  y = bodyText(doc, y, T.ch4Body);
  y = sectionHeading(doc, y, T.ch4Sec1);
  T.ch4Chips.forEach(c => { y = bulletItem(doc, y, c); });
  y = sectionHeading(doc, y, T.ch4Sec2);
  T.ch4Cards.forEach(c => { y = bulletItem(doc, y, c); });
  y = sectionHeading(doc, y, T.ch4Sec3);
  y = bodyText(doc, y, T.ch4SearchBody);

  // CH 5
  y = chapterHeading(doc, T.ch5Title);
  y = bodyText(doc, y, T.ch5Body);
  y = sectionHeading(doc, y, T.ch5FieldsTitle);
  T.ch5Fields.forEach(f => { y = bulletItem(doc, y, f); });
  y += 6;
  y = noteBox(doc, y, T.ch5Note);

  // CH 6
  y = chapterHeading(doc, T.ch6Title);
  y = bodyText(doc, y, T.ch6Body);
  y = sectionHeading(doc, y, T.ch6StatusTitle);
  y = drawTable(doc, y, [[T.tblStatus, T.tblDescription], ...T.ch6Statuses], [0.32, 0.68]);
  y = sectionHeading(doc, y, T.ch6ActionsTitle);
  T.ch6Actions.forEach(a => { y = bulletItem(doc, y, a); });

  // CH 7
  y = chapterHeading(doc, T.ch7Title);
  y = bodyText(doc, y, T.ch7Body);
  y = sectionHeading(doc, y, T.ch7HowTitle);
  T.ch7Steps.forEach((s, i) => { y = numberedStep(doc, y, i + 1, s); });

  // CH 8
  y = chapterHeading(doc, T.ch8Title);
  y = bodyText(doc, y, T.ch8Body);
  y = sectionHeading(doc, y, T.ch8Label1Title);
  T.ch8Label1.forEach(l => { y = bulletItem(doc, y, l); });
  y = sectionHeading(doc, y, T.ch8Label2Title);
  T.ch8Label2.forEach(l => { y = bulletItem(doc, y, l); });
  y += 6;
  y = noteBox(doc, y, T.ch8Note);

  // CH 9
  y = chapterHeading(doc, T.ch9Title);
  y = bodyText(doc, y, T.ch9Body);
  y += 4;
  y = drawTable(doc, y, [[T.tblMetric, T.tblDesc], ...T.ch9Metrics], [0.36, 0.64]);

  // CH 10
  y = chapterHeading(doc, T.ch10Title);
  y = bodyText(doc, y, T.ch10Body);
  T.ch10Sections.forEach(s => {
    y = sectionHeading(doc, y, s.title);
    s.items.forEach(item => { y = bulletItem(doc, y, item); });
  });

  // CH 11
  y = chapterHeading(doc, T.ch11Title);
  y = bodyText(doc, y, T.ch11Body);
  y = sectionHeading(doc, y, T.ch11AddTitle);
  T.ch11AddSteps.forEach((s, i) => { y = numberedStep(doc, y, i + 1, s); });
  y = sectionHeading(doc, y, T.ch11EditTitle);
  T.ch11EditSteps.forEach((s, i) => { y = numberedStep(doc, y, i + 1, s); });
  y = sectionHeading(doc, y, T.ch11RemoveTitle);
  y = bodyText(doc, y, T.ch11RemoveBody);
  y = noteBox(doc, y, T.ch11Note);

  // CH 12
  y = chapterHeading(doc, T.ch12Title);
  y = bodyText(doc, y, T.ch12Body);
  T.ch12Items.forEach(i => { y = bulletItem(doc, y, i); });

  // CH 13
  y = chapterHeading(doc, T.ch13Title);
  y = bodyText(doc, y, T.ch13Body);
  y = sectionHeading(doc, y, T.ch13SmsTitle);
  T.ch13SmsSteps.forEach((s, i) => { y = numberedStep(doc, y, i + 1, s); });
  y = sectionHeading(doc, y, T.ch13EmailTitle);
  T.ch13EmailSteps.forEach((s, i) => { y = numberedStep(doc, y, i + 1, s); });
  y += 6;
  y = noteBox(doc, y, T.ch13Note);

  addFooters(doc, T);
  doc.end();
  console.log(`Generated: ${outPath}`);
}

// ═══════════════════════════════════════════════════════════════════
const STRINGS_GR = {
  docTitle: "Service Manager - Εγχειρίδιο Χρήστη",
  docSubject: "Οδηγός χρήσης εφαρμογής διαχείρισης επισκευών",
  coverSubtitle: "Εγχειρίδιο Χρήστη",
  coverFor: "Βελτιστοποιημένο για",
  coverVersion: "Έκδοση",
  coverDate: "Μάρτιος 2026",
  tocTitle: "Περιεχόμενα",
  page: "Σελίδα",
  tblRole: "Ρόλος", tblPin: "PIN", tblAccess: "Πρόσβαση",
  tblStatus: "Κατάσταση", tblDescription: "Περιγραφή",
  tblMetric: "Δείκτης", tblDesc: "Περιγραφή",
  toc: ["Εισαγωγή","Εγκατάσταση","Σύνδεση (Login)","Κεντρική Οθόνη","Δημιουργία Δελτίου","Στοιχεία Δελτίου & Καταστάσεις","Σκανάρισμα Barcode / QR","Εκτύπωση Ετικετών","Στατιστικά","Ρυθμίσεις","Διαχείριση Τεχνικών","Αποθήκη Ανταλλακτικών","Ειδοποιήσεις SMS & Email"],

  ch1Title: "1. Εισαγωγή",
  ch1Body1: "Το Service Manager είναι μια εφαρμογή διαχείρισης επισκευών ηλεκτρικών εργαλείων, σχεδιασμένη ειδικά για το εργαστήριο της BUSINESSWARE M LTD. Καλύπτει όλο τον κύκλο ζωής μιας επισκευής, από την παραλαβή της συσκευής έως την παράδοσή της στον πελάτη.",
  ch1Body2: "Η εφαρμογή είναι βελτιστοποιημένη για χρήση στο φορητό τερματικό MEFERI ME61 (Android) αλλά λειτουργεί εξίσου καλά από οποιοδήποτε Android κινητό ή tablet.",
  ch1KeyFeaturesTitle: "Κύρια Χαρακτηριστικά",
  ch1Features: [
    "Πλήρης κύκλος ζωής δελτίου με 6 καταστάσεις: Παραλαβή, Διάγνωση, Επισκευή, Αναμονή Εξαρτημάτων, Έτοιμο, Παραδόθηκε",
    "Παρακολούθηση ανταλλακτικών και εργασίας ανά δελτίο",
    "Σκανάρισμα barcode και QR code για άμεσο άνοιγμα δελτίου",
    "Εκτύπωση ετικετών 60x40mm στον εκτυπωτή TSC MB241T μέσω WiFi",
    "Αυτόματες ειδοποιήσεις πελάτη μέσω SMS (Twilio) και Email (SMTP)",
    "Δημόσια σελίδα κατάστασης επισκευής χωρίς απαίτηση σύνδεσης",
    "Πίνακας στατιστικών με έσοδα, χρόνο επισκευής και κατανομή καταστάσεων",
    "Σύνδεση με PIN με ξεχωριστά δικαιώματα Manager και Τεχνικός",
  ],

  ch2Title: "2. Εγκατάσταση",
  ch2Body: "Η εφαρμογή εγκαθίσταται ως αρχείο APK (Android Package) και δεν απαιτεί Google Play Store.",
  ch2StepsTitle: "Βήματα Εγκατάστασης",
  ch2Steps: [
    "Ανοίξτε τον browser (Chrome) στη συσκευή Android.",
    "Μεταβείτε στο σύνδεσμο λήψης που σας έχει δοθεί.",
    "Πατήστε Λήψη. Το APK αρχείο θα κατεβεί αυτόματα.",
    "Ανοίξτε το αρχείο από τις Λήψεις. Αν ζητηθεί άδεια για Άγνωστες Πηγές, δώστε την.",
    "Πατήστε Εγκατάσταση και περιμένετε να ολοκληρωθεί η διαδικασία.",
    "Ανοίξτε την εφαρμογή Service Manager από την οθόνη αφετηρίας.",
  ],
  ch2Note: "Απαίτηση: Android 10 ή νεότερο. Η συσκευή πρέπει να είναι συνδεδεμένη στο δίκτυο ή στο internet για να επικοινωνεί με τον server.",

  ch3Title: "3. Σύνδεση (Login)",
  ch3Body: "Η εφαρμογή χρησιμοποιεί 4ψήφιο PIN για αναγνώριση κάθε τεχνικού. Κάθε τεχνικός έχει το δικό του μοναδικό PIN.",
  ch3Roles: [
    ["Manager", "9999", "Πλήρης πρόσβαση: ρυθμίσεις, τεχνικοί, στατιστικά, δελτία"],
    ["Τεχνικός", "1234", "Δελτία, σκανάρισμα, αποθήκη — χωρίς πρόσβαση σε ρυθμίσεις"],
    ["Τεχνικός γενικά", "2345", "Δελτία, σκανάρισμα, αποθήκη — χωρίς πρόσβαση σε ρυθμίσεις"],
  ],
  ch3Note: "Τα PIN αλλάζουν από τον Manager μέσω: Ρυθμίσεις > Τεχνικοί > εικονίδιο επεξεργασίας (μολύβι).",

  ch4Title: "4. Κεντρική Οθόνη",
  ch4Body: "Η κεντρική οθόνη (καρτέλα Δελτία) εμφανίζει όλα τα ανοιχτά δελτία και παρέχει γρήγορη πλοήγηση σε όλες τις λειτουργίες.",
  ch4Sec1: "Chips Κατάστασης — Γρήγορο Φίλτρο",
  ch4Chips: [
    "Όλα: εμφανίζει όλα τα δελτία ανεξαρτήτως κατάστασης",
    "Παραλαβή, Διάγνωση, Επισκευή, Αναμονή, Έτοιμο, Παραδόθηκε: φίλτρο ανά κατάσταση",
    "Ο αριθμός δίπλα σε κάθε κατάσταση δείχνει πόσα δελτία βρίσκονται εκεί αυτή τη στιγμή",
  ],
  ch4Sec2: "Κάρτα Δελτίου",
  ch4Cards: [
    "Κωδικός δελτίου (SRV-YYYYMMDD-XXXX)",
    "Όνομα πελάτη και αριθμός τηλεφώνου",
    "Συσκευή (μάρκα και μοντέλο)",
    "Κατάσταση με χρωματική ένδειξη",
    "Ημερομηνία παραλαβής",
  ],
  ch4Sec3: "Αναζήτηση",
  ch4SearchBody: "Πληκτρολογήστε όνομα πελάτη ή κωδικό δελτίου στο πεδίο αναζήτησης για γρήγορο εντοπισμό.",

  ch5Title: "5. Δημιουργία Νέου Δελτίου",
  ch5Body: "Πατήστε το κουμπί + πάνω δεξιά στην κεντρική οθόνη για να δημιουργήσετε νέο δελτίο επισκευής.",
  ch5FieldsTitle: "Πεδία Δελτίου",
  ch5Fields: [
    "Όνομα Πελάτη (υποχρεωτικό)",
    "Τηλέφωνο Πελάτη (υποχρεωτικό — για SMS ειδοποιήσεις)",
    "Email Πελάτη (προαιρετικό — για email ειδοποιήσεις)",
    "Μάρκα Συσκευής (υποχρεωτικό)",
    "Μοντέλο Συσκευής (υποχρεωτικό)",
    "Περιγραφή Προβλήματος (υποχρεωτικό)",
    "Ανάθεση σε Τεχνικό (προαιρετικό)",
    "Εκτιμώμενη Ημερομηνία Ολοκλήρωσης (προαιρετικό)",
  ],
  ch5Note: "Μόλις αποθηκευτεί το δελτίο, εκτυπώνονται αυτόματα 2 ετικέτες: μία για τη συσκευή (για τον τεχνικό) και μία απόδειξη για τον πελάτη, εφόσον ο εκτυπωτής είναι ρυθμισμένος στις Ρυθμίσεις.",

  ch6Title: "6. Στοιχεία Δελτίου & Καταστάσεις",
  ch6Body: "Πατήστε σε οποιοδήποτε δελτίο για να δείτε τις πλήρεις λεπτομέρειες και να αλλάξετε κατάσταση ή να προσθέσετε ανταλλακτικά.",
  ch6StatusTitle: "Κύκλος Ζωής Δελτίου",
  ch6Statuses: [
    ["Παραλαβή", "Η συσκευή παραλήφθηκε — αρχική κατάσταση"],
    ["Διάγνωση", "Ο τεχνικός εξετάζει τη συσκευή"],
    ["Επισκευή", "Η επισκευή βρίσκεται σε εξέλιξη"],
    ["Αναμονή Εξαρτημάτων", "Αναμονή παραλαβής ανταλλακτικών"],
    ["Έτοιμο", "Επισκευή ολοκληρώθηκε — ο πελάτης ειδοποιείται αυτόματα"],
    ["Παραδόθηκε", "Η συσκευή παραδόθηκε στον πελάτη"],
  ],
  ch6ActionsTitle: "Διαθέσιμες Ενέργειες",
  ch6Actions: [
    "Αλλαγή κατάστασης με ένα πάτημα",
    "Προσθήκη ανταλλακτικών και εργασίας",
    "Σκανάρισμα barcode ανταλλακτικού",
    "Αποστολή SMS ή Email στον πελάτη",
    "Επανεκτύπωση ετικετών",
    "Εμφάνιση QR code για τη δημόσια σελίδα κατάστασης",
  ],

  ch7Title: "7. Σκανάρισμα Barcode / QR",
  ch7Body: "Η εφαρμογή υποστηρίζει σκανάρισμα μέσω της καρτέλας Σκανάρισμα (άνοιγμα δελτίου) ή μέσα από δελτίο για προσθήκη ανταλλακτικών. Το τερματικό MEFERI ME61 διαθέτει ενσωματωμένο σκάνερ barcode.",
  ch7HowTitle: "Άνοιγμα Δελτίου με Σκανάρισμα",
  ch7Steps: [
    "Πατήστε την καρτέλα Σκανάρισμα στο κάτω μέρος της οθόνης.",
    "Σκανάρετε τον barcode ή QR code από την ετικέτα της συσκευής.",
    "Η εφαρμογή ανοίγει αυτόματα το αντίστοιχο δελτίο.",
    "Εναλλακτικά, πληκτρολογήστε χειροκίνητα τον κωδικό δελτίου στο πεδίο κειμένου.",
  ],

  ch8Title: "8. Εκτύπωση Ετικετών (TSC MB241T)",
  ch8Body: "Ο εκτυπωτής TSC MB241T συνδέεται μέσω WiFi (TCP/IP) και χρησιμοποιεί ρολέτα ετικετών 60x40mm. Κάθε δελτίο εκτυπώνει αυτόματα 2 ετικέτες:",
  ch8Label1Title: "Ετικέτα Συσκευής (για τον τεχνικό)",
  ch8Label1: [
    "Κωδικός δελτίου (μεγάλα γράμματα)",
    "Όνομα πελάτη και συσκευή",
    "Περιγραφή προβλήματος (μέχρι 2 γραμμές)",
    "Ημερομηνία παραλαβής",
    "QR code: σκανάρισμα ανοίγει το δελτίο στην εφαρμογή",
    "Barcode Code128: για χρήση με σαρωτή γραμμωτού κώδικα",
  ],
  ch8Label2Title: "Απόδειξη Πελάτη (για τον πελάτη)",
  ch8Label2: [
    "Όνομα και τηλέφωνο καταστήματος",
    "Κωδικός δελτίου (εμφανής)",
    "Όνομα και τηλέφωνο πελάτη",
    "Συσκευή και ημερομηνία παραλαβής",
    "QR code: ο πελάτης σκανάρει και βλέπει την κατάσταση επισκευής online",
  ],
  ch8Note: "Ρύθμιση εκτυπωτή: Ρυθμίσεις > Label Printer (TSC MB241T) > εισάγετε IP διεύθυνση και Port (προεπιλογή: 9100).",

  ch9Title: "9. Στατιστικά",
  ch9Body: "Η καρτέλα Στατιστικά παρουσιάζει δείκτες απόδοσης για 3 χρονικές περιόδους: 7 Ημέρες, 30 Ημέρες, 12 Μήνες.",
  ch9Metrics: [
    ["Συνολικά Έσοδα", "Άθροισμα ανταλλακτικών και εργασίας σε EUR"],
    ["Συνολικές Εργασίες", "Πλήθος δελτίων στην επιλεγμένη περίοδο"],
    ["Ολοκληρωμένες", "Δελτία που παραδόθηκαν στον πελάτη"],
    ["Μέσος Χρόνος Επισκευής", "Μέσος χρόνος από Παραλαβή έως Παράδοση σε ώρες"],
    ["Τάση Εσόδων", "Γράφημα ημερήσιων εσόδων για την περίοδο"],
    ["Κατανομή Καταστάσεων", "Πλήθος δελτίων ανά κατάσταση"],
  ],

  ch10Title: "10. Ρυθμίσεις",
  ch10Body: "Πρόσβαση μόνο για Manager. Πλοηγηθείτε στην καρτέλα Ρυθμίσεις και αποθηκεύστε τις αλλαγές με το κουμπί Αποθήκευση Ρυθμίσεων.",
  ch10Sections: [
    { title: "Τιμολόγηση", items: ["Ωριαία Χρέωση (EUR): προεπιλεγμένη τιμή εργασίας ανά ώρα", "ΦΠΑ (%): ποσοστό ΦΠΑ που εφαρμόζεται"] },
    { title: "Στοιχεία Καταστήματος", items: ["Όνομα καταστήματος: εμφανίζεται στην απόδειξη πελάτη", "Τηλέφωνο καταστήματος"] },
    { title: "Label Printer — TSC MB241T", items: ["IP διεύθυνση εκτυπωτή, π.χ. 192.168.1.100", "Port εκτυπωτή (προεπιλογή: 9100)"] },
    { title: "Ειδοποιήσεις SMS — Twilio", items: ["Account SID: από το Twilio dashboard", "Auth Token: κρυφό κλειδί Twilio", "Αριθμός Αποστολής: ο αριθμός από τον οποίο στέλνονται τα SMS"] },
    { title: "Ειδοποιήσεις Email — SMTP", items: ["SMTP Host και Port σύνδεσης", "Χρήστης και Κωδικός πρόσβασης SMTP", "Email Αποστολής"] },
  ],

  ch11Title: "11. Διαχείριση Τεχνικών",
  ch11Body: "Πλοήγηση: Ρυθμίσεις > Διαχείριση Τεχνικών. Διαθέσιμο μόνο για χρήστες με ρόλο Manager.",
  ch11AddTitle: "Προσθήκη Νέου Τεχνικού",
  ch11AddSteps: [
    "Πατήστε το κουμπί + πάνω δεξιά στην οθόνη.",
    "Συμπληρώστε Ονοματεπώνυμο, 4ψήφιο PIN και Ρόλο (Τεχνικός ή Manager).",
    "Πατήστε Δημιουργία για αποθήκευση.",
  ],
  ch11EditTitle: "Επεξεργασία Τεχνικού",
  ch11EditSteps: [
    "Πατήστε το εικονίδιο μολυβιού στη γραμμή του τεχνικού που θέλετε να επεξεργαστείτε.",
    "Αλλάξτε Όνομα, PIN (αφήστε κενό για να μη αλλάξει) ή Ρόλο.",
    "Πατήστε Αποθήκευση.",
  ],
  ch11RemoveTitle: "Απενεργοποίηση Τεχνικού",
  ch11RemoveBody: "Πατήστε το εικονίδιο κάδου στη γραμμή του τεχνικού και επιβεβαιώστε στο παράθυρο διαλόγου. Ο τεχνικός απενεργοποιείται και δεν μπορεί πλέον να συνδεθεί, αλλά το ιστορικό δελτίων του διατηρείται πλήρως.",
  ch11Note: "Δεν είναι δυνατή η απενεργοποίηση του τελευταίου ενεργού Manager ούτε η αλλαγή ρόλου του σε Τεχνικό αν είναι ο μοναδικός ενεργός Manager.",

  ch12Title: "12. Αποθήκη Ανταλλακτικών",
  ch12Body: "Πλοήγηση: Ρυθμίσεις > Διαχείριση Ανταλλακτικών. Διαχειριστείτε τον κατάλογο ανταλλακτικών του εργαστηρίου σας.",
  ch12Items: [
    "Προσθήκη ανταλλακτικού με κωδικό, περιγραφή, barcode και τιμή",
    "Σκανάρισμα barcode ανταλλακτικού κατευθείαν από την οθόνη δελτίου",
    "Παρακολούθηση κόστους ανταλλακτικών ανά δελτίο",
    "Τα κόστη ανταλλακτικών συνυπολογίζονται αυτόματα στα Στατιστικά Εσόδων",
  ],

  ch13Title: "13. Ειδοποιήσεις SMS & Email",
  ch13Body: "Η εφαρμογή στέλνει αυτόματες ειδοποιήσεις στον πελάτη όταν το δελτίο φτάσει στην κατάσταση Έτοιμο.",
  ch13SmsTitle: "SMS μέσω Twilio",
  ch13SmsSteps: [
    "Ρυθμίστε τα στοιχεία Twilio στις Ρυθμίσεις (Account SID, Auth Token, Αριθμός Αποστολής).",
    "Βεβαιωθείτε ότι το δελτίο έχει καταχωρημένο τηλέφωνο πελάτη.",
    "Το SMS στέλνεται αυτόματα όταν η κατάσταση αλλάξει σε Έτοιμο.",
    "Μπορείτε επίσης να στείλετε SMS χειροκίνητα ανά πάσα στιγμή από την οθόνη δελτίου.",
  ],
  ch13EmailTitle: "Email μέσω SMTP",
  ch13EmailSteps: [
    "Ρυθμίστε τα SMTP στοιχεία στις Ρυθμίσεις (Host, Port, Χρήστης, Κωδικός).",
    "Βεβαιωθείτε ότι το δελτίο έχει καταχωρημένο email πελάτη.",
    "Το email στέλνεται αυτόματα όταν η κατάσταση αλλάξει σε Έτοιμο.",
  ],
  ch13Note: "Το μήνυμα ειδοποίησης περιλαμβάνει σύνδεσμο και QR code για τη δημόσια σελίδα κατάστασης, ώστε ο πελάτης να μπορεί να παρακολουθεί την πρόοδο της επισκευής online.",
};

// ═══════════════════════════════════════════════════════════════════
const STRINGS_EN = {
  docTitle: "Service Manager - User Manual",
  docSubject: "User guide for the repair management application",
  coverSubtitle: "User Manual",
  coverFor: "Optimised for",
  coverVersion: "Version",
  coverDate: "March 2026",
  tocTitle: "Table of Contents",
  page: "Page",
  tblRole: "Role", tblPin: "PIN", tblAccess: "Access",
  tblStatus: "Status", tblDescription: "Description",
  tblMetric: "Metric", tblDesc: "Description",
  toc: ["Introduction","Installation","Login","Main Screen","Creating a Ticket","Ticket Details & Statuses","Barcode / QR Scanning","Label Printing","Analytics","Settings","Technician Management","Parts Inventory","SMS & Email Notifications"],

  ch1Title: "1. Introduction",
  ch1Body1: "Service Manager is an electric-tool repair management application designed specifically for the BUSINESSWARE M LTD workshop. It covers the complete repair lifecycle, from device intake to customer handover.",
  ch1Body2: "The application is optimised for the MEFERI ME61 Android handheld terminal but works equally well on any Android phone or tablet.",
  ch1KeyFeaturesTitle: "Key Features",
  ch1Features: [
    "Full ticket lifecycle with 6 statuses: Received, Diagnosis, Repair, Awaiting Parts, Ready, Delivered",
    "Parts and labour tracking per ticket",
    "Barcode and QR code scanning for instant ticket lookup",
    "60x40mm label printing on TSC MB241T printer via WiFi",
    "Automatic customer notifications via SMS (Twilio) and Email (SMTP)",
    "Public repair status page — no login required for customers",
    "Analytics dashboard with revenue, repair time and status breakdown",
    "PIN-based login with separate Manager and Technician roles",
  ],

  ch2Title: "2. Installation",
  ch2Body: "The app is installed as an APK (Android Package) file. No Google Play Store is required.",
  ch2StepsTitle: "Installation Steps",
  ch2Steps: [
    "Open the browser (Chrome) on your Android device.",
    "Navigate to the download link provided to you.",
    "Tap Download. The APK file will download automatically.",
    "Open the file from your Downloads folder. If prompted for Unknown Sources permission, grant it.",
    "Tap Install and wait for the process to complete.",
    "Open Service Manager from the home screen.",
  ],
  ch2Note: "Requirement: Android 10 or later. The device must be connected to the local network or the internet to communicate with the server.",

  ch3Title: "3. Login",
  ch3Body: "The app uses a 4-digit PIN to identify each technician. Every technician has their own unique PIN.",
  ch3Roles: [
    ["Manager", "9999", "Full access: settings, technicians, analytics, tickets"],
    ["Technician", "1234", "Tickets, scanning, inventory — no settings access"],
    ["General Tech", "2345", "Tickets, scanning, inventory — no settings access"],
  ],
  ch3Note: "PINs are changed by a Manager via: Settings > Technicians > pencil (edit) icon.",

  ch4Title: "4. Main Screen",
  ch4Body: "The main screen (Tickets tab) displays all open tickets and provides quick navigation to all features.",
  ch4Sec1: "Status Chips — Quick Filter",
  ch4Chips: [
    "All: shows every ticket regardless of status",
    "Received, Diagnosis, Repair, Awaiting, Ready, Delivered: filter by status",
    "The number next to each status shows how many tickets are currently in that state",
  ],
  ch4Sec2: "Ticket Card",
  ch4Cards: [
    "Ticket code (SRV-YYYYMMDD-XXXX)",
    "Customer name and phone number",
    "Device brand and model",
    "Status with colour indicator",
    "Date received",
  ],
  ch4Sec3: "Search",
  ch4SearchBody: "Type a customer name or ticket code in the search bar to quickly locate a ticket.",

  ch5Title: "5. Creating a New Ticket",
  ch5Body: "Tap the + button at the top right of the main screen to create a new repair ticket.",
  ch5FieldsTitle: "Ticket Fields",
  ch5Fields: [
    "Customer Name (required)",
    "Customer Phone (required — used for SMS notifications)",
    "Customer Email (optional — for email notifications)",
    "Device Brand (required)",
    "Device Model (required)",
    "Problem Description (required)",
    "Assign to Technician (optional)",
    "Estimated Completion Date (optional)",
  ],
  ch5Note: "Once the ticket is saved, 2 labels print automatically: one device label for the technician and one receipt for the customer, provided the printer is configured in Settings.",

  ch6Title: "6. Ticket Details & Statuses",
  ch6Body: "Tap any ticket to view full details, change its status, or add parts and labour.",
  ch6StatusTitle: "Ticket Lifecycle",
  ch6Statuses: [
    ["Received", "Device accepted — initial status"],
    ["Diagnosis", "Technician is examining the device"],
    ["Repair", "Repair is in progress"],
    ["Awaiting Parts", "Waiting for ordered parts to arrive"],
    ["Ready", "Repair complete — customer is notified automatically"],
    ["Delivered", "Device returned to the customer"],
  ],
  ch6ActionsTitle: "Available Actions",
  ch6Actions: [
    "Change status with a single tap",
    "Add parts and labour",
    "Scan a part barcode to add it instantly",
    "Send SMS or Email to the customer",
    "Reprint device label or customer receipt",
    "Show QR code link to the public status page",
  ],

  ch7Title: "7. Barcode / QR Scanning",
  ch7Body: "The app supports scanning via the Scan tab to open a ticket, or from within a ticket to add parts. The MEFERI ME61 has a built-in barcode scanner.",
  ch7HowTitle: "Opening a Ticket by Scanning",
  ch7Steps: [
    "Tap the Scan tab at the bottom of the screen.",
    "Scan the barcode or QR code on the device label.",
    "The app opens the corresponding ticket automatically.",
    "Alternatively, type the ticket code manually in the text field.",
  ],

  ch8Title: "8. Label Printing (TSC MB241T)",
  ch8Body: "The TSC MB241T printer connects via WiFi (TCP/IP) and uses a 60x40mm label roll. Every ticket prints 2 labels automatically:",
  ch8Label1Title: "Device Label (for the technician)",
  ch8Label1: [
    "Ticket code (large text)",
    "Customer name and device",
    "Problem description (up to 2 lines)",
    "Date received",
    "QR code: scan to open the ticket in the app",
    "Code128 barcode for use with a barcode scanner or gun",
  ],
  ch8Label2Title: "Customer Receipt (for the customer)",
  ch8Label2: [
    "Shop name and phone",
    "Ticket code (prominent display)",
    "Customer name and phone",
    "Device and date received",
    "QR code: customer scans to view repair status online",
  ],
  ch8Note: "Printer setup: Settings > Label Printer (TSC MB241T) > enter the IP address and Port (default: 9100).",

  ch9Title: "9. Analytics",
  ch9Body: "The Analytics tab shows performance metrics for 3 time periods: 7 Days, 30 Days, 12 Months.",
  ch9Metrics: [
    ["Total Revenue", "Sum of parts and labour costs in EUR"],
    ["Total Jobs", "Number of tickets in the selected period"],
    ["Completed", "Tickets marked as Delivered to the customer"],
    ["Avg Repair Time", "Average time from Received to Delivered in hours"],
    ["Revenue Trend", "Daily revenue bar chart for the period"],
    ["Status Breakdown", "Number of tickets in each status"],
  ],

  ch10Title: "10. Settings",
  ch10Body: "Accessible by Manager only. Navigate to the Settings tab and save changes with the Save Settings button.",
  ch10Sections: [
    { title: "Billing", items: ["Hourly Rate (EUR): default labour rate per hour", "VAT Rate (%): VAT percentage applied to invoices"] },
    { title: "Shop Information", items: ["Shop name: printed on the customer receipt label", "Shop phone number"] },
    { title: "Label Printer — TSC MB241T", items: ["Printer IP address, e.g. 192.168.1.100", "Printer Port (default: 9100)"] },
    { title: "SMS Notifications — Twilio", items: ["Account SID: from the Twilio dashboard", "Auth Token: secret Twilio key", "From Number: the number messages are sent from"] },
    { title: "Email Notifications — SMTP", items: ["SMTP Host and Port", "Username and Password", "From Email address"] },
  ],

  ch11Title: "11. Technician Management",
  ch11Body: "Navigate to: Settings > Manage Technicians. Available to Manager role only.",
  ch11AddTitle: "Adding a New Technician",
  ch11AddSteps: [
    "Tap the + button at the top right of the screen.",
    "Fill in the Full Name, 4-digit PIN and Role (Technician or Manager).",
    "Tap Create to save.",
  ],
  ch11EditTitle: "Editing a Technician",
  ch11EditSteps: [
    "Tap the pencil icon on the row of the technician you want to edit.",
    "Change Name, PIN (leave blank to keep the current PIN) or Role.",
    "Tap Save.",
  ],
  ch11RemoveTitle: "Deactivating a Technician",
  ch11RemoveBody: "Tap the bin icon on the technician's row and confirm in the dialog box. The technician is deactivated and can no longer log in, but their full ticket history is preserved.",
  ch11Note: "It is not possible to deactivate the last active Manager or to change their role to Technician if they are the only active Manager in the system.",

  ch12Title: "12. Parts Inventory",
  ch12Body: "Navigate to: Settings > Manage Parts Inventory. Manage the parts catalogue for your workshop.",
  ch12Items: [
    "Add a part with code, description, barcode and price",
    "Scan a part barcode directly from the ticket screen to add it instantly",
    "Track parts cost per ticket",
    "Parts costs are automatically included in Analytics revenue calculations",
  ],

  ch13Title: "13. SMS & Email Notifications",
  ch13Body: "The app sends automatic notifications to the customer when a ticket reaches the Ready status.",
  ch13SmsTitle: "SMS via Twilio",
  ch13SmsSteps: [
    "Configure Twilio credentials in Settings (Account SID, Auth Token, From Number).",
    "Ensure the ticket has a customer phone number.",
    "SMS is sent automatically when the status changes to Ready.",
    "You can also send an SMS manually at any time from the ticket screen.",
  ],
  ch13EmailTitle: "Email via SMTP",
  ch13EmailSteps: [
    "Configure SMTP settings in Settings (Host, Port, Username, Password).",
    "Ensure the ticket has a customer email address.",
    "Email is sent automatically when the status changes to Ready.",
  ],
  ch13Note: "The notification message includes a link and QR code to the public repair status page so customers can track the progress of their repair online.",
};

buildManual("gr");
buildManual("en");
console.log("Done.");
