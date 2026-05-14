import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { createUserSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { requireAuth } from "@/lib/auth/server";
import { users } from "@/lib/db/schema";

export async function GET(req: Request) {
  const guard = await requireAuth("admin");
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.max(1, Math.min(50, Number(searchParams.get("pageSize") || 10)));
  const offset = (page - 1) * pageSize;

  const where = and(
    eq(users.createdByUserId, guard.user.id),
    q
      ? or(ilike(users.name, `%${q}%`), ilike(users.phone, `%${q}%`), ilike(users.qualification, `%${q}%`))
      : undefined
  );

  const rows = await db()
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      qualification: users.qualification,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [countRow] = await db()
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(where);

  return NextResponse.json({
    users: rows,
    pagination: {
      page,
      pageSize,
      total: countRow?.total ?? 0,
      totalPages: Math.max(1, Math.ceil((countRow?.total ?? 0) / pageSize)),
    },
  });
}

export async function POST(req: Request) {
  const guard = await requireAuth("admin");
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const [existing] = await db().select({ id: users.id }).from(users).where(eq(users.phone, parsed.data.phone)).limit(1);
  if (existing) return NextResponse.json({ error: "Phone number already exists" }, { status: 409 });

  const [created] = await db()
    .insert(users)
    .values({
      name: parsed.data.name,
      phone: parsed.data.phone,
      qualification: parsed.data.qualification,
      passwordHash: hashPassword(parsed.data.password),
      role: parsed.data.role,
      createdByUserId: guard.user.id,
    })
    .returning({ id: users.id });

  return NextResponse.json({ ok: true, userId: created.id });
}
