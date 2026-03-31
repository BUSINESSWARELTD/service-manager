import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Global error handler — catches unhandled async errors in routes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled route error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

export default app;
