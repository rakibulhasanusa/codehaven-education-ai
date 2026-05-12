import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";

const SIMILARITY_KEY = "similarity_threshold";
const DEFAULT_SIMILARITY_THRESHOLD = 0.92;

export async function getSimilarityThreshold(): Promise<number> {
  const rows = await db()
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, SIMILARITY_KEY))
    .limit(1);

  const raw = rows[0]?.value;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) return DEFAULT_SIMILARITY_THRESHOLD;
  return value;
}

export async function setSimilarityThreshold(value: number): Promise<number> {
  const normalized = Math.min(1, Math.max(0, value));

  await db()
    .insert(systemSettings)
    .values({ key: SIMILARITY_KEY, value: String(normalized) })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: String(normalized), updatedAt: new Date() },
    });

  return normalized;
}
