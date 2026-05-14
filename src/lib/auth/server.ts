import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authSessions, users } from "@/lib/db/schema";
import { verifySessionToken } from "@/lib/auth/token";

export const SESSION_COOKIE = "mcq_auth";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

export async function getAuthUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const payload = await verifySessionToken(raw, getSecret());
  if (!payload) return null;

  const [session] = await db()
    .select({
      id: authSessions.id,
      userId: authSessions.userId,
      expiresAt: authSessions.expiresAt,
      revokedAt: authSessions.revokedAt,
      role: users.role,
      name: users.name,
      phone: users.phone,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.id, payload.sid), eq(authSessions.userId, payload.uid)))
    .limit(1);

  if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) return null;

  return {
    id: session.userId,
    sessionId: session.id,
    role: session.role as "admin" | "user",
    name: session.name,
    phone: session.phone,
  };
}

export async function requireAuth(role?: "admin" | "user") {
  const user = await getAuthUser();
  if (!user) return { ok: false as const, status: 401, message: "Unauthorized" };
  if (role && user.role !== role) return { ok: false as const, status: 403, message: "Forbidden" };
  return { ok: true as const, user };
}
