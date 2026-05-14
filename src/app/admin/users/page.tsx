import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";
import { users } from "@/lib/db/schema";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const guard = await requireAuth("admin");
  if (!guard.ok) return null;

  const page = 1;
  const pageSize = 10;
  const where = and(eq(users.createdByUserId, guard.user.id));

  const rows = await db()
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      qualification: users.qualification,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset(0);

  const [countRow] = await db().select({ total: sql<number>`count(*)::int` }).from(users).where(where);
  const total = countRow?.total ?? 0;

  return (
    <UsersClient
      initialUsers={rows.map((r) => ({ ...r, qualification: r.qualification ?? "", role: r.role as "admin" | "user" }))}
      initialPagination={{ page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }}
    />
  );
}
