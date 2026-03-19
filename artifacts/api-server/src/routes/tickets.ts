import { Router, type IRouter } from "express";
import { eq, and, ilike, gte, lte, desc } from "drizzle-orm";
import {
  db,
  ticketsTable,
  ticketPartsTable,
  laborEntriesTable,
  auditLogTable,
  techniciansTable,
  settingsTable,
} from "@workspace/db";
import { generateServiceId, STATUS_LABELS } from "../lib/serviceId.js";
import { sendSmsNotification, sendEmailNotification, interpolateTemplate } from "../lib/notifications.js";
import { generateTSPLLabel, generateCustomerVoucherLabel, printLabel } from "../lib/printer.js";

const router: IRouter = Router();

// Helper to get technician name
async function getTechName(techId: number | null | undefined): Promise<string | null> {
  if (!techId) return null;
  const [tech] = await db.select().from(techniciansTable).where(eq(techniciansTable.id, techId));
  return tech?.name || null;
}

// Helper to log audit entry
async function logAudit(
  ticketId: number,
  action: string,
  description: string,
  technicianId?: number | null,
  metadata?: string
): Promise<void> {
  await db.insert(auditLogTable).values({
    ticketId,
    action,
    description,
    technicianId: technicianId || null,
    metadata: metadata || null,
  });
}

// Helper to recalculate ticket totals
async function recalcTicketTotals(ticketId: number): Promise<void> {
  const [settings] = await db.select().from(settingsTable).limit(1);
  const vatRate = settings?.vatRate || 24;

  const parts = await db.select().from(ticketPartsTable).where(eq(ticketPartsTable.ticketId, ticketId));
  const labors = await db.select().from(laborEntriesTable).where(eq(laborEntriesTable.ticketId, ticketId));

  const totalParts = parts.reduce((sum, p) => sum + p.totalPrice, 0);
  const totalLabor = labors.reduce((sum, l) => sum + (l.laborCost || 0), 0);
  const subtotal = totalParts + totalLabor;
  const totalWithVat = subtotal * (1 + vatRate / 100);

  await db.update(ticketsTable).set({
    totalPartsAmount: totalParts,
    totalLaborAmount: totalLabor,
    totalAmount: totalWithVat,
  }).where(eq(ticketsTable.id, ticketId));
}

// GET /tickets
router.get("/tickets", async (req, res): Promise<void> => {
  const { status, technicianId, search, dateFrom, dateTo } = req.query;

  let query = db
    .select({
      id: ticketsTable.id,
      serviceId: ticketsTable.serviceId,
      customerName: ticketsTable.customerName,
      customerPhone: ticketsTable.customerPhone,
      customerEmail: ticketsTable.customerEmail,
      deviceBrand: ticketsTable.deviceBrand,
      deviceModel: ticketsTable.deviceModel,
      problemDescription: ticketsTable.problemDescription,
      status: ticketsTable.status,
      technicianId: ticketsTable.technicianId,
      technicianName: techniciansTable.name,
      estimatedCompletion: ticketsTable.estimatedCompletion,
      workSummary: ticketsTable.workSummary,
      totalPartsAmount: ticketsTable.totalPartsAmount,
      totalLaborAmount: ticketsTable.totalLaborAmount,
      totalAmount: ticketsTable.totalAmount,
      billConfirmed: ticketsTable.billConfirmed,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .leftJoin(techniciansTable, eq(ticketsTable.technicianId, techniciansTable.id))
    .orderBy(desc(ticketsTable.updatedAt))
    .$dynamic();

  const conditions = [];
  if (status && typeof status === "string") {
    conditions.push(eq(ticketsTable.status, status));
  }
  if (technicianId && typeof technicianId === "string") {
    conditions.push(eq(ticketsTable.technicianId, parseInt(technicianId)));
  }
  if (search && typeof search === "string") {
    conditions.push(ilike(ticketsTable.customerName, `%${search}%`));
  }
  if (dateFrom && typeof dateFrom === "string") {
    conditions.push(gte(ticketsTable.createdAt, new Date(dateFrom)));
  }
  if (dateTo && typeof dateTo === "string") {
    conditions.push(lte(ticketsTable.createdAt, new Date(dateTo)));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const tickets = await query;
  res.json(tickets.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })));
});

// POST /tickets
router.post("/tickets", async (req, res): Promise<void> => {
  const { customerName, customerPhone, customerEmail, deviceBrand, deviceModel, problemDescription, technicianId, estimatedCompletion } = req.body;

  if (!customerName || !customerPhone || !deviceBrand || !deviceModel || !problemDescription) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const serviceId = generateServiceId();

  const [ticket] = await db.insert(ticketsTable).values({
    serviceId,
    customerName,
    customerPhone,
    customerEmail: customerEmail || null,
    deviceBrand,
    deviceModel,
    problemDescription,
    technicianId: technicianId || null,
    estimatedCompletion: estimatedCompletion || null,
    status: "received",
  }).returning();

  const techName = await getTechName(technicianId);
  await logAudit(ticket.id, "created", `Ticket created by ${techName || "system"}. Device: ${deviceBrand} ${deviceModel}`, technicianId);

  // Auto-print labels: device label first, then customer voucher
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2,"0")}/${(now.getMonth()+1).toString().padStart(2,"0")}/${now.getFullYear()}`;
  const [cfg] = await db.select().from(settingsTable).limit(1);

  const deviceLabel = generateTSPLLabel({ serviceId, customerName, deviceBrand, deviceModel, problemDescription, date: dateStr });
  const voucherLabel = generateCustomerVoucherLabel({
    serviceId,
    customerName,
    deviceBrand,
    deviceModel,
    date: dateStr,
    shopName:  cfg?.shopName  ?? "Υπηρεσία Επισκευής",
    shopPhone: cfg?.shopPhone ?? "",
  });

  // Print device label, then customer voucher (sequential so they come out in order)
  printLabel(deviceLabel)
    .then(() => printLabel(voucherLabel))
    .catch(err => console.error("Print error:", err));

  const [full] = await db.select({ ...ticketsTable }).from(ticketsTable).where(eq(ticketsTable.id, ticket.id));
  res.status(201).json({ ...full, createdAt: full.createdAt.toISOString(), updatedAt: full.updatedAt.toISOString() });
});

// GET /tickets/:id
router.get("/tickets/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [ticket] = await db
    .select({
      id: ticketsTable.id,
      serviceId: ticketsTable.serviceId,
      customerName: ticketsTable.customerName,
      customerPhone: ticketsTable.customerPhone,
      customerEmail: ticketsTable.customerEmail,
      deviceBrand: ticketsTable.deviceBrand,
      deviceModel: ticketsTable.deviceModel,
      problemDescription: ticketsTable.problemDescription,
      status: ticketsTable.status,
      technicianId: ticketsTable.technicianId,
      technicianName: techniciansTable.name,
      estimatedCompletion: ticketsTable.estimatedCompletion,
      workSummary: ticketsTable.workSummary,
      totalPartsAmount: ticketsTable.totalPartsAmount,
      totalLaborAmount: ticketsTable.totalLaborAmount,
      totalAmount: ticketsTable.totalAmount,
      billConfirmed: ticketsTable.billConfirmed,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .leftJoin(techniciansTable, eq(ticketsTable.technicianId, techniciansTable.id))
    .where(eq(ticketsTable.id, id));

  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const parts = await db.select({
    id: ticketPartsTable.id,
    ticketId: ticketPartsTable.ticketId,
    partId: ticketPartsTable.partId,
    partName: ticketPartsTable.partName,
    quantity: ticketPartsTable.quantity,
    unitPrice: ticketPartsTable.unitPrice,
    totalPrice: ticketPartsTable.totalPrice,
    warrantyPeriod: ticketPartsTable.warrantyPeriod,
    addedByName: techniciansTable.name,
    createdAt: ticketPartsTable.createdAt,
  }).from(ticketPartsTable)
    .leftJoin(techniciansTable, eq(ticketPartsTable.addedBy, techniciansTable.id))
    .where(eq(ticketPartsTable.ticketId, id));

  const laborEntries = await db.select({
    id: laborEntriesTable.id,
    ticketId: laborEntriesTable.ticketId,
    technicianId: laborEntriesTable.technicianId,
    technicianName: techniciansTable.name,
    startTime: laborEntriesTable.startTime,
    endTime: laborEntriesTable.endTime,
    manualHours: laborEntriesTable.manualHours,
    totalHours: laborEntriesTable.totalHours,
    laborCost: laborEntriesTable.laborCost,
    isRunning: laborEntriesTable.isRunning,
    createdAt: laborEntriesTable.createdAt,
  }).from(laborEntriesTable)
    .leftJoin(techniciansTable, eq(laborEntriesTable.technicianId, techniciansTable.id))
    .where(eq(laborEntriesTable.ticketId, id));

  const auditLog = await db.select({
    id: auditLogTable.id,
    ticketId: auditLogTable.ticketId,
    action: auditLogTable.action,
    description: auditLogTable.description,
    technicianId: auditLogTable.technicianId,
    technicianName: techniciansTable.name,
    metadata: auditLogTable.metadata,
    createdAt: auditLogTable.createdAt,
  }).from(auditLogTable)
    .leftJoin(techniciansTable, eq(auditLogTable.technicianId, techniciansTable.id))
    .where(eq(auditLogTable.ticketId, id))
    .orderBy(desc(auditLogTable.createdAt));

  res.json({
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    parts: parts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
    laborEntries: laborEntries.map(l => ({
      ...l,
      startTime: l.startTime?.toISOString() || null,
      endTime: l.endTime?.toISOString() || null,
      createdAt: l.createdAt.toISOString(),
    })),
    auditLog: auditLog.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
});

// GET /tickets/by-service-id/:serviceId
router.get("/tickets/by-service-id/:serviceId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.serviceId) ? req.params.serviceId[0] : req.params.serviceId;

  const [ticket] = await db
    .select({ id: ticketsTable.id })
    .from(ticketsTable)
    .where(eq(ticketsTable.serviceId, raw));

  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  // Reuse existing detail route logic by calling the DB directly
  const [full] = await db
    .select({
      id: ticketsTable.id,
      serviceId: ticketsTable.serviceId,
      customerName: ticketsTable.customerName,
      customerPhone: ticketsTable.customerPhone,
      customerEmail: ticketsTable.customerEmail,
      deviceBrand: ticketsTable.deviceBrand,
      deviceModel: ticketsTable.deviceModel,
      problemDescription: ticketsTable.problemDescription,
      status: ticketsTable.status,
      technicianId: ticketsTable.technicianId,
      technicianName: techniciansTable.name,
      estimatedCompletion: ticketsTable.estimatedCompletion,
      workSummary: ticketsTable.workSummary,
      totalPartsAmount: ticketsTable.totalPartsAmount,
      totalLaborAmount: ticketsTable.totalLaborAmount,
      totalAmount: ticketsTable.totalAmount,
      billConfirmed: ticketsTable.billConfirmed,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
    })
    .from(ticketsTable)
    .leftJoin(techniciansTable, eq(ticketsTable.technicianId, techniciansTable.id))
    .where(eq(ticketsTable.id, ticket.id));

  const parts = await db.select({
    id: ticketPartsTable.id,
    ticketId: ticketPartsTable.ticketId,
    partId: ticketPartsTable.partId,
    partName: ticketPartsTable.partName,
    quantity: ticketPartsTable.quantity,
    unitPrice: ticketPartsTable.unitPrice,
    totalPrice: ticketPartsTable.totalPrice,
    warrantyPeriod: ticketPartsTable.warrantyPeriod,
    addedByName: techniciansTable.name,
    createdAt: ticketPartsTable.createdAt,
  }).from(ticketPartsTable)
    .leftJoin(techniciansTable, eq(ticketPartsTable.addedBy, techniciansTable.id))
    .where(eq(ticketPartsTable.ticketId, ticket.id));

  const laborEntries = await db.select({
    id: laborEntriesTable.id,
    ticketId: laborEntriesTable.ticketId,
    technicianId: laborEntriesTable.technicianId,
    technicianName: techniciansTable.name,
    startTime: laborEntriesTable.startTime,
    endTime: laborEntriesTable.endTime,
    manualHours: laborEntriesTable.manualHours,
    totalHours: laborEntriesTable.totalHours,
    laborCost: laborEntriesTable.laborCost,
    isRunning: laborEntriesTable.isRunning,
    createdAt: laborEntriesTable.createdAt,
  }).from(laborEntriesTable)
    .leftJoin(techniciansTable, eq(laborEntriesTable.technicianId, techniciansTable.id))
    .where(eq(laborEntriesTable.ticketId, ticket.id));

  const auditLog = await db.select({
    id: auditLogTable.id,
    ticketId: auditLogTable.ticketId,
    action: auditLogTable.action,
    description: auditLogTable.description,
    technicianId: auditLogTable.technicianId,
    technicianName: techniciansTable.name,
    metadata: auditLogTable.metadata,
    createdAt: auditLogTable.createdAt,
  }).from(auditLogTable)
    .leftJoin(techniciansTable, eq(auditLogTable.technicianId, techniciansTable.id))
    .where(eq(auditLogTable.ticketId, ticket.id))
    .orderBy(desc(auditLogTable.createdAt));

  res.json({
    ...full,
    createdAt: full!.createdAt.toISOString(),
    updatedAt: full!.updatedAt.toISOString(),
    parts: parts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
    laborEntries: laborEntries.map(l => ({
      ...l,
      startTime: l.startTime?.toISOString() || null,
      endTime: l.endTime?.toISOString() || null,
      createdAt: l.createdAt.toISOString(),
    })),
    auditLog: auditLog.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
});

// PATCH /tickets/:id
router.patch("/tickets/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [existing] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Ticket not found" }); return; }

  const { customerName, customerPhone, customerEmail, deviceBrand, deviceModel, problemDescription, technicianId, estimatedCompletion } = req.body;
  const updates: Partial<typeof ticketsTable.$inferInsert> = {};
  if (customerName !== undefined) updates.customerName = customerName;
  if (customerPhone !== undefined) updates.customerPhone = customerPhone;
  if (customerEmail !== undefined) updates.customerEmail = customerEmail;
  if (deviceBrand !== undefined) updates.deviceBrand = deviceBrand;
  if (deviceModel !== undefined) updates.deviceModel = deviceModel;
  if (problemDescription !== undefined) updates.problemDescription = problemDescription;
  if (technicianId !== undefined) updates.technicianId = technicianId;
  if (estimatedCompletion !== undefined) updates.estimatedCompletion = estimatedCompletion;

  const [updated] = await db.update(ticketsTable).set(updates).where(eq(ticketsTable.id, id)).returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// PATCH /tickets/:id/status — enforces business rules
router.patch("/tickets/:id/status", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status, technicianId, reason, billConfirmed } = req.body;
  if (!status) { res.status(400).json({ error: "status is required" }); return; }

  const [existing] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Ticket not found" }); return; }

  // Business rule enforcement
  if (status === "repairing") {
    const parts = await db.select().from(ticketPartsTable).where(eq(ticketPartsTable.ticketId, id));
    const labors = await db.select().from(laborEntriesTable).where(eq(laborEntriesTable.ticketId, id));
    if (parts.length === 0 && labors.length === 0) {
      res.status(400).json({ error: "Cannot transition to Repairing: must start labor timer OR log at least 1 part first" });
      return;
    }
  }

  if (status === "ready_for_pickup") {
    if (!existing.workSummary) {
      res.status(400).json({ error: "Cannot transition to Ready for Pickup: Work Summary must be submitted first" });
      return;
    }
  }

  if (status === "delivered") {
    if (!existing.billConfirmed && !billConfirmed) {
      res.status(400).json({ error: "Cannot transition to Delivered: Bill must be confirmed first" });
      return;
    }
  }

  const isBackward = (existing: string, next: string) => {
    const ORDER = ["received", "diagnosing", "repairing", "waiting_for_parts", "ready_for_pickup", "delivered"];
    return ORDER.indexOf(next) < ORDER.indexOf(existing);
  };

  if (isBackward(existing.status, status) && !reason) {
    res.status(400).json({ error: "A reason note is required for backward status transitions" });
    return;
  }

  const updates: Partial<typeof ticketsTable.$inferInsert> = { status };
  if (billConfirmed !== undefined) updates.billConfirmed = billConfirmed;
  if (technicianId !== undefined) updates.technicianId = technicianId;

  const [updated] = await db.update(ticketsTable).set(updates).where(eq(ticketsTable.id, id)).returning();

  const techName = await getTechName(technicianId);
  const description = reason
    ? `Status changed to ${STATUS_LABELS[status]} by ${techName || "system"}. Reason: ${reason}`
    : `Status changed to ${STATUS_LABELS[status]} by ${techName || "system"}`;
  await logAudit(id, "status_change", description, technicianId, JSON.stringify({ from: existing.status, to: status }));

  // Send notifications when Ready for Pickup
  if (status === "ready_for_pickup") {
    const [settings] = await db.select().from(settingsTable).limit(1);
    const templateVars = {
      serviceId: existing.serviceId,
      customerName: existing.customerName,
      deviceBrand: existing.deviceBrand,
      deviceModel: existing.deviceModel,
    };

    if (existing.customerPhone) {
      const smsMsg = interpolateTemplate(
        settings?.smsTemplate || "Your device {{deviceBrand}} {{deviceModel}} (Service ID: {{serviceId}}) is ready for pickup.",
        templateVars
      );
      sendSmsNotification(existing.customerPhone, smsMsg).catch(err => console.error("SMS error:", err));
    }

    if (existing.customerEmail) {
      const emailMsg = interpolateTemplate(
        settings?.emailTemplate || "Dear {{customerName}},\n\nYour device is ready for pickup.",
        templateVars
      );
      sendEmailNotification(existing.customerEmail, "Your Device is Ready for Pickup", emailMsg).catch(err => console.error("Email error:", err));
    }
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// POST /tickets/:id/work-summary
router.post("/tickets/:id/work-summary", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { workSummary, technicianId } = req.body;
  if (!workSummary) { res.status(400).json({ error: "workSummary is required" }); return; }

  await recalcTicketTotals(id);
  const [updated] = await db.update(ticketsTable).set({ workSummary }).where(eq(ticketsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Ticket not found" }); return; }

  const techName = await getTechName(technicianId);
  await logAudit(id, "work_summary", `Work summary submitted by ${techName || "system"}: ${workSummary.substring(0, 100)}`, technicianId);

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// GET /tickets/:id/parts
router.get("/tickets/:id/parts", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parts = await db.select({
    id: ticketPartsTable.id,
    ticketId: ticketPartsTable.ticketId,
    partId: ticketPartsTable.partId,
    partName: ticketPartsTable.partName,
    quantity: ticketPartsTable.quantity,
    unitPrice: ticketPartsTable.unitPrice,
    totalPrice: ticketPartsTable.totalPrice,
    warrantyPeriod: ticketPartsTable.warrantyPeriod,
    addedByName: techniciansTable.name,
    createdAt: ticketPartsTable.createdAt,
  }).from(ticketPartsTable)
    .leftJoin(techniciansTable, eq(ticketPartsTable.addedBy, techniciansTable.id))
    .where(eq(ticketPartsTable.ticketId, id));

  res.json(parts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })));
});

// POST /tickets/:id/parts
router.post("/tickets/:id/parts", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { partId, partName, quantity, unitPrice, warrantyPeriod, technicianId } = req.body;
  if (!partName || !quantity || unitPrice === undefined) {
    res.status(400).json({ error: "partName, quantity, and unitPrice are required" });
    return;
  }

  const [existing] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Ticket not found" }); return; }

  const totalPrice = quantity * unitPrice;
  const [part] = await db.insert(ticketPartsTable).values({
    ticketId: id,
    partId: partId || null,
    partName,
    quantity,
    unitPrice,
    totalPrice,
    warrantyPeriod: warrantyPeriod || null,
    addedBy: technicianId || null,
  }).returning();

  await recalcTicketTotals(id);
  const techName = await getTechName(technicianId);
  await logAudit(id, "part_added", `Part added by ${techName || "system"}: ${partName} x${quantity} @ €${unitPrice}`, technicianId);

  res.status(201).json({ ...part, createdAt: part.createdAt.toISOString() });
});

// DELETE /tickets/:id/parts/:partId
router.delete("/tickets/:id/parts/:partId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawPart = Array.isArray(req.params.partId) ? req.params.partId[0] : req.params.partId;
  const id = parseInt(raw, 10);
  const partId = parseInt(rawPart, 10);

  const [deleted] = await db.delete(ticketPartsTable)
    .where(and(eq(ticketPartsTable.id, partId), eq(ticketPartsTable.ticketId, id)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Part not found" }); return; }

  await recalcTicketTotals(id);
  res.sendStatus(204);
});

// GET /tickets/:id/labor
router.get("/tickets/:id/labor", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const labors = await db.select({
    id: laborEntriesTable.id,
    ticketId: laborEntriesTable.ticketId,
    technicianId: laborEntriesTable.technicianId,
    technicianName: techniciansTable.name,
    startTime: laborEntriesTable.startTime,
    endTime: laborEntriesTable.endTime,
    manualHours: laborEntriesTable.manualHours,
    totalHours: laborEntriesTable.totalHours,
    laborCost: laborEntriesTable.laborCost,
    isRunning: laborEntriesTable.isRunning,
    createdAt: laborEntriesTable.createdAt,
  }).from(laborEntriesTable)
    .leftJoin(techniciansTable, eq(laborEntriesTable.technicianId, techniciansTable.id))
    .where(eq(laborEntriesTable.ticketId, id));

  res.json(labors.map(l => ({
    ...l,
    startTime: l.startTime?.toISOString() || null,
    endTime: l.endTime?.toISOString() || null,
    createdAt: l.createdAt.toISOString(),
  })));
});

// POST /tickets/:id/labor
router.post("/tickets/:id/labor", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { technicianId, mode, manualHours, hourlyRate: bodyHourlyRate } = req.body;
  if (!mode || !["timer", "manual"].includes(mode)) {
    res.status(400).json({ error: "mode must be 'timer' or 'manual'" });
    return;
  }

  const [existing] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Ticket not found" }); return; }

  const [settings] = await db.select().from(settingsTable).limit(1);
  const hourlyRate = bodyHourlyRate || settings?.hourlyRate || 30;

  let entry;
  if (mode === "timer") {
    const [created] = await db.insert(laborEntriesTable).values({
      ticketId: id,
      technicianId: technicianId || null,
      startTime: new Date(),
      isRunning: true,
    }).returning();
    entry = created;

    const techName = await getTechName(technicianId);
    await logAudit(id, "labor_started", `Labor timer started by ${techName || "system"}`, technicianId);
  } else {
    if (!manualHours || manualHours <= 0) {
      res.status(400).json({ error: "manualHours is required for manual mode" });
      return;
    }
    const laborCost = manualHours * hourlyRate;
    const [created] = await db.insert(laborEntriesTable).values({
      ticketId: id,
      technicianId: technicianId || null,
      manualHours,
      totalHours: manualHours,
      laborCost,
      isRunning: false,
    }).returning();
    entry = created;

    await recalcTicketTotals(id);
    const techName = await getTechName(technicianId);
    await logAudit(id, "labor_manual", `Manual labor logged by ${techName || "system"}: ${manualHours}h @ €${hourlyRate}/h = €${laborCost.toFixed(2)}`, technicianId);
  }

  res.status(201).json({
    ...entry,
    startTime: entry.startTime?.toISOString() || null,
    endTime: entry.endTime?.toISOString() || null,
    createdAt: entry.createdAt.toISOString(),
  });
});

// PATCH /tickets/:id/labor/:laborId/stop
router.patch("/tickets/:id/labor/:laborId/stop", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawLabor = Array.isArray(req.params.laborId) ? req.params.laborId[0] : req.params.laborId;
  const id = parseInt(rawId, 10);
  const laborId = parseInt(rawLabor, 10);

  const [labor] = await db.select().from(laborEntriesTable).where(and(eq(laborEntriesTable.id, laborId), eq(laborEntriesTable.ticketId, id)));
  if (!labor) { res.status(404).json({ error: "Labor entry not found" }); return; }
  if (!labor.isRunning) { res.status(400).json({ error: "Timer is not running" }); return; }

  const [settings] = await db.select().from(settingsTable).limit(1);
  const hourlyRate = settings?.hourlyRate || 30;

  const endTime = new Date();
  const diffMs = endTime.getTime() - (labor.startTime?.getTime() || 0);
  const totalHours = diffMs / (1000 * 60 * 60);
  const laborCost = totalHours * hourlyRate;

  const [updated] = await db.update(laborEntriesTable).set({
    endTime,
    totalHours,
    laborCost,
    isRunning: false,
  }).where(eq(laborEntriesTable.id, laborId)).returning();

  await recalcTicketTotals(id);
  await logAudit(id, "labor_stopped", `Labor timer stopped. Duration: ${totalHours.toFixed(2)}h @ €${hourlyRate}/h = €${laborCost.toFixed(2)}`, labor.technicianId);

  res.json({
    ...updated,
    startTime: updated.startTime?.toISOString() || null,
    endTime: updated.endTime?.toISOString() || null,
    createdAt: updated.createdAt.toISOString(),
  });
});

// GET /tickets/:id/audit-log
router.get("/tickets/:id/audit-log", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const log = await db.select({
    id: auditLogTable.id,
    ticketId: auditLogTable.ticketId,
    action: auditLogTable.action,
    description: auditLogTable.description,
    technicianId: auditLogTable.technicianId,
    technicianName: techniciansTable.name,
    metadata: auditLogTable.metadata,
    createdAt: auditLogTable.createdAt,
  }).from(auditLogTable)
    .leftJoin(techniciansTable, eq(auditLogTable.technicianId, techniciansTable.id))
    .where(eq(auditLogTable.ticketId, id))
    .orderBy(desc(auditLogTable.createdAt));

  res.json(log.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

// POST /tickets/:id/notes
router.post("/tickets/:id/notes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { note, technicianId } = req.body;
  if (!note) { res.status(400).json({ error: "note is required" }); return; }

  const techName = await getTechName(technicianId);
  const [entry] = await db.insert(auditLogTable).values({
    ticketId: id,
    action: "note",
    description: `Note by ${techName || "system"}: ${note}`,
    technicianId: technicianId || null,
  }).returning();

  res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
});

// GET /public/status/:serviceId
router.get("/public/status/:serviceId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.serviceId) ? req.params.serviceId[0] : req.params.serviceId;

  const [ticket] = await db.select({
    serviceId: ticketsTable.serviceId,
    customerName: ticketsTable.customerName,
    deviceBrand: ticketsTable.deviceBrand,
    deviceModel: ticketsTable.deviceModel,
    status: ticketsTable.status,
    estimatedCompletion: ticketsTable.estimatedCompletion,
    createdAt: ticketsTable.createdAt,
    updatedAt: ticketsTable.updatedAt,
  }).from(ticketsTable).where(eq(ticketsTable.serviceId, raw));

  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  res.json({
    ...ticket,
    statusLabel: STATUS_LABELS[ticket.status] || ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  });
});

export default router;
