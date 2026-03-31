import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Method override: allows GET requests to act as POST/PATCH/DELETE
// Used by mobile clients on networks that block non-GET HTTP methods
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.method === "GET" && req.query._method) {
    const override = (req.query._method as string).toUpperCase();
    const bodyStr = req.query._body as string | undefined;
    req.method = override;
    if (bodyStr) {
      try { req.body = JSON.parse(bodyStr); } catch { req.body = {}; }
    }
    delete req.query._method;
    delete req.query._body;
    console.log(`[OVERRIDE→${override}] ${req.path}`);
  }
  next();
});

app.use("/api", router);

// Global error handler — catches unhandled async errors in routes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled route error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

export default app;
