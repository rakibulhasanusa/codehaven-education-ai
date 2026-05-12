import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { questions, subjects } from "@/lib/db/schema";
import { createSubjectSchema } from "@/lib/validation/mcq";
import { slugify } from "@/lib/helpers/slug";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const rows = await db()
    .select({
      id: subjects.id,
      name: subjects.name,
      slug: subjects.slug,
      createdAt: subjects.createdAt,
      questionCount: sql<number>`count(${questions.id})`,
    })
    .from(subjects)
    .leftJoin(questions, eq(questions.subjectId, subjects.id))
    .where(q ? ilike(subjects.name, `%${q}%`) : undefined)
    .groupBy(subjects.id)
    .orderBy(desc(subjects.createdAt));

  return NextResponse.json({ subjects: rows });
}

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = createSubjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const slug = slugify(name);

  const existing = await db().select().from(subjects).where(eq(subjects.slug, slug)).limit(1);
  if (existing[0]) {
    return NextResponse.json({ error: "Subject already exists." }, { status: 409 });
  }

  const [created] = await db().insert(subjects).values({ name, slug }).returning();
  return NextResponse.json({ subject: created }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid subject id." }, { status: 400 });
  }

  await db().delete(subjects).where(eq(subjects.id, id));
  return NextResponse.json({ ok: true });
}
