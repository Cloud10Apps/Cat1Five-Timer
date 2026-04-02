import { db, organizationsTable, usersTable, customersTable, buildingsTable, elevatorsTable, inspectionsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";

async function seed() {
  console.log("Seeding database...");

  // Create org
  const [org] = await db.insert(organizationsTable).values({ name: "Acme Elevator Services" }).returning();

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  const [adminUser] = await db.insert(usersTable).values({
    email: "admin@acme.com",
    passwordHash,
    role: "ADMIN",
    organizationId: org.id,
    isActive: true,
  }).returning();

  // Create a regular user
  const userHash = await bcrypt.hash("user123", 10);
  await db.insert(usersTable).values({
    email: "inspector@acme.com",
    passwordHash: userHash,
    role: "USER",
    organizationId: org.id,
    isActive: true,
  });

  // Create customers
  const [cust1] = await db.insert(customersTable).values({ name: "Greenfield Properties", organizationId: org.id }).returning();
  const [cust2] = await db.insert(customersTable).values({ name: "Metro Commercial Realty", organizationId: org.id }).returning();
  const [cust3] = await db.insert(customersTable).values({ name: "Apex Tower Management", organizationId: org.id }).returning();

  // Create buildings
  const [bldg1] = await db.insert(buildingsTable).values({ name: "Greenfield Tower A", address: "100 Main St", city: "Chicago", state: "IL", zip: "60601", customerId: cust1.id, organizationId: org.id }).returning();
  const [bldg2] = await db.insert(buildingsTable).values({ name: "Greenfield Plaza", address: "200 Park Ave", city: "Chicago", state: "IL", zip: "60602", customerId: cust1.id, organizationId: org.id }).returning();
  const [bldg3] = await db.insert(buildingsTable).values({ name: "Metro Center", address: "500 Commerce Blvd", city: "New York", state: "NY", zip: "10001", customerId: cust2.id, organizationId: org.id }).returning();
  const [bldg4] = await db.insert(buildingsTable).values({ name: "Apex Tower", address: "1 Executive Dr", city: "Los Angeles", state: "CA", zip: "90001", customerId: cust3.id, organizationId: org.id }).returning();

  // Create elevators
  const [elev1] = await db.insert(elevatorsTable).values({ name: "Elevator #1", bank: "Bank A", type: "traction", buildingId: bldg1.id, organizationId: org.id }).returning();
  const [elev2] = await db.insert(elevatorsTable).values({ name: "Elevator #2", bank: "Bank A", type: "traction", buildingId: bldg1.id, organizationId: org.id }).returning();
  const [elev3] = await db.insert(elevatorsTable).values({ name: "Freight Elevator", bank: "Bank B", type: "hydraulic", buildingId: bldg1.id, organizationId: org.id }).returning();
  const [elev4] = await db.insert(elevatorsTable).values({ name: "Main Elevator", bank: "Bank A", type: "traction", buildingId: bldg2.id, organizationId: org.id }).returning();
  const [elev5] = await db.insert(elevatorsTable).values({ name: "Elevator #1", bank: "Bank A", type: "hydraulic", buildingId: bldg3.id, organizationId: org.id }).returning();
  const [elev6] = await db.insert(elevatorsTable).values({ name: "Elevator #2", bank: "Bank A", type: "traction", buildingId: bldg3.id, organizationId: org.id }).returning();
  const [elev7] = await db.insert(elevatorsTable).values({ name: "Penthouse Elevator", bank: "Bank C", type: "traction", buildingId: bldg4.id, organizationId: org.id }).returning();

  const today = dayjs();

  // Create inspections with various statuses
  await db.insert(inspectionsTable).values([
    {
      elevatorId: elev1.id,
      organizationId: org.id,
      inspectionType: "CAT1",
      recurrenceYears: 1,
      lastInspectionDate: today.subtract(14, "month").format("YYYY-MM-DD"),
      nextDueDate: today.subtract(2, "month").format("YYYY-MM-DD"),
      status: "OVERDUE",
    },
    {
      elevatorId: elev1.id,
      organizationId: org.id,
      inspectionType: "CAT5",
      recurrenceYears: 5,
      lastInspectionDate: today.subtract(2, "year").format("YYYY-MM-DD"),
      nextDueDate: today.add(3, "year").format("YYYY-MM-DD"),
      status: "NOT_STARTED",
    },
    {
      elevatorId: elev2.id,
      organizationId: org.id,
      inspectionType: "CAT1",
      recurrenceYears: 1,
      lastInspectionDate: today.subtract(1, "year").add(10, "day").format("YYYY-MM-DD"),
      nextDueDate: today.add(10, "day").format("YYYY-MM-DD"),
      scheduledDate: today.add(10, "day").format("YYYY-MM-DD"),
      status: "SCHEDULED",
    },
    {
      elevatorId: elev3.id,
      organizationId: org.id,
      inspectionType: "CAT1",
      recurrenceYears: 1,
      lastInspectionDate: today.subtract(1, "year").add(20, "day").format("YYYY-MM-DD"),
      nextDueDate: today.add(20, "day").format("YYYY-MM-DD"),
      status: "NOT_STARTED",
    },
    {
      elevatorId: elev4.id,
      organizationId: org.id,
      inspectionType: "CAT1",
      recurrenceYears: 1,
      lastInspectionDate: today.subtract(3, "month").format("YYYY-MM-DD"),
      nextDueDate: today.subtract(3, "month").add(1, "year").format("YYYY-MM-DD"),
      status: "NOT_STARTED",
    },
    {
      elevatorId: elev5.id,
      organizationId: org.id,
      inspectionType: "CAT1",
      recurrenceYears: 1,
      lastInspectionDate: today.subtract(13, "month").format("YYYY-MM-DD"),
      nextDueDate: today.subtract(1, "month").format("YYYY-MM-DD"),
      status: "OVERDUE",
    },
    {
      elevatorId: elev6.id,
      organizationId: org.id,
      inspectionType: "CAT1",
      recurrenceYears: 1,
      lastInspectionDate: today.subtract(6, "month").format("YYYY-MM-DD"),
      nextDueDate: today.add(6, "month").format("YYYY-MM-DD"),
      status: "IN_PROGRESS",
    },
    {
      elevatorId: elev6.id,
      organizationId: org.id,
      inspectionType: "CAT5",
      recurrenceYears: 5,
      lastInspectionDate: today.subtract(4, "year").format("YYYY-MM-DD"),
      nextDueDate: today.add(1, "year").format("YYYY-MM-DD"),
      status: "NOT_STARTED",
    },
    {
      elevatorId: elev7.id,
      organizationId: org.id,
      inspectionType: "CAT1",
      recurrenceYears: 1,
      lastInspectionDate: today.subtract(1, "year").add(5, "day").format("YYYY-MM-DD"),
      nextDueDate: today.add(5, "day").format("YYYY-MM-DD"),
      scheduledDate: today.add(5, "day").format("YYYY-MM-DD"),
      status: "SCHEDULED",
    },
    {
      elevatorId: elev7.id,
      organizationId: org.id,
      inspectionType: "CAT5",
      recurrenceYears: 5,
      lastInspectionDate: today.subtract(1, "year").format("YYYY-MM-DD"),
      nextDueDate: today.add(4, "year").format("YYYY-MM-DD"),
      completionDate: today.subtract(1, "year").add(2, "day").format("YYYY-MM-DD"),
      status: "COMPLETED",
    },
  ]);

  console.log("Seed complete!");
  console.log(`Login: admin@acme.com / admin123`);
  console.log(`Login: inspector@acme.com / user123`);
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
