import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { authSessions, users } from "@/lib/db/schema";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth("admin");
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  await db().update(users).set({ passwordHash: hashPassword(parsed.data.newPassword), updatedAt: new Date() }).where(eq(users.id, userId));
  await db().update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.userId, userId));

  return NextResponse.json({ ok: true });
}
