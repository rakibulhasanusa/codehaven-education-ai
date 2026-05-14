import "dotenv/config";
import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });

  try {
    await sql.begin(async (tx) => {
      await tx`create table if not exists users (
        id integer generated always as identity primary key,
        name varchar(120) not null,
        phone varchar(20) not null,
        qualification varchar(150),
        password_hash text not null,
        role varchar(20) not null default 'user',
        created_by_user_id integer,
        is_active integer not null default 1,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`;

      await tx`create unique index if not exists users_phone_unique on users(phone)`;

      await tx`do $$
      begin
        if not exists (
          select 1
          from information_schema.columns
          where table_schema = 'public' and table_name = 'users' and column_name = 'created_by_user_id'
        ) then
          alter table users add column created_by_user_id integer;
        end if;
      end $$;`;

      await tx`do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'users_created_by_user_id_fkey'
        ) then
          alter table users
          add constraint users_created_by_user_id_fkey
          foreign key (created_by_user_id)
          references users(id)
          on delete set null;
        end if;
      end $$;`;

      await tx`create table if not exists auth_sessions (
        id varchar(80) primary key,
        user_id integer not null references users(id) on delete cascade,
        expires_at timestamptz not null,
        revoked_at timestamptz,
        created_at timestamptz not null default now()
      )`;
    });

    console.log("Auth schema patch applied successfully.");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error("Auth schema patch failed:", e.message);
  process.exit(1);
});
