import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import type { Request, Response } from "express";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";

const SESSION_COOKIE = "rm_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (test.length !== expected.length) return false;
  return timingSafeEqual(test, expected);
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token));
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await deleteSession(token);
    return null;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));
  return user ?? null;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionToken(req: Request): string | undefined {
  return req.cookies?.[SESSION_COOKIE];
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
}

export function requireAuth(): (
  req: Request,
  res: Response,
  next: () => void,
) => Promise<void> {
  return async (req, res, next) => {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    (req as Request & { user: User }).user = user;
    next();
  };
}
