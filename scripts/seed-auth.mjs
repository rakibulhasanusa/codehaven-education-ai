import "dotenv/config";
import postgres from "postgres";
import { randomBytes, scryptSync } from "node:crypto";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function parseUsersFromEnv() {
  const raw = process.env.SEED_USERS_JSON;
  if (!raw) {
    return [
      { name: "Demo User 1", phone: "+8801700000001", qualification: "HSC", password: "UserPass123!", role: "user" },
      { name: "Demo User 2", phone: "+8801700000002", qualification: "Graduate", password: "UserPass123!", role: "user" },
    ];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("SEED_USERS_JSON must be an array");
  return parsed;
}

async function upsertUser(sql, user, createdByUserId = null) {
  const existing = await sql`select id from users where phone = ${user.phone} limit 1`;
  if (existing.length) {
    await sql`
      update users
      set
        name = ${user.name},
        qualification = ${user.qualification ?? null},
        role = ${user.role},
        is_active = 1,
        created_by_user_id = ${createdByUserId},
        updated_at = now()
      where id = ${existing[0].id}
    `;
    return existing[0].id;
  }

  const inserted = await sql`
    insert into users (name, phone, qualification, password_hash, role, created_by_user_id)
    values (${user.name}, ${user.phone}, ${user.qualification ?? null}, ${hashPassword(user.password)}, ${user.role}, ${createdByUserId})
    returning id
  `;
  return inserted[0].id;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const adminName = process.env.SEED_ADMIN_NAME || "System Admin";
  const adminPhone = process.env.SEED_ADMIN_PHONE || "+8801700000000";
  const adminQualification = process.env.SEED_ADMIN_QUALIFICATION || "Administrator";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "AdminPass123!";

  if (!adminPassword) {
    throw new Error("SEED_ADMIN_PASSWORD is required");
  }

  const sql = postgres(process.env.DATABASE_URL, { prepare: false });

  try {
    const usersTable = await sql`
      select to_regclass('public.users') as table_name
    `;
    if (!usersTable[0]?.table_name) {
      throw new Error("Table 'users' does not exist. Run: pnpm db:patch:auth (or pnpm db:push)");
    }

    const adminId = await upsertUser(sql, {
      name: adminName,
      phone: adminPhone,
      qualification: adminQualification,
      password: adminPassword,
      role: "admin",
    });

    const users = parseUsersFromEnv();
    for (const user of users) {
      if (!user.phone || !user.name || !user.password) continue;
      await upsertUser(sql, { ...user, role: "user" }, adminId);
    }

    console.log("Auth seed complete.");
    console.log(`Admin phone: ${adminPhone}`);
    console.log(`Created/updated ${users.length} managed users under admin #${adminId}.`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
