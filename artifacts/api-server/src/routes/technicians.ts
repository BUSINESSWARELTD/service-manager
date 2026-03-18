import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, techniciansTable } from "@workspace/db";

const router: IRouter = Router();

// GET /technicians
router.get("/technicians", async (_req, res): Promise<void> => {
  const techs = await db.select().from(techniciansTable).where(eq(techniciansTable.isActive, true));
  res.json(techs.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })));
});

// POST /technicians
router.post("/technicians", async (req, res): Promise<void> => {
  const { name, pin, role } = req.body;
  if (!name || !pin || !role) {
    res.status(400).json({ error: "name, pin, and role are required" });
    return;
  }
  if (!["technician", "manager"].includes(role)) {
    res.status(400).json({ error: "role must be 'technician' or 'manager'" });
    return;
  }

  const [tech] = await db.insert(techniciansTable).values({ name, pin, role }).returning();
  res.status(201).json({ ...tech, createdAt: tech.createdAt.toISOString() });
});

// POST /technicians/login
router.post("/technicians/login", async (req, res): Promise<void> => {
  const { pin } = req.body;
  if (!pin) { res.status(400).json({ error: "pin is required" }); return; }

  const [tech] = await db.select().from(techniciansTable)
    .where(eq(techniciansTable.pin, pin));

  if (!tech || !tech.isActive) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  res.json({ ...tech, createdAt: tech.createdAt.toISOString() });
});

export default router;
