import { Router } from "express";
import { db, inspectionsTable, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import dayjs from "dayjs";
import { requireAuth } from "../middleware/auth.js";
import { getAccessibleCustomerIds } from "../lib/user-access.js";
import { ExportInspectionsQueryParams, ExportElevatorsQueryParams } from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

function toDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const DATE_STYLE = { numFmt: "mm/dd/yyyy" };

router.get("/inspections", async (req, res) => {
  const params = ExportInspectionsQueryParams.safeParse(req.query);
  const orgId = req.user!.organizationId;

  // Respect user-level customer access restrictions
  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Inspections");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="inspections_export_${dayjs().format("YYYY-MM-DD")}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
    return;
  }

  const conditions: any[] = [eq(inspectionsTable.organizationId, orgId)];
  if (allowedIds !== null) conditions.push(inArray(customersTable.id, allowedIds));
  if (params.success) {
    if (params.data.customerId) conditions.push(eq(customersTable.id, params.data.customerId));
    if (params.data.buildingId) conditions.push(eq(buildingsTable.id, params.data.buildingId));
    if (params.data.status) conditions.push(eq(inspectionsTable.status, params.data.status));
    if (params.data.inspectionType) conditions.push(eq(inspectionsTable.inspectionType, params.data.inspectionType));
  }

  const rows = await db
    .select({
      customerName: customersTable.name,
      buildingName: buildingsTable.name,
      elevatorName: elevatorsTable.name,
      inspectionType: inspectionsTable.inspectionType,
      lastInspectionDate: inspectionsTable.lastInspectionDate,
      nextDueDate: inspectionsTable.nextDueDate,
      status: inspectionsTable.status,
      scheduledDate: inspectionsTable.scheduledDate,
      completionDate: inspectionsTable.completionDate,
      notes: inspectionsTable.notes,
    })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(inspectionsTable.nextDueDate);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inspections");

  sheet.columns = [
    { header: "Customer",             key: "customerName",       width: 25 },
    { header: "Building",             key: "buildingName",       width: 30 },
    { header: "Elevator",             key: "elevatorName",       width: 25 },
    { header: "Inspection Type",      key: "inspectionType",     width: 18 },
    { header: "Last Inspection Date", key: "lastInspectionDate", width: 22, style: DATE_STYLE },
    { header: "Next Due Date",        key: "nextDueDate",        width: 18, style: DATE_STYLE },
    { header: "Status",               key: "status",             width: 15 },
    { header: "Scheduled Date",       key: "scheduledDate",      width: 18, style: DATE_STYLE },
    { header: "Completion Date",      key: "completionDate",     width: 18, style: DATE_STYLE },
    { header: "Notes",                key: "notes",              width: 40 },
  ];

  sheet.getRow(1).font = { bold: true };

  rows.forEach(r => {
    sheet.addRow({
      customerName:       r.customerName ?? "",
      buildingName:       r.buildingName ?? "",
      elevatorName:       r.elevatorName ?? "",
      inspectionType:     r.inspectionType,
      lastInspectionDate: toDate(r.lastInspectionDate),
      nextDueDate:        toDate(r.nextDueDate),
      status:             r.status,
      scheduledDate:      toDate(r.scheduledDate),
      completionDate:     toDate(r.completionDate),
      notes:              r.notes ?? "",
    });
  });

  const filename = `inspections_export_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

/* ── Elevator export helpers ── */
function statusLabel(status: string, nextDueDate: string | null | undefined): string {
  if (status === "NOT_STARTED" && nextDueDate && dayjs(nextDueDate).isBefore(dayjs(), "day")) return "Overdue";
  const map: Record<string, string> = {
    NOT_STARTED: "Not Scheduled",
    SCHEDULED:   "Scheduled",
    IN_PROGRESS: "In Progress",
    COMPLETED:   "Completed",
  };
  return map[status] ?? status;
}

function agingBucketLabel(nextDueDate: string | null | undefined): string {
  if (!nextDueDate) return "";
  const days = dayjs().diff(dayjs(nextDueDate), "day");
  if (days <= 0)   return "Current";
  if (days <= 30)  return "1–30 Days";
  if (days <= 60)  return "31–60 Days";
  if (days <= 90)  return "61–90 Days";
  if (days <= 120) return "91–120 Days";
  return "121+ Days";
}

router.get("/elevators", async (req, res) => {
  const params = ExportElevatorsQueryParams.safeParse(req.query);
  const orgId = req.user!.organizationId;

  // Respect user-level customer access restrictions
  const allowedIds = await getAccessibleCustomerIds(req.user!);
  if (allowedIds !== null && allowedIds.length === 0) {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Elevators");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="elevators_export_${dayjs().format("YYYY-MM-DD")}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
    return;
  }

  const conditions: any[] = [eq(elevatorsTable.organizationId, orgId)];
  if (allowedIds !== null) conditions.push(inArray(customersTable.id, allowedIds));
  if (params.success) {
    if (params.data.customerId) conditions.push(eq(customersTable.id, params.data.customerId));
    if (params.data.buildingId) conditions.push(eq(buildingsTable.id, params.data.buildingId));
  }

  const rows = await db
    .select({
      elevatorId:   elevatorsTable.id,
      customerName: customersTable.name,
      buildingName: buildingsTable.name,
      elevatorName: elevatorsTable.name,
      elevatorType: elevatorsTable.type,
      bank:         elevatorsTable.bank,
      internalId:   elevatorsTable.internalId,
      stateId:      elevatorsTable.stateId,
    })
    .from(elevatorsTable)
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(customersTable.name, buildingsTable.name, elevatorsTable.name);

  // Most urgent open inspection per elevator using DISTINCT ON (PostgreSQL)
  const elevatorIds = rows.map(r => r.elevatorId);
  type LatestInsp = { elevator_id: number; status: string; inspection_type: string; next_due_date: string | null; scheduled_date: string | null; last_inspection_date: string | null };
  let latestInspMap = new Map<number, LatestInsp>();
  if (elevatorIds.length > 0) {
    const idArray = sql.raw(`ARRAY[${elevatorIds.join(",")}]`);
    const openRows = await db.execute<LatestInsp>(sql`
      SELECT DISTINCT ON (elevator_id)
        elevator_id, status, inspection_type, next_due_date, scheduled_date, last_inspection_date
      FROM inspections
      WHERE organization_id = ${orgId}
        AND elevator_id = ANY(${idArray})
        AND status != 'COMPLETED'
      ORDER BY
        elevator_id,
        EXTRACT(YEAR FROM next_due_date::date) ASC NULLS LAST,
        CASE inspection_type WHEN 'CAT5' THEN 0 ELSE 1 END ASC,
        next_due_date ASC NULLS LAST
    `);
    for (const r of openRows.rows) {
      latestInspMap.set(r.elevator_id, r);
    }
    const missingIds = elevatorIds.filter(id => !latestInspMap.has(id));
    if (missingIds.length > 0) {
      const fallbackRows = await db.execute<LatestInsp>(sql`
        SELECT DISTINCT ON (elevator_id)
          elevator_id, status, inspection_type, next_due_date, scheduled_date, last_inspection_date
        FROM inspections
        WHERE organization_id = ${orgId}
          AND elevator_id = ANY(${sql.raw(`ARRAY[${missingIds.join(",")}]`)})
        ORDER BY elevator_id, next_due_date DESC NULLS LAST
      `);
      for (const r of fallbackRows.rows) {
        latestInspMap.set(r.elevator_id, r);
      }
    }
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Elevators");

  sheet.columns = [
    { header: "Customer",           key: "customerName",       width: 25 },
    { header: "Building",           key: "buildingName",       width: 30 },
    { header: "Elevator Name",      key: "elevatorName",       width: 25 },
    { header: "Elevator Type",      key: "elevatorType",       width: 15 },
    { header: "Bank",               key: "bank",               width: 15 },
    { header: "Unit ID",            key: "internalId",         width: 14 },
    { header: "State ID",           key: "stateId",            width: 14 },
    { header: "Insp Type",          key: "inspType",           width: 12 },
    { header: "Status",             key: "inspStatus",         width: 18 },
    { header: "Last Insp Date",     key: "lastInspDate",       width: 18, style: DATE_STYLE },
    { header: "Next Due Date",      key: "nextDueDate",        width: 18, style: DATE_STYLE },
    { header: "Days",               key: "days",               width: 10 },
    { header: "Aging Bucket",       key: "agingBucket",        width: 16 },
    { header: "Scheduled Date",     key: "scheduledDate",      width: 18, style: DATE_STYLE },
  ];

  sheet.getRow(1).font = { bold: true };

  const today = dayjs();
  rows.forEach(r => {
    const insp = latestInspMap.get(r.elevatorId);
    const daysVal = insp?.next_due_date
      ? today.diff(dayjs(insp.next_due_date), "day")
      : null;
    sheet.addRow({
      customerName:  r.customerName ?? "",
      buildingName:  r.buildingName ?? "",
      elevatorName:  r.elevatorName ?? "",
      elevatorType:  r.elevatorType ?? "",
      bank:          r.bank ?? "",
      internalId:    r.internalId ?? "",
      stateId:       r.stateId ?? "",
      inspType:      insp?.inspection_type ?? "",
      inspStatus:    insp ? statusLabel(insp.status, insp.next_due_date) : "",
      lastInspDate:  toDate(insp?.last_inspection_date),
      nextDueDate:   toDate(insp?.next_due_date),
      days:          daysVal ?? "",
      agingBucket:   agingBucketLabel(insp?.next_due_date),
      scheduledDate: toDate(insp?.scheduled_date),
    });
  });

  const filename = `elevators_export_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

router.get("/overdue", async (req, res) => {
  const orgId = req.user!.organizationId;
  const todayStr = dayjs().format("YYYY-MM-DD");
  const customerIdParam = req.query.customerId ? parseInt(req.query.customerId as string) : null;

  const allowedIds = await getAccessibleCustomerIds(req.user!);

  const conditions: any[] = [
    eq(inspectionsTable.organizationId, orgId),
    sql`${inspectionsTable.nextDueDate} IS NOT NULL`,
    sql`${inspectionsTable.nextDueDate}::date < ${todayStr}::date`,
    sql`${inspectionsTable.status} != 'COMPLETED'`,
  ];
  if (allowedIds !== null) {
    if (allowedIds.length === 0) { conditions.push(sql`1=0`); }
    else conditions.push(inArray(customersTable.id, allowedIds));
  }
  if (customerIdParam) conditions.push(eq(customersTable.id, customerIdParam));

  const rows = await db
    .select({
      customerName:   customersTable.name,
      buildingName:   buildingsTable.name,
      elevatorName:   elevatorsTable.name,
      inspectionType: inspectionsTable.inspectionType,
      status:         inspectionsTable.status,
      nextDueDate:    inspectionsTable.nextDueDate,
      scheduledDate:  inspectionsTable.scheduledDate,
      notes:          inspectionsTable.notes,
    })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(inspectionsTable.nextDueDate);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Overdue Inspections");

  sheet.columns = [
    { header: "Customer",        key: "customerName",   width: 25 },
    { header: "Building",        key: "buildingName",   width: 30 },
    { header: "Elevator",        key: "elevatorName",   width: 25 },
    { header: "Type",            key: "inspectionType", width: 10 },
    { header: "Status",          key: "status",         width: 15 },
    { header: "Was Due",         key: "nextDueDate",    width: 18, style: DATE_STYLE },
    { header: "Days Overdue",    key: "daysOverdue",    width: 14 },
    { header: "Scheduled Date",  key: "scheduledDate",  width: 18, style: DATE_STYLE },
    { header: "Notes",           key: "notes",          width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };

  rows.forEach(r => {
    const daysOverdue = r.nextDueDate ? dayjs().diff(dayjs(r.nextDueDate), "day") : null;
    sheet.addRow({
      customerName:   r.customerName ?? "",
      buildingName:   r.buildingName ?? "",
      elevatorName:   r.elevatorName ?? "",
      inspectionType: r.inspectionType,
      status:         r.status,
      nextDueDate:    toDate(r.nextDueDate),
      daysOverdue:    daysOverdue ?? "",
      scheduledDate:  toDate(r.scheduledDate),
      notes:          r.notes ?? "",
    });
  });

  const filename = `overdue_inspections_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

router.get("/upcoming", async (req, res) => {
  const orgId = req.user!.organizationId;
  const todayStr = dayjs().format("YYYY-MM-DD");
  const in14Days  = dayjs().add(14, "day").format("YYYY-MM-DD");
  const customerIdParam = req.query.customerId ? parseInt(req.query.customerId as string) : null;

  const allowedIds = await getAccessibleCustomerIds(req.user!);

  const conditions: any[] = [
    eq(inspectionsTable.organizationId, orgId),
    sql`${inspectionsTable.nextDueDate} IS NOT NULL`,
    sql`${inspectionsTable.nextDueDate}::date >= ${todayStr}::date`,
    sql`${inspectionsTable.nextDueDate}::date <= ${in14Days}::date`,
    sql`${inspectionsTable.status} != 'COMPLETED'`,
  ];
  if (allowedIds !== null) {
    if (allowedIds.length === 0) { conditions.push(sql`1=0`); }
    else conditions.push(inArray(customersTable.id, allowedIds));
  }
  if (customerIdParam) conditions.push(eq(customersTable.id, customerIdParam));

  const rows = await db
    .select({
      customerName:   customersTable.name,
      buildingName:   buildingsTable.name,
      elevatorName:   elevatorsTable.name,
      inspectionType: inspectionsTable.inspectionType,
      status:         inspectionsTable.status,
      nextDueDate:    inspectionsTable.nextDueDate,
      scheduledDate:  inspectionsTable.scheduledDate,
      notes:          inspectionsTable.notes,
    })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(inspectionsTable.nextDueDate);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Upcoming Inspections");

  sheet.columns = [
    { header: "Customer",        key: "customerName",   width: 25 },
    { header: "Building",        key: "buildingName",   width: 30 },
    { header: "Elevator",        key: "elevatorName",   width: 25 },
    { header: "Type",            key: "inspectionType", width: 10 },
    { header: "Status",          key: "status",         width: 15 },
    { header: "Due Date",        key: "nextDueDate",    width: 18, style: DATE_STYLE },
    { header: "Days Until Due",  key: "daysUntil",      width: 14 },
    { header: "Scheduled Date",  key: "scheduledDate",  width: 18, style: DATE_STYLE },
    { header: "Notes",           key: "notes",          width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };

  rows.forEach(r => {
    const daysUntil = r.nextDueDate ? dayjs(r.nextDueDate).diff(dayjs(), "day") : null;
    sheet.addRow({
      customerName:   r.customerName ?? "",
      buildingName:   r.buildingName ?? "",
      elevatorName:   r.elevatorName ?? "",
      inspectionType: r.inspectionType,
      status:         r.status,
      nextDueDate:    toDate(r.nextDueDate),
      daysUntil:      daysUntil ?? "",
      scheduledDate:  toDate(r.scheduledDate),
      notes:          r.notes ?? "",
    });
  });

  const filename = `upcoming_inspections_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
