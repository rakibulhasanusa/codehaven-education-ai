import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

type Database = ReturnType<typeof drizzle>;

let database: Database | null = null;

export function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (!database) {
    // Disable prepare as it is not supported for Transaction pool mode.
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    database = drizzle(client);
  }

  return database;
}
