import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  getSessionToken,
  getUserFromRequest,
  setSessionCookie,
  verifyPassword,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const token = await createSession(user.id);
  setSessionCookie(res, token);
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = getSessionToken(req);
  if (token) await deleteSession(token);
  clearSessionCookie(res);
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  });
});

export default router;
