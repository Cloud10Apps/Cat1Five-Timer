import { Router } from "express";
import { db, inspectionsTable, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and, inArray, gte, lte, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import dayjs from "dayjs";
import { requireAuth } from "../middleware/auth.js";
import { getAccessibleCustomerIds } from "../lib/user-access.js";
import { ExportElevatorsQueryParams } from "@workspace/api-zod";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

router.use(requireAuth);

function toDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const DATE_STYLE = { numFmt: "mm/dd/yyyy" };

/* ── Inspection export helpers ── */
function computeInspStatus(status: string, nextDueDate: string | null | undefined, completionDate: string | null | undefined): string {
  if (status === "COMPLETED") return "COMPLETED";
  if (nextDueDate && !completionDate && dayjs(nextDueDate).isBefore(dayjs(), "day")) return "OVERDUE";
  return status;
}

const STATUS_LABEL_MAP: Record<string, string> = {
  NOT_STARTED: "Not Scheduled",
  SCHEDULED:   "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED:   "Completed",
  OVERDUE:     "Overdue",
};

function getAgingBucketKey(nextDueDate: string | null | undefined, computedStatus: string): string | null {
  if (computedStatus === "COMPLETED" || !nextDueDate) return null;
  const days = dayjs().startOf("day").diff(dayjs(nextDueDate).startOf("day"), "day");
  if (days === 0)   return "due-today";
  if (days > 90)    return "overdue-91+";
  if (days > 60)    return "overdue-61-90";
  if (days > 30)    return "overdue-31-60";
  if (days > 0)     return "overdue-1-30";
  if (days >= -7)   return "due-1-7";
  if (days >= -14)  return "due-8-14";
  if (days >= -30)  return "due-15-30";
  if (days >= -60)  return "due-31-60";
  if (days >= -90)  return "due-61-90";
  return null;
}

function getAgingBucketDisplay(key: string | null): string {
  if (!key) return "";
  const map: Record<string, string> = {
    "due-today":     "Due Today",
    "due-1-7":       "Next 7 Days",
    "due-8-14":      "Next 14 Days",
    "due-15-30":     "Next 30 Days",
    "due-31-60":     "Next 60 Days",
    "due-61-90":     "Next 90 Days",
    "overdue-1-30":  "Overdue 1–30 Days",
    "overdue-31-60": "Overdue 31–60 Days",
    "overdue-61-90": "Overdue 61–90 Days",
    "overdue-91+":   "Overdue 91+ Days",
  };
  return map[key] ?? "";
}

function qArr(query: Record<string, any>, key: string): string[] {
  const val = query[key];
  if (!val) return [];
  return Array.isArray(val) ? (val as string[]) : [val as string];
}

router.get("/inspections", asyncHandler(async (req, res) => {
  const orgId = req.user!.organizationId;

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

  const q = req.query as Record<string, any>;

  // Parse array filter params
  const customerIds    = qArr(q, "customerId").map(Number).filter(n => !isNaN(n) && n > 0);
  const buildingIds    = qArr(q, "buildingId").map(Number).filter(n => !isNaN(n) && n > 0);
  const elevatorIds    = qArr(q, "elevatorId").map(Number).filter(n => !isNaN(n) && n > 0);
  const banks          = qArr(q, "bank");
  const elevatorTypes  = qArr(q, "elevatorType");
  const inspTypes      = qArr(q, "inspectionType");
  const statuses       = qArr(q, "status");
  const dueMonths      = qArr(q, "dueMonth");
  const dueYears       = qArr(q, "dueYear");
  const agingBuckets   = qArr(q, "agingBucket");

  const lastInspFrom  = q.lastInspectionDateFrom as string | undefined;
  const lastInspTo    = q.lastInspectionDateTo   as string | undefined;
  const nextDueFrom   = q.nextDueDateFrom        as string | undefined;
  const nextDueTo     = q.nextDueDateTo          as string | undefined;
  const scheduledFrom = q.scheduledDateFrom      as string | undefined;
  const scheduledTo   = q.scheduledDateTo        as string | undefined;
  const completionFrom = q.completionDateFrom    as string | undefined;
  const completionTo   = q.completionDateTo      as string | undefined;

  const conditions: any[] = [eq(inspectionsTable.organizationId, orgId)];
  if (allowedIds !== null) conditions.push(inArray(customersTable.id, allowedIds));

  if (customerIds.length   > 0) conditions.push(inArray(customersTable.id,            customerIds));
  if (buildingIds.length   > 0) conditions.push(inArray(buildingsTable.id,            buildingIds));
  if (elevatorIds.length   > 0) conditions.push(inArray(elevatorsTable.id,            elevatorIds));
  if (banks.length         > 0) conditions.push(inArray(elevatorsTable.bank,          banks as any));
  if (elevatorTypes.length > 0) conditions.push(inArray(elevatorsTable.type,          elevatorTypes as any));
  if (inspTypes.length     > 0) conditions.push(inArray(inspectionsTable.inspectionType, inspTypes as any));

  // Status: OVERDUE is computed — only push storedStatuses to DB; post-filter handles OVERDUE
  const hasOverdueFilter  = statuses.includes("OVERDUE");
  const storedStatuses    = statuses.filter(s => s !== "OVERDUE");
  if (statuses.length > 0 && storedStatuses.length > 0 && !hasOverdueFilter) {
    conditions.push(inArray(inspectionsTable.status, storedStatuses as any));
  }

  if (lastInspFrom)   conditions.push(gte(inspectionsTable.lastInspectionDate, lastInspFrom));
  if (lastInspTo)     conditions.push(lte(inspectionsTable.lastInspectionDate, lastInspTo));
  if (nextDueFrom)    conditions.push(gte(inspectionsTable.nextDueDate,        nextDueFrom));
  if (nextDueTo)      conditions.push(lte(inspectionsTable.nextDueDate,        nextDueTo));
  if (scheduledFrom)  conditions.push(gte(inspectionsTable.scheduledDate,      scheduledFrom));
  if (scheduledTo)    conditions.push(lte(inspectionsTable.scheduledDate,      scheduledTo));
  if (completionFrom) conditions.push(gte(inspectionsTable.completionDate,     completionFrom));
  if (completionTo)   conditions.push(lte(inspectionsTable.completionDate,     completionTo));

  const rows = await db
    .select({
      customerName:       customersTable.name,
      buildingName:       buildingsTable.name,
      buildingAddress:    buildingsTable.address,
      buildingCity:       buildingsTable.city,
      buildingState:      buildingsTable.state,
      buildingZip:        buildingsTable.zip,
      elevatorName:       elevatorsTable.name,
      elevatorType:       elevatorsTable.type,
      bank:               elevatorsTable.bank,
      internalId:         elevatorsTable.internalId,
      stateId:            elevatorsTable.stateId,
      inspectionType:     inspectionsTable.inspectionType,
      recurrenceYears:    inspectionsTable.recurrenceYears,
      lastInspectionDate: inspectionsTable.lastInspectionDate,
      nextDueDate:        inspectionsTable.nextDueDate,
      status:             inspectionsTable.status,
      scheduledDate:      inspectionsTable.scheduledDate,
      completionDate:     inspectionsTable.completionDate,
      notes:              inspectionsTable.notes,
    })
    .from(inspectionsTable)
    .leftJoin(elevatorsTable, eq(inspectionsTable.elevatorId, elevatorsTable.id))
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(customersTable.name, buildingsTable.name, elevatorsTable.name, inspectionsTable.inspectionType, inspectionsTable.nextDueDate);

  // Post-process: compute status, aging, and raw day metrics
  let processed = rows.map(r => {
    const computedStatus   = computeInspStatus(r.status, r.nextDueDate, r.completionDate);
    const agingBucketKey   = getAgingBucketKey(r.nextDueDate, computedStatus);
    const agingDays        = (computedStatus !== "COMPLETED" && r.nextDueDate)
      ? dayjs().startOf("day").diff(dayjs(r.nextDueDate).startOf("day"), "day")
      : null;
    const daysToSchedule   = (r.scheduledDate && r.nextDueDate)
      ? dayjs(r.scheduledDate).startOf("day").diff(dayjs(r.nextDueDate).startOf("day"), "day")
      : null;
    const daysToComplete   = (r.completionDate && r.nextDueDate)
      ? dayjs(r.completionDate).startOf("day").diff(dayjs(r.nextDueDate).startOf("day"), "day")
      : null;
    return { ...r, computedStatus, agingBucketKey, agingDays, daysToSchedule, daysToComplete };
  });

  // Post-DB filters (computed values)
  if (statuses.length > 0) {
    processed = processed.filter(r => statuses.includes(r.computedStatus));
  }
  if (dueMonths.length > 0) {
    processed = processed.filter(r => r.nextDueDate && dueMonths.includes(dayjs(r.nextDueDate).format("MM")));
  }
  if (dueYears.length > 0) {
    processed = processed.filter(r => r.nextDueDate && dueYears.includes(dayjs(r.nextDueDate).format("YYYY")));
  }
  if (agingBuckets.length > 0) {
    processed = processed.filter(r => r.agingBucketKey && agingBuckets.includes(r.agingBucketKey));
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inspections");

  sheet.columns = [
    { header: "Customer",             key: "customerName",       width: 25 },
    { header: "Building",             key: "buildingName",       width: 30 },
    { header: "Address",              key: "buildingAddress",    width: 30 },
    { header: "City",                 key: "buildingCity",       width: 20 },
    { header: "State",                key: "buildingState",      width: 10 },
    { header: "Zip",                  key: "buildingZip",        width: 10 },
    { header: "Elevator",             key: "elevatorName",       width: 25 },
    { header: "Elevator Type",        key: "elevatorType",       width: 15 },
    { header: "Bank",                 key: "bank",               width: 14 },
    { header: "Unit ID",              key: "internalId",         width: 14 },
    { header: "State ID",             key: "stateId",            width: 14 },
    { header: "Inspection Type",      key: "inspectionType",     width: 16 },
    { header: "Recurrence (yrs)",     key: "recurrenceYears",    width: 16 },
    { header: "Last Inspection Date", key: "lastInspectionDate", width: 22, style: DATE_STYLE },
    { header: "Next Due Date",        key: "nextDueDate",        width: 18, style: DATE_STYLE },
    { header: "Scheduled Date",       key: "scheduledDate",      width: 18, style: DATE_STYLE },
    { header: "Completion Date",      key: "completionDate",     width: 18, style: DATE_STYLE },
    { header: "Inspection Status",      key: "status",           width: 20 },
    { header: "Aging Days",             key: "agingDays",        width: 12 },
    { header: "Due Status",             key: "agingBucket",      width: 16 },
    { header: "Days to Schedule (Raw)", key: "daysToSchedule",   width: 22 },
    { header: "Days to Complete (Raw)", key: "daysToComplete",   width: 22 },
    { header: "Notes",                  key: "notes",            width: 45 },
  ];

  sheet.getRow(1).font = { bold: true };

  processed.forEach(r => {
    sheet.addRow({
      customerName:       r.customerName       ?? "",
      buildingName:       r.buildingName       ?? "",
      buildingAddress:    r.buildingAddress    ?? "",
      buildingCity:       r.buildingCity       ?? "",
      buildingState:      r.buildingState      ?? "",
      buildingZip:        r.buildingZip        ?? "",
      elevatorName:       r.elevatorName       ?? "",
      elevatorType:       r.elevatorType       ?? "",
      bank:               r.bank               ?? "",
      internalId:         r.internalId         ?? "",
      stateId:            r.stateId            ?? "",
      inspectionType:     r.inspectionType,
      recurrenceYears:    r.recurrenceYears,
      lastInspectionDate: toDate(r.lastInspectionDate),
      nextDueDate:        toDate(r.nextDueDate),
      scheduledDate:      toDate(r.scheduledDate),
      completionDate:     toDate(r.completionDate),
      status:             STATUS_LABEL_MAP[r.computedStatus] ?? r.computedStatus,
      agingDays:          r.agingDays ?? "",
      agingBucket:        getAgingBucketDisplay(r.agingBucketKey),
      daysToSchedule:     r.daysToSchedule ?? "",
      daysToComplete:     r.daysToComplete ?? "",
      notes:              r.notes ?? "",
    });
  });

  const filename = `inspections_export_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}));

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

function agingBucketLabel(nextDueDate: string | null | undefined,
                          status?: string): string {
  if (!nextDueDate) return "";
  if (status === "COMPLETED") return "";
  const days = dayjs().startOf("day").diff(dayjs(nextDueDate).startOf("day"), "day");
  if (days === 0)   return "Due Today";
  if (days > 90)    return "Overdue 91+ Days";
  if (days > 60)    return "Overdue 61–90 Days";
  if (days > 30)    return "Overdue 31–60 Days";
  if (days > 0)     return "Overdue 1–30 Days";
  if (days >= -7)   return "Next 7 Days";
  if (days >= -14)  return "Next 14 Days";
  if (days >= -30)  return "Next 30 Days";
  if (days >= -60)  return "Next 60 Days";
  if (days >= -90)  return "Next 90 Days";
  return "Due in 90+ Days";
}

router.get("/elevators", asyncHandler(async (req, res) => {
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
      elevatorId:      elevatorsTable.id,
      customerName:    customersTable.name,
      buildingName:    buildingsTable.name,
      buildingAddress: buildingsTable.address,
      buildingCity:    buildingsTable.city,
      buildingState:   buildingsTable.state,
      buildingZip:     buildingsTable.zip,
      elevatorName:    elevatorsTable.name,
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

  // Most urgent open inspection per elevator
  const elevatorIds = rows.map(r => r.elevatorId);
  type LatestInsp = { elevatorId: number; status: string; inspection_type: string; nextDueDate: string | null; scheduledDate: string | null; lastInspectionDate: string | null };
  let latestInspMap = new Map<number, LatestInsp>();
  if (elevatorIds.length > 0) {
    const allInspRows = await db
      .select({
        elevatorId:          inspectionsTable.elevatorId,
        status:              inspectionsTable.status,
        inspection_type:     inspectionsTable.inspectionType,
        nextDueDate:         inspectionsTable.nextDueDate,
        scheduledDate:       inspectionsTable.scheduledDate,
        lastInspectionDate:  inspectionsTable.lastInspectionDate,
      })
      .from(inspectionsTable)
      .where(
        and(
          eq(inspectionsTable.organizationId, orgId),
          inArray(inspectionsTable.elevatorId, elevatorIds)
        )
      )
      .orderBy(inspectionsTable.nextDueDate);

    // Keep only the most urgent open inspection per elevator; fall back to any if none open
    const openMap = new Map<number, LatestInsp>();
    const anyMap  = new Map<number, LatestInsp>();
    for (const r of allInspRows) {
      const row: LatestInsp = { elevatorId: r.elevatorId, status: r.status, inspection_type: r.inspection_type ?? "", nextDueDate: r.nextDueDate ?? null, scheduledDate: r.scheduledDate ?? null, lastInspectionDate: r.lastInspectionDate ?? null };
      if (!anyMap.has(r.elevatorId)) anyMap.set(r.elevatorId, row);
      if (r.status !== "COMPLETED" && !openMap.has(r.elevatorId)) openMap.set(r.elevatorId, row);
    }
    for (const [id, row] of openMap) latestInspMap.set(id, row);
    for (const [id, row] of anyMap) { if (!latestInspMap.has(id)) latestInspMap.set(id, row); }
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Elevators");

  sheet.columns = [
    { header: "Customer",           key: "customerName",       width: 25 },
    { header: "Building",           key: "buildingName",       width: 30 },
    { header: "Address",            key: "buildingAddress",    width: 30 },
    { header: "City",               key: "buildingCity",       width: 20 },
    { header: "State",              key: "buildingState",      width: 10 },
    { header: "Zip",                key: "buildingZip",        width: 10 },
    { header: "Elevator Name",      key: "elevatorName",       width: 25 },
    { header: "Elevator Type",      key: "elevatorType",       width: 15 },
    { header: "Bank",               key: "bank",               width: 15 },
    { header: "Unit ID",            key: "internalId",         width: 14 },
    { header: "State ID",           key: "stateId",            width: 14 },
    { header: "Insp Type",          key: "inspType",           width: 12 },
    { header: "Inspection Status",  key: "inspStatus",         width: 20 },
    { header: "Last Insp Date",     key: "lastInspDate",       width: 18, style: DATE_STYLE },
    { header: "Next Due Date",      key: "nextDueDate",        width: 18, style: DATE_STYLE },
    { header: "Days",               key: "days",               width: 10 },
    { header: "Due Status",         key: "agingBucket",        width: 16 },
    { header: "Scheduled Date",     key: "scheduledDate",      width: 18, style: DATE_STYLE },
  ];

  sheet.getRow(1).font = { bold: true };

  const today = dayjs();
  rows.forEach(r => {
    const insp = latestInspMap.get(r.elevatorId);
    const daysVal = insp?.nextDueDate
      ? today.diff(dayjs(insp.nextDueDate), "day")
      : null;
    sheet.addRow({
      customerName:    r.customerName    ?? "",
      buildingName:    r.buildingName    ?? "",
      buildingAddress: r.buildingAddress ?? "",
      buildingCity:    r.buildingCity    ?? "",
      buildingState:   r.buildingState   ?? "",
      buildingZip:     r.buildingZip     ?? "",
      elevatorName:    r.elevatorName    ?? "",
      elevatorType:    r.elevatorType    ?? "",
      bank:          r.bank ?? "",
      internalId:    r.internalId ?? "",
      stateId:       r.stateId ?? "",
      inspType:      insp?.inspection_type ?? "",
      inspStatus:    insp ? statusLabel(insp.status, insp.nextDueDate) : "",
      lastInspDate:  toDate(insp?.lastInspectionDate),
      nextDueDate:   toDate(insp?.nextDueDate),
      days:          daysVal ?? "",
      agingBucket:   agingBucketLabel(insp?.nextDueDate, insp?.status),
      scheduledDate: toDate(insp?.scheduledDate),
    });
  });

  const filename = `elevators_export_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}));

router.get("/overdue", asyncHandler(async (req, res) => {
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
      customerName:    customersTable.name,
      buildingName:    buildingsTable.name,
      buildingAddress: buildingsTable.address,
      buildingCity:    buildingsTable.city,
      buildingState:   buildingsTable.state,
      buildingZip:     buildingsTable.zip,
      elevatorName:    elevatorsTable.name,
      bank:            elevatorsTable.bank,
      internalId:      elevatorsTable.internalId,
      stateId:         elevatorsTable.stateId,
      inspectionType:  inspectionsTable.inspectionType,
      status:          inspectionsTable.status,
      nextDueDate:     inspectionsTable.nextDueDate,
      scheduledDate:   inspectionsTable.scheduledDate,
      notes:           inspectionsTable.notes,
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
    { header: "Address",         key: "buildingAddress", width: 30 },
    { header: "City",            key: "buildingCity",   width: 20 },
    { header: "State",           key: "buildingState",  width: 10 },
    { header: "Zip",             key: "buildingZip",    width: 10 },
    { header: "Elevator",        key: "elevatorName",   width: 25 },
    { header: "Bank",            key: "bank",           width: 15 },
    { header: "Unit ID",         key: "internalId",     width: 14 },
    { header: "State ID",        key: "stateId",        width: 14 },
    { header: "Type",            key: "inspectionType", width: 10 },
    { header: "Inspection Status", key: "status",       width: 20 },
    { header: "Was Due",         key: "nextDueDate",    width: 18, style: DATE_STYLE },
    { header: "Days Overdue",    key: "daysOverdue",    width: 14 },
    { header: "Scheduled Date",  key: "scheduledDate",  width: 18, style: DATE_STYLE },
    { header: "Notes",           key: "notes",          width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };

  rows.forEach(r => {
    const daysOverdue = r.nextDueDate ? dayjs().startOf("day").diff(dayjs(r.nextDueDate).startOf("day"), "day") : null;
    sheet.addRow({
      customerName:    r.customerName    ?? "",
      buildingName:    r.buildingName    ?? "",
      buildingAddress: r.buildingAddress ?? "",
      buildingCity:    r.buildingCity    ?? "",
      buildingState:   r.buildingState   ?? "",
      buildingZip:     r.buildingZip     ?? "",
      elevatorName:    r.elevatorName    ?? "",
      bank:            r.bank            ?? "",
      internalId:      r.internalId      ?? "",
      stateId:         r.stateId         ?? "",
      inspectionType:  r.inspectionType,
      status:          STATUS_LABEL_MAP[r.status] ?? r.status,
      nextDueDate:     toDate(r.nextDueDate),
      daysOverdue:     daysOverdue ?? "",
      scheduledDate:   toDate(r.scheduledDate),
      notes:           r.notes ?? "",
    });
  });

  const filename = `overdue_inspections_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}));

router.get("/upcoming", asyncHandler(async (req, res) => {
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
      customerName:    customersTable.name,
      buildingName:    buildingsTable.name,
      buildingAddress: buildingsTable.address,
      buildingCity:    buildingsTable.city,
      buildingState:   buildingsTable.state,
      buildingZip:     buildingsTable.zip,
      elevatorName:    elevatorsTable.name,
      bank:            elevatorsTable.bank,
      internalId:      elevatorsTable.internalId,
      stateId:         elevatorsTable.stateId,
      inspectionType:  inspectionsTable.inspectionType,
      status:          inspectionsTable.status,
      nextDueDate:     inspectionsTable.nextDueDate,
      scheduledDate:   inspectionsTable.scheduledDate,
      notes:           inspectionsTable.notes,
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
    { header: "Customer",        key: "customerName",    width: 25 },
    { header: "Building",        key: "buildingName",    width: 30 },
    { header: "Address",         key: "buildingAddress", width: 30 },
    { header: "City",            key: "buildingCity",    width: 20 },
    { header: "State",           key: "buildingState",   width: 10 },
    { header: "Zip",             key: "buildingZip",     width: 10 },
    { header: "Elevator",        key: "elevatorName",    width: 25 },
    { header: "Bank",            key: "bank",            width: 15 },
    { header: "Unit ID",         key: "internalId",      width: 14 },
    { header: "State ID",        key: "stateId",         width: 14 },
    { header: "Type",            key: "inspectionType",  width: 10 },
    { header: "Inspection Status", key: "status",        width: 20 },
    { header: "Due Date",        key: "nextDueDate",     width: 18, style: DATE_STYLE },
    { header: "Days Until Due",  key: "daysUntil",       width: 14 },
    { header: "Scheduled Date",  key: "scheduledDate",   width: 18, style: DATE_STYLE },
    { header: "Notes",           key: "notes",           width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };

  rows.forEach(r => {
    const daysUntil = r.nextDueDate ? dayjs(r.nextDueDate).diff(dayjs(), "day") : null;
    sheet.addRow({
      customerName:    r.customerName    ?? "",
      buildingName:    r.buildingName    ?? "",
      buildingAddress: r.buildingAddress ?? "",
      buildingCity:    r.buildingCity    ?? "",
      buildingState:   r.buildingState   ?? "",
      buildingZip:     r.buildingZip     ?? "",
      elevatorName:    r.elevatorName    ?? "",
      bank:            r.bank            ?? "",
      internalId:      r.internalId      ?? "",
      stateId:         r.stateId         ?? "",
      inspectionType:  r.inspectionType,
      status:          STATUS_LABEL_MAP[r.status] ?? r.status,
      nextDueDate:     toDate(r.nextDueDate),
      daysUntil:       daysUntil ?? "",
      scheduledDate:   toDate(r.scheduledDate),
      notes:           r.notes ?? "",
    });
  });

  const filename = `upcoming_inspections_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}));

export default router;
