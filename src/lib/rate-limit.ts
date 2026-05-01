import crypto from "crypto";
import { and, asc, count, gte, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { mcqGenerationRequests } from "@/lib/db/schema";

export const DAILY_REQUEST_LIMIT = 5;
export const CLIENT_KEY_COOKIE = "mcq_client_key";
const WINDOW_MS = 24 * 60 * 60 * 1000;
const COOKIE_SECRET_ENV = "RATE_LIMIT_COOKIE_SECRET";
const TOKEN_VERSION = "v1";

type DbClient = ReturnType<typeof db>;

export type RateLimitStatus = {
  used: number;
  remaining: number;
  limit: number;
  blocked: boolean;
  resetAt: string;
  resetInHours: number;
};

export type ClientIdentity = {
  tokenId: string;
  deviceHash: string;
};

type SignedTokenPayload = {
  v: string;
  tid: string;
};

function getCookieSecret(): string {
  return process.env[COOKIE_SECRET_ENV] || process.env.AUTH_SECRET || "dev-rate-limit-secret";
}

function safeB64Encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function safeB64Decode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function signValue(value: string): string {
  return crypto.createHmac("sha256", getCookieSecret()).update(value).digest("base64url");
}

export function issueSignedClientToken(tokenId: string): string {
  const payload: SignedTokenPayload = { v: TOKEN_VERSION, tid: tokenId };
  const encodedPayload = safeB64Encode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function readSignedClientToken(token: string | undefined): string | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expectedSignature = signValue(encodedPayload);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  const decoded = safeB64Decode(encodedPayload);
  if (!decoded) return null;

  try {
    const payload = JSON.parse(decoded) as SignedTokenPayload;
    if (payload.v !== TOKEN_VERSION || !payload.tid) return null;
    return payload.tid;
  } catch {
    return null;
  }
}

export function buildClientIdentity(deviceId: string, tokenId: string): ClientIdentity {
  return {
    tokenId,
    deviceHash: hashValue(deviceId || "unknown-device"),
  };
}

export function buildIdentityKey(identity: ClientIdentity): string {
  return `cid:${identity.tokenId}|dv:${identity.deviceHash}`;
}

export async function getRateLimitStatus(client: DbClient, identity: ClientIdentity): Promise<RateLimitStatus> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  const devicePattern = `%|dv:${identity.deviceHash}`;

  const [usage] = await client
    .select({ total: count() })
    .from(mcqGenerationRequests)
    .where(
      and(
        like(mcqGenerationRequests.clientKey, devicePattern),
        gte(mcqGenerationRequests.requestedAt, windowStart)
      )
    );

  const [oldest] = await client
    .select({ requestedAt: mcqGenerationRequests.requestedAt })
    .from(mcqGenerationRequests)
    .where(
      and(
        like(mcqGenerationRequests.clientKey, devicePattern),
        gte(mcqGenerationRequests.requestedAt, windowStart),
      )
    )
    .orderBy(asc(mcqGenerationRequests.requestedAt))
    .limit(1);

  const used = Number(usage?.total ?? 0);
  const remaining = Math.max(0, DAILY_REQUEST_LIMIT - used);
  const blocked = used >= DAILY_REQUEST_LIMIT;
  const resetDate = blocked && oldest?.requestedAt
    ? new Date(oldest.requestedAt.getTime() + WINDOW_MS)
    : now;
  const resetInHours = Math.max(0, Number(((resetDate.getTime() - now.getTime()) / (60 * 60 * 1000)).toFixed(2)));

  return {
    used,
    remaining,
    limit: DAILY_REQUEST_LIMIT,
    blocked,
    resetAt: resetDate.toISOString(),
    resetInHours,
  };
}
