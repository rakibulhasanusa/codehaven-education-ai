import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

function createDb() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error("DATABASE_URL is not set");
    }
    return drizzle(neon(url), { schema });
}

let instance: ReturnType<typeof createDb> | undefined;

export function db() {
    if (!instance) {
        instance = createDb();
    }
    return instance;
}