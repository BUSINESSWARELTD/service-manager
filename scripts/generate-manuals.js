const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD    = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const OUTPUT_DIR   = path.join(__dirname, "../.canvas/assets");

const BRAND   = "#FF6B35";
const DARK    = "#1E293B";
const GRAY    = "#64748B";
const LIGHT   = "#F1F5F9";
const WHITE   = "#FFFFFF";

function buildManual(lang) {
  const isGR = lang === "gr";
  const T = isGR ? STRINGS_GR : STRINGS_EN;

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    info: {
      Title:   T.docTitle,
      Author:  "BUSINESSWARE M LTD",
      Subject: T.docSubject,
    },
  });

  const outPath = path.join(OUTPUT_DIR, isGR ? "manual_gr.pdf" : "manual_en.pdf");
  doc.pipe(fs.createWriteStream(outPath));

  // ── helpers ──────────────────────────────────────────────────────
  const W = doc.page.width  - doc.page.margins.left - doc.page.margins.right;

  function bold(size = 11)    { doc.font(FONT_BOLD).fontSize(size); }
  function regular(size = 11) { doc.font(FONT_REGULAR).fontSize(size); }

  function heading1(text) {
    doc.addPage();
    doc.rect(doc.page.margins.left, 60, W, 44).fill(BRAND);
    bold(22);
    doc.fill(WHITE).text(text, doc.page.margins.left + 14, 72, { width: W - 14 });
    doc.fill(DARK);
    doc.moveDown(1.8);
  }

  function heading2(text) {
    doc.moveDown(0.6);
    bold(14);
    doc.fill(BRAND).text(text);
    doc.moveTo(doc.page.margins.left, doc.y)
       .lineTo(doc.page.margins.left + W, doc.y)
       .strokeColor(BRAND).lineWidth(1).stroke();
    doc.fill(DARK);
    doc.moveDown(0.4);
    regular();
  }

  function heading3(text) {
    doc.moveDown(0.3);
    bold(11);
    doc.fill(DARK).text(text);
    regular();
  }

  function body(text, opts = {}) {
    regular(10.5);
    doc.fill(DARK).text(text, { lineGap: 3, ...opts });
  }

  function bullet(text) {
    regular(10.5);
    doc.fill(DARK).text(`• ${text}`, { indent: 12, lineGap: 2 });
  }

  function note(text) {
    const y0 = doc.y;
    doc.rect(doc.page.margins.left, y0, W, doc.heightOfString(text, { width: W - 24 }) + 14)
       .fill(LIGHT);
    regular(10);
    doc.fill(GRAY).text(text, doc.page.margins.left + 12, y0 + 7, { width: W - 24, lineGap: 2 });
    doc.moveDown(1);
    doc.fill(DARK);
  }

  function table(rows, colWidths) {
    const rowH = 22;
    const startX = doc.page.margins.left;
    let y = doc.y;

    rows.forEach((row, ri) => {
      doc.rect(startX, y, W, rowH).fill(ri === 0 ? BRAND : ri % 2 === 0 ? LIGHT : WHITE);
      let x = startX + 6;
      row.forEach((cell, ci) => {
        const fw = colWidths[ci] * W - 6;
        ri === 0 ? bold(9.5) : regular(9.5);
        doc.fill(ri === 0 ? WHITE : DARK).text(cell, x, y + 5, { width: fw, lineBreak: false });
        x += colWidths[ci] * W;
      });
      y += rowH;
    });
    doc.y = y;
    doc.moveDown(0.8);
  }

  // ─────────────────────────────────────────────────────────────────
  // COVER PAGE
  // ─────────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#0F172A");

  doc.rect(0, 0, doc.page.width, 6).fill(BRAND);
  doc.rect(0, doc.page.height - 6, doc.page.width, 6).fill(BRAND);

  bold(36);
  doc.fill(WHITE).text("Service Manager", 60, 180, { align: "center", width: W + 60 });

  bold(18);
  doc.fill(BRAND).text(T.coverSubtitle, 60, 235, { align: "center", width: W + 60 });

  regular(13);
  doc.fill("#94A3B8").text("BUSINESSWARE M LTD", 60, 290, { align: "center", width: W + 60 });

  doc.rect(130, 340, doc.page.width - 260, 1).fill("#334155");

  regular(11);
  doc.fill("#CBD5E1");
  doc.text(T.coverFor, 60, 365, { align: "center", width: W + 60 });
  bold(12);
  doc.fill(WHITE).text("MEFERI ME61", 60, 385, { align: "center", width: W + 60 });

  regular(10);
  doc.fill("#64748B").text(`${T.coverVersion} 1.0  |  ${T.coverDate}`, 60, doc.page.height - 100, { align: "center", width: W + 60 });

  // ─────────────────────────────────────────────────────────────────
  // TABLE OF CONTENTS
  // ─────────────────────────────────────────────────────────────────
  doc.addPage();
  bold(24);
  doc.fill(DARK).text(T.tocTitle, { align: "center" });
  doc.moveDown(1.5);

  T.toc.forEach((item, i) => {
    regular(11);
    doc.fill(DARK).text(`${i + 1}.  ${item}`, { indent: 10, lineGap: 6 });
  });

  // ─────────────────────────────────────────────────────────────────
  // CHAPTERS
  // ─────────────────────────────────────────────────────────────────

  // 1. INTRODUCTION
  heading1(T.ch1Title);
  body(T.ch1Body1);
  doc.moveDown(0.6);
  body(T.ch1Body2);
  doc.moveDown(0.6);
  heading2(T.ch1KeyFeaturesTitle);
  T.ch1Features.forEach(f => bullet(f));

  // 2. INSTALLATION
  heading1(T.ch2Title);
  body(T.ch2Body);
  doc.moveDown(0.6);
  heading2(T.ch2StepsTitle);
  T.ch2Steps.forEach((s, i) => {
    bold(10.5);
    doc.fill(BRAND).text(`${T.step} ${i + 1}:`, { continued: true });
    regular(10.5);
    doc.fill(DARK).text(` ${s}`, { lineGap: 3 });
  });
  doc.moveDown(0.4);
  note(T.ch2Note);

  // 3. LOGIN
  heading1(T.ch3Title);
  body(T.ch3Body);
  doc.moveDown(0.6);
  table(
    [
      [T.tblRole, T.tblPin, T.tblAccess],
      ...T.ch3Roles,
    ],
    [0.35, 0.2, 0.45]
  );
  note(T.ch3Note);

  // 4. MAIN SCREEN
  heading1(T.ch4Title);
  body(T.ch4Body);
  doc.moveDown(0.6);
  heading2(T.ch4Sec1);
  T.ch4Chips.forEach(c => bullet(c));
  heading2(T.ch4Sec2);
  T.ch4Cards.forEach(c => bullet(c));
  heading2(T.ch4Sec3);
  body(T.ch4SearchBody);

  // 5. CREATING A TICKET
  heading1(T.ch5Title);
  body(T.ch5Body);
  doc.moveDown(0.6);
  heading2(T.ch5FieldsTitle);
  T.ch5Fields.forEach(f => bullet(f));
  doc.moveDown(0.4);
  note(T.ch5Note);

  // 6. TICKET DETAILS
  heading1(T.ch6Title);
  body(T.ch6Body);
  doc.moveDown(0.6);
  heading2(T.ch6StatusTitle);
  table(
    [
      [T.tblStatus, T.tblDescription],
      ...T.ch6Statuses,
    ],
    [0.3, 0.7]
  );
  heading2(T.ch6ActionsTitle);
  T.ch6Actions.forEach(a => bullet(a));

  // 7. BARCODE SCANNING
  heading1(T.ch7Title);
  body(T.ch7Body);
  doc.moveDown(0.6);
  heading2(T.ch7HowTitle);
  T.ch7Steps.forEach((s, i) => {
    bold(10.5);
    doc.fill(BRAND).text(`${i + 1}.`, { continued: true });
    regular(10.5);
    doc.fill(DARK).text(` ${s}`, { lineGap: 3 });
  });

  // 8. LABEL PRINTING
  heading1(T.ch8Title);
  body(T.ch8Body);
  doc.moveDown(0.6);
  heading2(T.ch8Label1Title);
  T.ch8Label1.forEach(l => bullet(l));
  heading2(T.ch8Label2Title);
  T.ch8Label2.forEach(l => bullet(l));
  doc.moveDown(0.4);
  note(T.ch8Note);

  // 9. ANALYTICS
  heading1(T.ch9Title);
  body(T.ch9Body);
  doc.moveDown(0.6);
  table(
    [
      [T.tblMetric, T.tblDesc],
      ...T.ch9Metrics,
    ],
    [0.35, 0.65]
  );

  // 10. SETTINGS
  heading1(T.ch10Title);
  body(T.ch10Body);
  doc.moveDown(0.6);
  T.ch10Sections.forEach(s => {
    heading2(s.title);
    s.items.forEach(i => bullet(i));
  });

  // 11. TECHNICIANS
  heading1(T.ch11Title);
  body(T.ch11Body);
  doc.moveDown(0.6);
  heading2(T.ch11AddTitle);
  T.ch11AddSteps.forEach(s => bullet(s));
  heading2(T.ch11EditTitle);
  T.ch11EditSteps.forEach(s => bullet(s));
  heading2(T.ch11RemoveTitle);
  body(T.ch11RemoveBody);
  doc.moveDown(0.4);
  note(T.ch11Note);

  // 12. PARTS / INVENTORY
  heading1(T.ch12Title);
  body(T.ch12Body);
  doc.moveDown(0.6);
  T.ch12Items.forEach(i => bullet(i));

  // 13. NOTIFICATIONS
  heading1(T.ch13Title);
  body(T.ch13Body);
  doc.moveDown(0.6);
  heading2(T.ch13SmsTitle);
  T.ch13SmsSteps.forEach(s => bullet(s));
  heading2(T.ch13EmailTitle);
  T.ch13EmailSteps.forEach(s => bullet(s));
  doc.moveDown(0.4);
  note(T.ch13Note);

  // PAGE NUMBERS
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 1; i < totalPages; i++) {
    doc.switchToPage(i);
    regular(9);
    doc.fill(GRAY)
       .text(`Service Manager  |  BUSINESSWARE M LTD  |  ${T.page} ${i} / ${totalPages - 1}`,
             doc.page.margins.left, doc.page.height - 40,
             { align: "center", width: W });
    doc.moveTo(doc.page.margins.left, doc.page.height - 48)
       .lineTo(doc.page.margins.left + W, doc.page.height - 48)
       .strokeColor("#E2E8F0").lineWidth(0.5).stroke();
  }

  doc.end();
  console.log(`✓ ${outPath}`);
}

// ═══════════════════════════════════════════════════════════════════
// GREEK STRINGS
// ═══════════════════════════════════════════════════════════════════
const STRINGS_GR = {
  docTitle:   "Service Manager - Εγχειρίδιο Χρήστη",
  docSubject: "Οδηγός χρήσης εφαρμογής διαχείρισης επισκευών",
  coverSubtitle: "Εγχειρίδιο Χρήστη",
  coverFor:   "Βελτιστοποιημένο για",
  coverVersion: "Έκδοση",
  coverDate:  "Μάρτιος 2026",
  tocTitle:   "Περιεχόμενα",
  step:       "Βήμα",
  page:       "Σελίδα",
  tblRole: "Ρόλος", tblPin: "PIN", tblAccess: "Πρόσβαση",
  tblStatus: "Κατάσταση", tblDescription: "Περιγραφή",
  tblMetric: "Δείκτης", tblDesc: "Περιγραφή",
  toc: [
    "Εισαγωγή",
    "Εγκατάσταση",
    "Σύνδεση (Login)",
    "Κεντρική Οθόνη",
    "Δημιουργία Δελτίου",
    "Στοιχεία Δελτίου & Καταστάσεις",
    "Σκανάρισμα Barcode / QR",
    "Εκτύπωση Ετικετών",
    "Στατιστικά",
    "Ρυθμίσεις",
    "Διαχείριση Τεχνικών",
    "Αποθήκη Ανταλλακτικών",
    "Ειδοποιήσεις SMS & Email",
  ],

  // 1
  ch1Title: "1. Εισαγωγή",
  ch1Body1: "Το Service Manager είναι μια εφαρμογή διαχείρισης επισκευών ηλεκτρικών εργαλείων, σχεδιασμένη ειδικά για το εργαστήριο της BUSINESSWARE M LTD. Καλύπτει όλο τον κύκλο ζωής μιας επισκευής: από την παραλαβή της συσκευής έως την παράδοσή της στον πελάτη.",
  ch1Body2: "Η εφαρμογή είναι βελτιστοποιημένη για χρήση στο φορητό τερματικό MEFERI ME61 (Android) αλλά λειτουργεί εξίσου από οποιοδήποτε Android κινητό ή tablet.",
  ch1KeyFeaturesTitle: "Κύρια Χαρακτηριστικά",
  ch1Features: [
    "Πλήρης κύκλος ζωής δελτίου: 6 καταστάσεις (Παραλαβή → Διάγνωση → Επισκευή → Αναμονή Εξαρτημάτων → Έτοιμο → Παραδόθηκε)",
    "Παρακολούθηση ανταλλακτικών και εργασίας ανά δελτίο",
    "Σκανάρισμα barcode / QR για άμεσο άνοιγμα δελτίου",
    "Εκτύπωση ετικετών 60×40mm στον TSC MB241T (WiFi)",
    "Αυτόματες ειδοποιήσεις πελάτη μέσω SMS (Twilio) και Email (SMTP)",
    "Δημόσια σελίδα κατάστασης επισκευής (χωρίς σύνδεση)",
    "Πίνακας στατιστικών (έσοδα, χρόνος επισκευής, κατανομή καταστάσεων)",
    "Σύνδεση με PIN — ξεχωριστά δικαιώματα Manager / Τεχνικός",
  ],

  // 2
  ch2Title: "2. Εγκατάσταση",
  ch2Body: "Η εφαρμογή εγκαθίσταται ως APK (Android Package) και δεν απαιτεί Google Play Store.",
  ch2StepsTitle: "Βήματα Εγκατάστασης",
  ch2Steps: [
    "Ανοίξτε τον browser (Chrome) στη συσκευή Android.",
    "Μεταβείτε στο σύνδεσμο λήψης που σας έχει δοθεί.",
    "Πατήστε 'Λήψη' — το APK αρχείο θα κατεβεί αυτόματα.",
    "Ανοίξτε το αρχείο από τις Λήψεις. Αν ζητηθεί άδεια για 'Άγνωστες Πηγές', δώστε την.",
    "Πατήστε 'Εγκατάσταση' και περιμένετε να ολοκληρωθεί.",
    "Ανοίξτε την εφαρμογή 'Service Manager' από την οθόνη αφετηρίας.",
  ],
  ch2Note: "Απαίτηση: Android 10 ή νεότερο. Η συσκευή πρέπει να είναι συνδεδεμένη στο τοπικό δίκτυο ή στο internet για να επικοινωνεί με τον server.",

  // 3
  ch3Title: "3. Σύνδεση (Login)",
  ch3Body: "Η εφαρμογή χρησιμοποιεί 4ψήφιο PIN για αναγνώριση τεχνικού. Κάθε τεχνικός έχει το δικό του PIN.",
  ch3Roles: [
    ["Manager", "9999", "Πλήρη πρόσβαση: ρυθμίσεις, τεχνικοί, στατιστικά, δελτία"],
    ["Τεχνικός", "1234", "Δελτία, σκανάρισμα, αποθήκη — όχι ρυθμίσεις"],
    ["Τεχνικός γενικά", "2345", "Δελτία, σκανάρισμα, αποθήκη — όχι ρυθμίσεις"],
  ],
  ch3Note: "Τα PIN αλλάζουν από τον Manager μέσω Ρυθμίσεις → Τεχνικοί → Επεξεργασία.",

  // 4
  ch4Title: "4. Κεντρική Οθόνη",
  ch4Body: "Η κεντρική οθόνη (καρτέλα Δελτία) εμφανίζει όλα τα ανοιχτά δελτία και παρέχει γρήγορη πλοήγηση.",
  ch4Sec1: "Chips Κατάστασης (ταχύτητα φίλτρου)",
  ch4Chips: [
    "Όλα — εμφανίζει όλα τα δελτία",
    "Παραλαβή, Διάγνωση, Επισκευή, Αναμονή, Έτοιμο, Παραδόθηκε — φίλτρο ανά κατάσταση",
    "Ο αριθμός δίπλα σε κάθε κατάσταση δείχνει πόσα δελτία βρίσκονται εκεί",
  ],
  ch4Sec2: "Κάρτα Δελτίου",
  ch4Cards: [
    "Κωδικός δελτίου (SRV-YYYYMMDD-XXXX)",
    "Όνομα πελάτη & αριθμός τηλεφώνου",
    "Συσκευή (μάρκα & μοντέλο)",
    "Κατάσταση με χρωματική ένδειξη",
    "Ημερομηνία παραλαβής",
  ],
  ch4Sec3: "Αναζήτηση",
  ch4SearchBody: "Πληκτρολογήστε όνομα πελάτη ή κωδικό δελτίου στο πεδίο αναζήτησης για γρήγορο εντοπισμό.",

  // 5
  ch5Title: "5. Δημιουργία Νέου Δελτίου",
  ch5Body: "Πατήστε το κουμπί '+' πάνω δεξιά στην κεντρική οθόνη για να δημιουργήσετε νέο δελτίο.",
  ch5FieldsTitle: "Απαραίτητα Πεδία",
  ch5Fields: [
    "Όνομα Πελάτη *",
    "Τηλέφωνο Πελάτη * (χρησιμοποιείται για SMS ειδοποιήσεις)",
    "Email Πελάτη (προαιρετικό — για email ειδοποιήσεις)",
    "Μάρκα Συσκευής *",
    "Μοντέλο Συσκευής *",
    "Περιγραφή Προβλήματος *",
    "Ανάθεση σε Τεχνικό (προαιρετικό)",
    "Εκτιμώμενη Ημ/νία Ολοκλήρωσης (προαιρετικό)",
  ],
  ch5Note: "Μόλις αποθηκευτεί το δελτίο, εκτυπώνονται αυτόματα 2 ετικέτες: μία για τη συσκευή και μία απόδειξη για τον πελάτη (αν ο εκτυπωτής είναι ρυθμισμένος).",

  // 6
  ch6Title: "6. Στοιχεία Δελτίου & Καταστάσεις",
  ch6Body: "Πατήστε σε οποιοδήποτε δελτίο για να δείτε τις πλήρεις λεπτομέρειες και να αλλάξετε κατάσταση.",
  ch6StatusTitle: "Κύκλος Ζωής Δελτίου",
  ch6Statuses: [
    ["Παραλαβή",       "Η συσκευή παραλήφθηκε — αρχική κατάσταση"],
    ["Διάγνωση",       "Ο τεχνικός εξετάζει τη συσκευή"],
    ["Επισκευή",       "Η επισκευή βρίσκεται σε εξέλιξη"],
    ["Αναμονή Εξ/κών","Αναμονή παραλαβής ανταλλακτικών"],
    ["Έτοιμο",         "Η επισκευή ολοκληρώθηκε — ο πελάτης ειδοποιείται αυτόματα"],
    ["Παραδόθηκε",     "Η συσκευή παραδόθηκε στον πελάτη"],
  ],
  ch6ActionsTitle: "Ενέργειες από την Οθόνη Δελτίου",
  ch6Actions: [
    "Αλλαγή κατάστασης με ένα πάτημα",
    "Προσθήκη ανταλλακτικών / εργασίας",
    "Σκανάρισμα ανταλλακτικού με barcode",
    "Αποστολή SMS ή Email στον πελάτη",
    "Επανεκτύπωση ετικετών",
    "Εμφάνιση QR σύνδεσης δημόσιας σελίδας",
  ],

  // 7
  ch7Title: "7. Σκανάρισμα Barcode / QR",
  ch7Body: "Η εφαρμογή υποστηρίζει σκανάρισμα από την καρτέλα 'Σκανάρισμα' ή από την οθόνη δελτίου για ανταλλακτικά. Το τερματικό MEFERI ME61 διαθέτει ενσωματωμένο σκάνερ barcode.",
  ch7HowTitle: "Πώς να Σκανάρετε Δελτίο",
  ch7Steps: [
    "Πατήστε την καρτέλα 'Σκανάρισμα' στο κάτω μέρος της οθόνης.",
    "Σκανάρετε τον barcode ή QR code από την ετικέτα της συσκευής.",
    "Η εφαρμογή ανοίγει αυτόματα το αντίστοιχο δελτίο.",
    "Εναλλακτικά, πληκτρολογήστε χειροκίνητα τον κωδικό δελτίου.",
  ],

  // 8
  ch8Title: "8. Εκτύπωση Ετικετών (TSC MB241T)",
  ch8Body: "Ο εκτυπωτής TSC MB241T συνδέεται μέσω WiFi (TCP/IP). Χρησιμοποιεί ρολέτα ετικετών 60×40mm. Κάθε δελτίο εκτυπώνει αυτόματα 2 ετικέτες:",
  ch8Label1Title: "Ετικέτα Συσκευής (για τον τεχνικό)",
  ch8Label1: [
    "Κωδικός δελτίου (μεγάλα γράμματα)",
    "Όνομα πελάτη & συσκευή",
    "Περιγραφή προβλήματος (2 γραμμές)",
    "Ημερομηνία παραλαβής",
    "QR code → ο τεχνικός σκανάρει και ανοίγει το δελτίο",
    "Barcode Code128 (για σαρωτή γραμμωτού κώδικα)",
  ],
  ch8Label2Title: "Απόδειξη Πελάτη (για τον πελάτη)",
  ch8Label2: [
    "Όνομα & τηλέφωνο καταστήματος",
    "Κωδικός δελτίου (εμφανής)",
    "Όνομα & τηλέφωνο πελάτη",
    "Συσκευή & ημερομηνία",
    "QR code → ο πελάτης σκανάρει και βλέπει την κατάσταση online",
  ],
  ch8Note: "Ρύθμιση εκτυπωτή: Ρυθμίσεις → Label Printer (TSC MB241T) → εισάγετε IP και Port (προεπιλογή: 9100).",

  // 9
  ch9Title: "9. Στατιστικά",
  ch9Body: "Η καρτέλα Στατιστικά παρουσιάζει δείκτες απόδοσης για 3 χρονικές περιόδους: 7 Ημέρες, 30 Ημέρες, 12 Μήνες.",
  ch9Metrics: [
    ["Συνολικά Έσοδα", "Άθροισμα ανταλλακτικών + εργασίας (€)"],
    ["Συνολικές Εργασίες", "Πλήθος δελτίων στην επιλεγμένη περίοδο"],
    ["Ολοκληρωμένες", "Δελτία που παραδόθηκαν"],
    ["Μέσος Χρόνος Επισκευής", "Μέσος χρόνος από Παραλαβή έως Παράδοση (ώρες)"],
    ["Τάση Εσόδων", "Γράφημα ημερήσιων εσόδων"],
    ["Κατανομή Καταστάσεων", "Πόσα δελτία σε κάθε κατάσταση"],
  ],

  // 10
  ch10Title: "10. Ρυθμίσεις",
  ch10Body: "Πρόσβαση μόνο για Manager. Ρυθμίσεις → αποθήκευση με το κουμπί 'Αποθήκευση Ρυθμίσεων'.",
  ch10Sections: [
    {
      title: "Τιμολόγηση",
      items: ["Ωριαία Χρέωση (€) — προεπιλεγμένη τιμή εργασίας", "ΦΠΑ (%) — ποσοστό ΦΠΑ"]
    },
    {
      title: "Στοιχεία Καταστήματος",
      items: ["Όνομα καταστήματος — εκτυπώνεται στην απόδειξη πελάτη", "Τηλέφωνο καταστήματος"]
    },
    {
      title: "Label Printer (TSC MB241T)",
      items: ["IP Εκτυπωτή — π.χ. 192.168.1.100", "Port Εκτυπωτή — προεπιλογή: 9100"]
    },
    {
      title: "Ειδοποιήσεις SMS (Twilio)",
      items: ["Account SID — από το Twilio dashboard", "Auth Token — κρυφό κλειδί Twilio", "Αριθμός Αποστολής — ο αριθμός από τον οποίο στέλνονται τα SMS"]
    },
    {
      title: "Ειδοποιήσεις Email (SMTP)",
      items: ["SMTP Host, Port", "Χρήστης & Κωδικός πρόσβασης", "Email Αποστολής"]
    },
  ],

  // 11
  ch11Title: "11. Διαχείριση Τεχνικών",
  ch11Body: "Πρόσβαση: Ρυθμίσεις → Διαχείριση Τεχνικών (μόνο Manager).",
  ch11AddTitle: "Προσθήκη Νέου Τεχνικού",
  ch11AddSteps: [
    "Πατήστε το '+' πάνω δεξιά.",
    "Συμπληρώστε Ονοματεπώνυμο, 4ψήφιο PIN και Ρόλο.",
    "Πατήστε 'Δημιουργία'.",
  ],
  ch11EditTitle: "Επεξεργασία Τεχνικού (αλλαγή ρόλου / PIN)",
  ch11EditSteps: [
    "Πατήστε το εικονίδιο ✏️ στη γραμμή του τεχνικού.",
    "Αλλάξτε Όνομα, PIN (αφήστε κενό αν δεν θέλετε αλλαγή) ή Ρόλο.",
    "Πατήστε 'Αποθήκευση'.",
  ],
  ch11RemoveTitle: "Απενεργοποίηση Τεχνικού",
  ch11RemoveBody: "Πατήστε το εικονίδιο 🗑️ στη γραμμή του τεχνικού. Επιβεβαιώστε στο παράθυρο διαλόγου. Ο τεχνικός απενεργοποιείται (δεν μπορεί να συνδεθεί), αλλά το ιστορικό δελτίων του διατηρείται.",
  ch11Note: "Δεν είναι δυνατή η απενεργοποίηση του τελευταίου ενεργού Manager ούτε η αλλαγή ρόλου του σε Τεχνικό αν είναι ο μοναδικός Manager.",

  // 12
  ch12Title: "12. Αποθήκη Ανταλλακτικών",
  ch12Body: "Πρόσβαση: Ρυθμίσεις → Διαχείριση Ανταλλακτικών. Διαχειριστείτε τον κατάλογο ανταλλακτικών.",
  ch12Items: [
    "Προσθήκη ανταλλακτικού με κωδικό, περιγραφή, barcode και τιμή",
    "Σκανάρισμα barcode ανταλλακτικού από την οθόνη δελτίου",
    "Παρακολούθηση κόστους ανταλλακτικών ανά δελτίο",
    "Τα ανταλλακτικά συνυπολογίζονται στα Στατιστικά Εσόδων",
  ],

  // 13
  ch13Title: "13. Ειδοποιήσεις SMS & Email",
  ch13Body: "Η εφαρμογή στέλνει αυτόματες ειδοποιήσεις στον πελάτη όταν το δελτίο φτάσει στην κατάσταση 'Έτοιμο'.",
  ch13SmsTitle: "SMS μέσω Twilio",
  ch13SmsSteps: [
    "Ρυθμίστε τα στοιχεία Twilio στις Ρυθμίσεις.",
    "Βεβαιωθείτε ότι το δελτίο έχει τηλέφωνο πελάτη.",
    "Το SMS στέλνεται αυτόματα όταν η κατάσταση γίνει 'Έτοιμο'.",
    "Μπορείτε επίσης να στείλετε χειροκίνητα από την οθόνη δελτίου.",
  ],
  ch13EmailTitle: "Email μέσω SMTP",
  ch13EmailSteps: [
    "Ρυθμίστε τα SMTP στοιχεία στις Ρυθμίσεις.",
    "Βεβαιωθείτε ότι το δελτίο έχει email πελάτη.",
    "Το email στέλνεται αυτόματα όταν η κατάσταση γίνει 'Έτοιμο'.",
  ],
  ch13Note: "Το μήνυμα ειδοποίησης περιλαμβάνει σύνδεσμο / QR για τη δημόσια σελίδα κατάστασης επισκευής.",
};

// ═══════════════════════════════════════════════════════════════════
// ENGLISH STRINGS
// ═══════════════════════════════════════════════════════════════════
const STRINGS_EN = {
  docTitle:   "Service Manager - User Manual",
  docSubject: "User guide for the repair management application",
  coverSubtitle: "User Manual",
  coverFor:   "Optimised for",
  coverVersion: "Version",
  coverDate:  "March 2026",
  tocTitle:   "Table of Contents",
  step:       "Step",
  page:       "Page",
  tblRole: "Role", tblPin: "PIN", tblAccess: "Access",
  tblStatus: "Status", tblDescription: "Description",
  tblMetric: "Metric", tblDesc: "Description",
  toc: [
    "Introduction",
    "Installation",
    "Login",
    "Main Screen",
    "Creating a Ticket",
    "Ticket Details & Statuses",
    "Barcode / QR Scanning",
    "Label Printing",
    "Analytics",
    "Settings",
    "Technician Management",
    "Parts Inventory",
    "SMS & Email Notifications",
  ],

  // 1
  ch1Title: "1. Introduction",
  ch1Body1: "Service Manager is an electric-tool repair management application designed specifically for the BUSINESSWARE M LTD workshop. It covers the complete repair lifecycle: from device intake to customer handover.",
  ch1Body2: "The application is optimised for the MEFERI ME61 Android handheld terminal but works equally well on any Android phone or tablet.",
  ch1KeyFeaturesTitle: "Key Features",
  ch1Features: [
    "Full ticket lifecycle: 6 statuses (Received → Diagnosis → Repair → Awaiting Parts → Ready → Delivered)",
    "Parts and labour tracking per ticket",
    "Barcode / QR scanning for instant ticket lookup",
    "60×40mm label printing on TSC MB241T (WiFi)",
    "Automatic customer notifications via SMS (Twilio) and Email (SMTP)",
    "Public repair status page (no login required)",
    "Analytics dashboard (revenue, repair time, status breakdown)",
    "PIN-based login — separate Manager / Technician roles",
  ],

  // 2
  ch2Title: "2. Installation",
  ch2Body: "The app is installed as an APK (Android Package) — no Google Play Store required.",
  ch2StepsTitle: "Installation Steps",
  ch2Steps: [
    "Open the browser (Chrome) on your Android device.",
    "Navigate to the download link provided to you.",
    "Tap 'Download' — the APK file will download automatically.",
    "Open the file from Downloads. If prompted for 'Unknown Sources' permission, grant it.",
    "Tap 'Install' and wait for the process to complete.",
    "Open 'Service Manager' from the home screen.",
  ],
  ch2Note: "Requirement: Android 10 or later. The device must be connected to the local network or the internet to communicate with the server.",

  // 3
  ch3Title: "3. Login",
  ch3Body: "The app uses a 4-digit PIN to identify each technician. Every technician has their own PIN.",
  ch3Roles: [
    ["Manager", "9999", "Full access: settings, technicians, analytics, tickets"],
    ["Technician", "1234", "Tickets, scanning, inventory — no settings"],
    ["General Tech", "2345", "Tickets, scanning, inventory — no settings"],
  ],
  ch3Note: "PINs are changed by a Manager via Settings → Technicians → Edit (pencil icon).",

  // 4
  ch4Title: "4. Main Screen",
  ch4Body: "The main screen (Tickets tab) displays all open tickets and provides quick navigation.",
  ch4Sec1: "Status Chips (quick filter)",
  ch4Chips: [
    "All — shows every ticket",
    "Received, Diagnosis, Repair, Awaiting, Ready, Delivered — filter by status",
    "The number next to each status shows how many tickets are in that state",
  ],
  ch4Sec2: "Ticket Card",
  ch4Cards: [
    "Ticket code (SRV-YYYYMMDD-XXXX)",
    "Customer name & phone number",
    "Device (brand & model)",
    "Status with colour indicator",
    "Date received",
  ],
  ch4Sec3: "Search",
  ch4SearchBody: "Type a customer name or ticket code in the search bar to quickly locate a ticket.",

  // 5
  ch5Title: "5. Creating a New Ticket",
  ch5Body: "Tap the '+' button at the top right of the main screen to create a new ticket.",
  ch5FieldsTitle: "Required Fields",
  ch5Fields: [
    "Customer Name *",
    "Customer Phone * (used for SMS notifications)",
    "Customer Email (optional — for email notifications)",
    "Device Brand *",
    "Device Model *",
    "Problem Description *",
    "Assign to Technician (optional)",
    "Estimated Completion Date (optional)",
  ],
  ch5Note: "Once the ticket is saved, 2 labels are printed automatically: one for the device and one receipt for the customer (if the printer is configured).",

  // 6
  ch6Title: "6. Ticket Details & Statuses",
  ch6Body: "Tap any ticket to view full details and change its status.",
  ch6StatusTitle: "Ticket Lifecycle",
  ch6Statuses: [
    ["Received",        "Device accepted — initial status"],
    ["Diagnosis",       "Technician is examining the device"],
    ["Repair",          "Repair is in progress"],
    ["Awaiting Parts",  "Waiting for parts to arrive"],
    ["Ready",           "Repair complete — customer is notified automatically"],
    ["Delivered",       "Device returned to the customer"],
  ],
  ch6ActionsTitle: "Actions from the Ticket Screen",
  ch6Actions: [
    "Change status with a single tap",
    "Add parts / labour",
    "Scan a part barcode",
    "Send SMS or Email to the customer",
    "Reprint labels",
    "Show QR code for the public status page",
  ],

  // 7
  ch7Title: "7. Barcode / QR Scanning",
  ch7Body: "The app supports scanning from the 'Scan' tab or from within a ticket to add parts. The MEFERI ME61 has a built-in barcode scanner.",
  ch7HowTitle: "How to Scan a Ticket",
  ch7Steps: [
    "Tap the 'Scan' tab at the bottom of the screen.",
    "Scan the barcode or QR code on the device label.",
    "The app opens the corresponding ticket automatically.",
    "Alternatively, type the ticket code manually.",
  ],

  // 8
  ch8Title: "8. Label Printing (TSC MB241T)",
  ch8Body: "The TSC MB241T printer connects via WiFi (TCP/IP). It uses a 60×40mm label roll. Every ticket prints 2 labels automatically:",
  ch8Label1Title: "Device Label (for the technician)",
  ch8Label1: [
    "Ticket code (large text)",
    "Customer name & device",
    "Problem description (up to 2 lines)",
    "Date received",
    "QR code — technician scans to open the ticket",
    "Code128 barcode (for barcode gun / scanner)",
  ],
  ch8Label2Title: "Customer Receipt (for the customer)",
  ch8Label2: [
    "Shop name & phone",
    "Ticket code (prominent)",
    "Customer name & phone",
    "Device & date",
    "QR code — customer scans to view repair status online",
  ],
  ch8Note: "Printer setup: Settings → Label Printer (TSC MB241T) → enter IP and Port (default: 9100).",

  // 9
  ch9Title: "9. Analytics",
  ch9Body: "The Analytics tab shows performance metrics for 3 periods: 7 Days, 30 Days, 12 Months.",
  ch9Metrics: [
    ["Total Revenue", "Sum of parts + labour (EUR)"],
    ["Total Jobs", "Number of tickets in the selected period"],
    ["Completed", "Tickets marked as Delivered"],
    ["Avg Repair Time", "Average time from Received to Delivered (hours)"],
    ["Revenue Trend", "Daily revenue bar chart"],
    ["Status Breakdown", "How many tickets are in each status"],
  ],

  // 10
  ch10Title: "10. Settings",
  ch10Body: "Accessible by Manager only. Settings → save with the 'Save Settings' button.",
  ch10Sections: [
    {
      title: "Billing",
      items: ["Hourly Rate (EUR) — default labour rate", "VAT Rate (%) — VAT percentage"]
    },
    {
      title: "Shop Information",
      items: ["Shop name — printed on customer receipt", "Shop phone number"]
    },
    {
      title: "Label Printer (TSC MB241T)",
      items: ["Printer IP — e.g. 192.168.1.100", "Printer Port — default: 9100"]
    },
    {
      title: "SMS Notifications (Twilio)",
      items: ["Account SID — from Twilio dashboard", "Auth Token — secret Twilio key", "From Number — the number messages are sent from"]
    },
    {
      title: "Email Notifications (SMTP)",
      items: ["SMTP Host, Port", "Username & Password", "From Email address"]
    },
  ],

  // 11
  ch11Title: "11. Technician Management",
  ch11Body: "Access: Settings → Manage Technicians (Manager only).",
  ch11AddTitle: "Adding a New Technician",
  ch11AddSteps: [
    "Tap the '+' button at the top right.",
    "Fill in the Full Name, 4-digit PIN and Role.",
    "Tap 'Create'.",
  ],
  ch11EditTitle: "Editing a Technician (change role / PIN)",
  ch11EditSteps: [
    "Tap the ✏️ icon on the technician's row.",
    "Change Name, PIN (leave blank to keep unchanged) or Role.",
    "Tap 'Save'.",
  ],
  ch11RemoveTitle: "Deactivating a Technician",
  ch11RemoveBody: "Tap the 🗑️ icon on the technician's row and confirm in the dialog. The technician is deactivated (cannot log in), but their ticket history is preserved.",
  ch11Note: "It is not possible to deactivate the last active Manager or to demote them to Technician if they are the only Manager.",

  // 12
  ch12Title: "12. Parts Inventory",
  ch12Body: "Access: Settings → Manage Parts Inventory. Manage your parts catalogue.",
  ch12Items: [
    "Add a part with code, description, barcode and price",
    "Scan a part barcode from the ticket screen",
    "Track parts cost per ticket",
    "Parts are included in Analytics revenue calculations",
  ],

  // 13
  ch13Title: "13. SMS & Email Notifications",
  ch13Body: "The app sends automatic notifications to the customer when a ticket reaches the 'Ready' status.",
  ch13SmsTitle: "SMS via Twilio",
  ch13SmsSteps: [
    "Configure Twilio credentials in Settings.",
    "Ensure the ticket has a customer phone number.",
    "SMS is sent automatically when status changes to 'Ready'.",
    "You can also send manually from the ticket screen.",
  ],
  ch13EmailTitle: "Email via SMTP",
  ch13EmailSteps: [
    "Configure SMTP settings in Settings.",
    "Ensure the ticket has a customer email address.",
    "Email is sent automatically when status changes to 'Ready'.",
  ],
  ch13Note: "The notification message includes a link / QR code to the public repair status page.",
};

// run
buildManual("gr");
buildManual("en");
console.log("Done.");
