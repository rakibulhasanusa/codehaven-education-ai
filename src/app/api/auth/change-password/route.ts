import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { changePasswordSchema } from "@/lib/validation/auth";
import { getAuthUser } from "@/lib/auth/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const [user] = await db().select().from(users).where(and(eq(users.id, auth.id), eq(users.isActive, 1))).limit(1);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!verifyPassword(parsed.data.oldPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Old password is incorrect" }, { status: 400 });
  }

  await db().update(users).set({ passwordHash: hashPassword(parsed.data.newPassword), updatedAt: new Date() }).where(eq(users.id, auth.id));
  return NextResponse.json({ ok: true });
}
