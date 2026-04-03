import { Router } from "express";
import { db, inspectionsTable, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
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
      customerName: customersTable.name,
      buildingName: buildingsTable.name,
      elevatorName: elevatorsTable.name,
      type: elevatorsTable.type,
      bank: elevatorsTable.bank,
    })
    .from(elevatorsTable)
    .leftJoin(buildingsTable, eq(elevatorsTable.buildingId, buildingsTable.id))
    .leftJoin(customersTable, eq(buildingsTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(elevatorsTable.name);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Elevators");

  sheet.columns = [
    { header: "Customer",      key: "customerName", width: 25 },
    { header: "Building",      key: "buildingName", width: 30 },
    { header: "Elevator Name", key: "elevatorName", width: 25 },
    { header: "Type",          key: "type",         width: 15 },
    { header: "Bank",          key: "bank",         width: 15 },
  ];

  sheet.getRow(1).font = { bold: true };

  rows.forEach(r => {
    sheet.addRow({
      customerName: r.customerName ?? "",
      buildingName: r.buildingName ?? "",
      elevatorName: r.elevatorName ?? "",
      type:         r.type,
      bank:         r.bank ?? "",
    });
  });

  const filename = `elevators_export_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
