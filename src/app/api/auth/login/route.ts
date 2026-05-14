import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authSessions, users } from "@/lib/db/schema";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import { checkLoginRateLimit, clearLoginFailures, registerLoginFailure } from "@/lib/auth/rate-limit";
import { createSessionToken } from "@/lib/auth/token";
import { SESSION_COOKIE } from "@/lib/auth/server";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${ip}:${parsed.data.phone}`;
  const limit = checkLoginRateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json({ error: `Too many attempts. Try again in ${limit.retryAfterSec}s.` }, { status: 429 });
  }

  const [user] = await db()
    .select()
    .from(users)
    .where(and(eq(users.phone, parsed.data.phone), eq(users.isActive, 1)))
    .limit(1);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    registerLoginFailure(key);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  clearLoginFailures(key);

  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db().insert(authSessions).values({ id: sessionId, userId: user.id, expiresAt });

  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "AUTH_SECRET missing" }, { status: 500 });

  const token = await createSessionToken({
    uid: user.id,
    role: user.role as "admin" | "user",
    sid: sessionId,
    exp: Date.now() + SESSION_TTL_MS,
  }, secret);

  const res = NextResponse.json({ ok: true, role: user.role, redirectTo: user.role === "admin" ? "/admin" : "/dashboard" });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return res;
}
