import { Router, type Request, type Response } from "express";
import path from "path";
import { existsSync } from "fs";

const router = Router();

router.get("/download/manual", (_req: Request, res: Response): void => {
  const candidates = [
    "/home/runner/workspace/ServiceManager_Εγχειρίδιο_Χρήσης.pdf",
    path.join(process.cwd(), "../../ServiceManager_Εγχειρίδιο_Χρήσης.pdf"),
    path.join(process.cwd(), "../ServiceManager_Εγχειρίδιο_Χρήσης.pdf"),
    path.join(process.cwd(), "ServiceManager_Εγχειρίδιο_Χρήσης.pdf"),
  ];

  const pdfPath = candidates.find((p) => existsSync(p));

  if (!pdfPath) {
    res.status(404).json({ error: "Manual PDF not found" });
    return;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="ServiceManager_Manual.pdf"');
  res.sendFile(pdfPath);
});

export default router;
