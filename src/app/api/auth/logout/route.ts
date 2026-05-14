import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authSessions } from "@/lib/db/schema";
import { getAuthUser, SESSION_COOKIE } from "@/lib/auth/server";

export async function POST() {
  const auth = await getAuthUser();
  if (auth) {
    await db().update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.id, auth.sessionId));
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return res;
}
