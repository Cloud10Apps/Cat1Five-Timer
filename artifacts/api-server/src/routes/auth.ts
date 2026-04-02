import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, generateToken, AuthUser } from "../middleware/auth.js";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { email, password } = parsed.data;

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const user = users[0];

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const tokenPayload: AuthUser = {
    id: user.id,
    email: user.email,
    role: user.role as "ADMIN" | "USER",
    organizationId: user.organizationId,
  };

  const token = generateToken(tokenPayload);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      organizationId: user.organizationId,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = req.user!;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  if (!users[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const u = users[0];
  res.json({
    id: u.id,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    organizationId: u.organizationId,
    createdAt: u.createdAt.toISOString(),
  });
});

export default router;
