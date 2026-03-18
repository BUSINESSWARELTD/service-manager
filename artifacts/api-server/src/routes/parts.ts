import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, partsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /parts
router.get("/parts", async (req, res): Promise<void> => {
  const { search, barcode } = req.query;

  let parts;
  if (barcode && typeof barcode === "string") {
    parts = await db.select().from(partsTable).where(eq(partsTable.barcode, barcode));
  } else if (search && typeof search === "string") {
    parts = await db.select().from(partsTable).where(
      or(
        ilike(partsTable.name, `%${search}%`),
        ilike(partsTable.category, `%${search}%`)
      )
    );
  } else {
    parts = await db.select().from(partsTable);
  }

  res.json(parts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })));
});

// POST /parts
router.post("/parts", async (req, res): Promise<void> => {
  const { name, barcode, defaultPrice, stockQuantity, category } = req.body;
  if (!name || defaultPrice === undefined || stockQuantity === undefined) {
    res.status(400).json({ error: "name, defaultPrice, and stockQuantity are required" });
    return;
  }

  const [part] = await db.insert(partsTable).values({
    name,
    barcode: barcode || null,
    defaultPrice,
    stockQuantity,
    category: category || null,
  }).returning();

  res.status(201).json({ ...part, createdAt: part.createdAt.toISOString() });
});

// PATCH /parts/:id
router.patch("/parts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { name, barcode, defaultPrice, stockQuantity, category } = req.body;
  const updates: Partial<typeof partsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (barcode !== undefined) updates.barcode = barcode;
  if (defaultPrice !== undefined) updates.defaultPrice = defaultPrice;
  if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity;
  if (category !== undefined) updates.category = category;

  const [updated] = await db.update(partsTable).set(updates).where(eq(partsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Part not found" }); return; }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// DELETE /parts/:id
router.delete("/parts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db.delete(partsTable).where(eq(partsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Part not found" }); return; }

  res.sendStatus(204);
});

export default router;
