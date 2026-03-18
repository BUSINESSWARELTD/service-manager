import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// PDF manual download endpoint
app.get("/download/manual", (_req: Request, res: Response): void => {
  const candidates = [
    path.join(process.cwd(), "../../ServiceManager_Εγχειρίδιο_Χρήσης.pdf"),
    path.join(process.cwd(), "../ServiceManager_Εγχειρίδιο_Χρήσης.pdf"),
    path.join(process.cwd(), "ServiceManager_Εγχειρίδιο_Χρήσης.pdf"),
    "/home/runner/workspace/ServiceManager_Εγχειρίδιο_Χρήσης.pdf",
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

export default app;
