import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, partsTable } from "@workspace/db";

const router: IRouter = Router();

function mapPart(p: typeof partsTable.$inferSelect) {
  return {
    id: p.id,
    partName: p.name,
    partNumber: p.partNumber ?? null,
    description: p.description ?? null,
    barcode: p.barcode ?? null,
    unitCost: p.costPrice,
    unitPrice: p.defaultPrice,
    stockQuantity: p.stockQuantity,
    category: p.category ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

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
        ilike(partsTable.partNumber, `%${search}%`),
        ilike(partsTable.category, `%${search}%`)
      )
    );
  } else {
    parts = await db.select().from(partsTable);
  }

  res.json(parts.map(mapPart));
});

// POST /parts
router.post("/parts", async (req, res): Promise<void> => {
  const { partName, partNumber, description, barcode, unitCost, unitPrice, stockQuantity, category } = req.body;
  if (!partName || unitPrice === undefined) {
    res.status(400).json({ error: "partName and unitPrice are required" });
    return;
  }

  const [part] = await db.insert(partsTable).values({
    name: partName,
    partNumber: partNumber || null,
    description: description || null,
    barcode: barcode || null,
    costPrice: parseFloat(unitCost) || 0,
    defaultPrice: parseFloat(unitPrice) || 0,
    stockQuantity: parseInt(stockQuantity) || 0,
    category: category || null,
  }).returning();

  res.status(201).json(mapPart(part));
});

// PATCH /parts/:id
router.patch("/parts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { partName, partNumber, description, barcode, unitCost, unitPrice, stockQuantity, category } = req.body;
  const updates: Partial<typeof partsTable.$inferInsert> = {};
  if (partName !== undefined) updates.name = partName;
  if (partNumber !== undefined) updates.partNumber = partNumber;
  if (description !== undefined) updates.description = description;
  if (barcode !== undefined) updates.barcode = barcode;
  if (unitCost !== undefined) updates.costPrice = parseFloat(unitCost) || 0;
  if (unitPrice !== undefined) updates.defaultPrice = parseFloat(unitPrice) || 0;
  if (stockQuantity !== undefined) updates.stockQuantity = parseInt(stockQuantity) || 0;
  if (category !== undefined) updates.category = category;

  const [updated] = await db.update(partsTable).set(updates).where(eq(partsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Part not found" }); return; }

  res.json(mapPart(updated));
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
