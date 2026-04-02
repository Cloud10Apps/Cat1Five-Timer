import { Router } from "express";
import { db, inspectionsTable, elevatorsTable, buildingsTable, customersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import ExcelJS from "exceljs";
import dayjs from "dayjs";
import { requireAuth } from "../middleware/auth.js";
import { ExportInspectionsQueryParams, ExportElevatorsQueryParams } from "@workspace/api-zod";

const router = Router();

router.use(requireAuth);

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  return dayjs(d).format("MM/DD/YYYY");
}

router.get("/inspections", async (req, res) => {
  const params = ExportInspectionsQueryParams.safeParse(req.query);
  const orgId = req.user!.organizationId;

  const conditions: any[] = [eq(inspectionsTable.organizationId, orgId)];
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
    { header: "Customer", key: "customerName", width: 25 },
    { header: "Building", key: "buildingName", width: 30 },
    { header: "Elevator", key: "elevatorName", width: 25 },
    { header: "Inspection Type", key: "inspectionType", width: 18 },
    { header: "Last Inspection Date", key: "lastInspectionDate", width: 22 },
    { header: "Next Due Date", key: "nextDueDate", width: 18 },
    { header: "Status", key: "status", width: 15 },
    { header: "Scheduled Date", key: "scheduledDate", width: 18 },
    { header: "Completion Date", key: "completionDate", width: 18 },
    { header: "Notes", key: "notes", width: 40 },
  ];

  sheet.getRow(1).font = { bold: true };

  rows.forEach(r => {
    sheet.addRow({
      customerName: r.customerName ?? "",
      buildingName: r.buildingName ?? "",
      elevatorName: r.elevatorName ?? "",
      inspectionType: r.inspectionType,
      lastInspectionDate: formatDate(r.lastInspectionDate),
      nextDueDate: formatDate(r.nextDueDate),
      status: r.status,
      scheduledDate: formatDate(r.scheduledDate),
      completionDate: formatDate(r.completionDate),
      notes: r.notes ?? "",
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

  const conditions: any[] = [eq(elevatorsTable.organizationId, orgId)];
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
    { header: "Customer", key: "customerName", width: 25 },
    { header: "Building", key: "buildingName", width: 30 },
    { header: "Elevator Name", key: "elevatorName", width: 25 },
    { header: "Type", key: "type", width: 15 },
    { header: "Bank", key: "bank", width: 15 },
  ];

  sheet.getRow(1).font = { bold: true };

  rows.forEach(r => {
    sheet.addRow({
      customerName: r.customerName ?? "",
      buildingName: r.buildingName ?? "",
      elevatorName: r.elevatorName ?? "",
      type: r.type,
      bank: r.bank ?? "",
    });
  });

  const filename = `elevators_export_${dayjs().format("YYYY-MM-DD")}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
