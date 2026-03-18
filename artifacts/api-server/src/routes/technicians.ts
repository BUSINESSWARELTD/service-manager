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

// DELETE /technicians/:id  (soft delete — sets isActive = false)
router.delete("/technicians/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [tech] = await db.select().from(techniciansTable).where(eq(techniciansTable.id, id));
  if (!tech) { res.status(404).json({ error: "Technician not found" }); return; }

  // Prevent deactivating the last manager
  if (tech.role === "manager") {
    const managers = await db.select().from(techniciansTable)
      .where(eq(techniciansTable.isActive, true));
    const activeManagers = managers.filter(t => t.role === "manager");
    if (activeManagers.length <= 1) {
      res.status(400).json({ error: "Cannot deactivate the last manager" });
      return;
    }
  }

  const [updated] = await db
    .update(techniciansTable)
    .set({ isActive: false })
    .where(eq(techniciansTable.id, id))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
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
