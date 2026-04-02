import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || "dev-secret-key";

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
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
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
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}
