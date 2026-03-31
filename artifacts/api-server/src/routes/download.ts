import { Router, type Request, type Response } from "express";
import path from "path";
import { existsSync } from "fs";

const router = Router();

const MANUALS_DIR = path.join(process.cwd(), "manuals");

router.get("/download/manual", (_req: Request, res: Response): void => {
  const candidates = [
    path.join(MANUALS_DIR, "manual_gr.pdf"),
    path.join(MANUALS_DIR, "ServiceManager_Εγχειρίδιο_Χρήσης.pdf"),
    "/home/runner/workspace/ServiceManager_Εγχειρίδιο_Χρήσης.pdf",
  ];

  const pdfPath = candidates.find((p) => existsSync(p));

  if (!pdfPath) {
    res.status(404).json({ error: "Manual PDF not found" });
    return;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="ServiceManager_Egxeiridio.pdf"');
  res.sendFile(pdfPath);
});

router.get("/download/manual/en", (_req: Request, res: Response): void => {
  const candidates = [
    path.join(MANUALS_DIR, "ServiceManager_User_Manual.pdf"),
    "/home/runner/workspace/ServiceManager_User_Manual.pdf",
  ];

  const pdfPath = candidates.find((p) => existsSync(p));

  if (!pdfPath) {
    res.status(404).json({ error: "Manual PDF not found" });
    return;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="ServiceManager_User_Manual.pdf"');
  res.sendFile(pdfPath);
});

export default router;
