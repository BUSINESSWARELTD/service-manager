import { Router, type IRouter } from "express";
import { eq, desc, sql, count } from "drizzle-orm";
import { db, settingsTable, ticketsTable, laborEntriesTable, techniciansTable, ticketPartsTable, partsTable, auditLogTable } from "@workspace/db";

const router: IRouter = Router();

// GET /settings
router.get("/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values({}).returning();
  }
  res.json({ ...settings, updatedAt: settings.updatedAt.toISOString() });
});

// PATCH /settings
router.patch("/settings", async (req, res): Promise<void> => {
  let [existing] = await db.select().from(settingsTable).limit(1);
  if (!existing) {
    [existing] = await db.insert(settingsTable).values({}).returning();
  }

  const updates: Partial<typeof settingsTable.$inferInsert> = {};
  const fields = ["hourlyRate", "vatRate", "twilioAccountSid", "twilioAuthToken", "twilioFromNumber",
    "emailHost", "emailPort", "emailUser", "emailPass", "emailFrom",
    "printerIp", "printerPort", "smsTemplate", "emailTemplate"];
  
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      (updates as Record<string, unknown>)[field] = req.body[field];
    }
  }

  const [updated] = await db.update(settingsTable).set(updates).where(eq(settingsTable.id, existing.id)).returning();
  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

// GET /analytics/dashboard
router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  const period = req.query.period as string || "month";
  
  const now = new Date();
  let startDate: Date;
  if (period === "week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "year") {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }

  // Total revenue (sum of totalAmount for delivered tickets)
  const revenueResult = await db.select({
    total: sql<number>`COALESCE(SUM(${ticketsTable.totalAmount}), 0)`,
  }).from(ticketsTable).where(eq(ticketsTable.status, "delivered"));
  const totalRevenue = Number(revenueResult[0]?.total || 0);

  // Ticket counts
  const totalTickets = await db.select({ count: count() }).from(ticketsTable);
  const completedTickets = await db.select({ count: count() }).from(ticketsTable).where(eq(ticketsTable.status, "delivered"));

  // Average repair time (hours)
  const avgTimeResult = await db.select({
    avg: sql<number>`COALESCE(AVG(${laborEntriesTable.totalHours}), 0)`,
  }).from(laborEntriesTable);
  const averageRepairTime = Number(avgTimeResult[0]?.avg || 0);

  // Revenue by day (last N days)
  const revenueByDay = await db.execute(sql`
    SELECT 
      DATE(created_at) as date,
      COALESCE(SUM(total_amount), 0) as revenue
    FROM tickets
    WHERE status = 'delivered' AND created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  // Top failure types
  const topFailures = await db.select({
    deviceBrand: ticketsTable.deviceBrand,
    deviceModel: ticketsTable.deviceModel,
    count: count(),
  }).from(ticketsTable)
    .groupBy(ticketsTable.deviceBrand, ticketsTable.deviceModel)
    .orderBy(desc(count()))
    .limit(10);

  // Technician stats
  const techStats = await db.execute(sql`
    SELECT 
      t.name as "technicianName",
      COUNT(DISTINCT tk.id) as "jobsCompleted",
      COALESCE(AVG(le.total_hours), 0) as "avgHoursPerJob"
    FROM technicians t
    LEFT JOIN tickets tk ON tk.technician_id = t.id AND tk.status = 'delivered'
    LEFT JOIN labor_entries le ON le.technician_id = t.id
    GROUP BY t.id, t.name
    ORDER BY "jobsCompleted" DESC
  `);

  res.json({
    totalRevenue,
    totalTickets: totalTickets[0]?.count || 0,
    completedTickets: completedTickets[0]?.count || 0,
    averageRepairTime,
    revenueByDay: (revenueByDay as Array<{ date: string; revenue: string }>).map(r => ({
      date: r.date,
      revenue: Number(r.revenue),
    })),
    topFailureTypes: topFailures,
    technicianStats: (techStats as Array<{ technicianName: string; jobsCompleted: string; avgHoursPerJob: string }>).map(s => ({
      technicianName: s.technicianName,
      jobsCompleted: Number(s.jobsCompleted),
      avgHoursPerJob: Number(s.avgHoursPerJob),
    })),
  });
});

// POST /seed — inserts sample data
router.post("/seed", async (_req, res): Promise<void> => {
  // Ensure settings exist
  const [existingSettings] = await db.select().from(settingsTable).limit(1);
  if (!existingSettings) {
    await db.insert(settingsTable).values({ hourlyRate: 30, vatRate: 24 });
  }

  // Seed technicians
  const existingTechs = await db.select().from(techniciansTable);
  if (existingTechs.length === 0) {
    await db.insert(techniciansTable).values([
      { name: "Alice Manager", pin: "1234", role: "manager" },
      { name: "Bob Tech", pin: "2345", role: "technician" },
      { name: "Carol Tech", pin: "3456", role: "technician" },
    ]);
  }

  const [techs] = await db.select().from(techniciansTable);
  const techId = techs?.id || 1;

  // Seed inventory parts
  const existingParts = await db.select().from(partsTable);
  if (existingParts.length === 0) {
    await db.insert(partsTable).values([
      { name: "iPhone 14 Battery", barcode: "PART-001", defaultPrice: 45, stockQuantity: 10, category: "Battery" },
      { name: "Samsung Galaxy S23 Screen", barcode: "PART-002", defaultPrice: 120, stockQuantity: 5, category: "Display" },
      { name: "MacBook Pro Keyboard", barcode: "PART-003", defaultPrice: 85, stockQuantity: 3, category: "Input" },
      { name: "iPad Charging Port", barcode: "PART-004", defaultPrice: 35, stockQuantity: 8, category: "Connector" },
      { name: "Generic USB-C Port", barcode: "PART-005", defaultPrice: 15, stockQuantity: 20, category: "Connector" },
      { name: "Thermal Paste", barcode: "PART-006", defaultPrice: 5, stockQuantity: 50, category: "Consumable" },
      { name: "iPhone 15 Screen", barcode: "PART-007", defaultPrice: 180, stockQuantity: 4, category: "Display" },
      { name: "Laptop Cooling Fan", barcode: "PART-008", defaultPrice: 25, stockQuantity: 7, category: "Cooling" },
    ]);
  }

  // Seed tickets in various statuses
  const existingTickets = await db.select().from(ticketsTable);
  if (existingTickets.length < 5) {
    const statuses = ["received", "diagnosing", "repairing", "waiting_for_parts", "ready_for_pickup", "delivered", "received", "diagnosing", "repairing", "delivered"];
    const devices = [
      { brand: "Apple", model: "iPhone 14" },
      { brand: "Samsung", model: "Galaxy S23" },
      { brand: "Apple", model: "MacBook Pro" },
      { brand: "Apple", model: "iPad Pro" },
      { brand: "Dell", model: "XPS 15" },
      { brand: "Huawei", model: "P50 Pro" },
      { brand: "OnePlus", model: "11 Pro" },
      { brand: "Apple", model: "iPhone 15 Pro" },
      { brand: "Lenovo", model: "ThinkPad X1" },
      { brand: "Google", model: "Pixel 8" },
    ];
    const problems = [
      "Screen cracked, touch unresponsive",
      "Battery drains within 2 hours",
      "Keyboard keys sticking",
      "Won't charge, charging port damaged",
      "Overheating and shutting down",
      "Water damage, won't turn on",
      "Camera not working",
      "Speaker crackling sound",
      "Motherboard issues, won't boot",
      "Microphone not working on calls",
    ];
    const customers = [
      { name: "John Smith", phone: "+1-555-0101", email: "john@example.com" },
      { name: "Maria Garcia", phone: "+1-555-0102", email: "maria@example.com" },
      { name: "James Wilson", phone: "+1-555-0103", email: null },
      { name: "Anna Brown", phone: "+1-555-0104", email: "anna@example.com" },
      { name: "David Lee", phone: "+1-555-0105", email: null },
      { name: "Sofia Martins", phone: "+1-555-0106", email: "sofia@example.com" },
      { name: "Mark Johnson", phone: "+1-555-0107", email: null },
      { name: "Emma Davis", phone: "+1-555-0108", email: "emma@example.com" },
      { name: "Lucas Oliveira", phone: "+1-555-0109", email: null },
      { name: "Isabella Taylor", phone: "+1-555-0110", email: "isabella@example.com" },
    ];

    for (let i = 0; i < 10; i++) {
      const device = devices[i];
      const customer = customers[i];
      const status = statuses[i];
      const problem = problems[i];

      // Generate unique service ID
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
      const serviceId = `SRV-${dateStr}-${1000 + i}`;

      const workSummary = ["ready_for_pickup", "delivered"].includes(status)
        ? `Repair completed successfully. ${problem} resolved. Device tested and working.`
        : null;

      const [ticket] = await db.insert(ticketsTable).values({
        serviceId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        deviceBrand: device.brand,
        deviceModel: device.model,
        problemDescription: problem,
        status,
        technicianId: techId,
        workSummary,
        billConfirmed: status === "delivered",
        totalAmount: status === "delivered" ? 150 + i * 20 : null,
        totalPartsAmount: status === "delivered" ? 80 + i * 10 : null,
        totalLaborAmount: status === "delivered" ? 70 + i * 10 : null,
      }).returning();

      await db.insert(auditLogTable).values({
        ticketId: ticket.id,
        action: "created",
        description: `Ticket created. Device: ${device.brand} ${device.model}`,
        technicianId: techId,
      });
    }
  }

  res.json({ message: "Sample data seeded successfully" });
});

export default router;
