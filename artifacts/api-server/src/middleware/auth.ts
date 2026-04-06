import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required but was not provided.");
}

export interface AuthUser {
  id: number;
  email: string;
  role: "ADMIN" | "USER";
  organizationId: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET!, { expiresIn: "7d" });
}

export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!process.env.STRIPE_SECRET_KEY) return next();

  const orgId = req.user!.organizationId;

  try {
    const { db, organizationsTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId));

    if (!org?.stripeSubscriptionId) {
      const createdAt = new Date(org?.createdAt ?? 0);
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / 86_400_000;
      if (daysSinceCreation <= 14) return next();
      return res.status(402).json({
        error: "Active subscription required.",
        code: "SUBSCRIPTION_REQUIRED"
      });
    }

    const { stripeStorage } = await import("../stripeStorage.js");
    const sub = await stripeStorage.getSubscription(org.stripeSubscriptionId);
    if (sub && (sub.status === "active" || sub.status === "trialing")) {
      return next();
    }

    return res.status(402).json({
      error: "Your subscription is inactive. Please update your billing.",
      code: "SUBSCRIPTION_INACTIVE"
    });
  } catch {
    return next();
  }
}
