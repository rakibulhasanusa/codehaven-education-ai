import crypto from "crypto";
import { and, asc, count, gte, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { mcqGenerationRequests } from "@/lib/db/schema";

export const DAILY_REQUEST_LIMIT = 5;
export const CLIENT_KEY_COOKIE = "mcq_client_key";
const WINDOW_MS = 24 * 60 * 60 * 1000;
const COOKIE_SECRET_ENV = "RATE_LIMIT_COOKIE_SECRET";
const TOKEN_VERSION = "v1";
const IP_LIMIT = 20;
const FINGERPRINT_LIMIT = 8;

type DbClient = ReturnType<typeof db>;

export type RateLimitStatus = {
  keyUsed: number;
  keyRemaining: number;
  ipUsed: number;
  ipRemaining: number;
  fingerprintUsed: number;
  fingerprintRemaining: number;
  resetAbuseDetected: boolean;
  used: number;
  remaining: number;
  limit: number;
  blocked: boolean;
  resetAt: string;
  resetInHours: number;
};

export type ClientIdentity = {
  tokenId: string;
  ipHash: string;
  userAgentHash: string;
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
  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

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

export function buildClientIdentity(ip: string, userAgent: string, tokenId: string): ClientIdentity {
  return {
    tokenId,
    ipHash: hashValue(ip || "unknown-ip"),
    userAgentHash: hashValue(userAgent || "unknown-ua"),
  };
}

export function buildIdentityKey(identity: ClientIdentity): string {
  return `cid:${identity.tokenId}|ip:${identity.ipHash}|ua:${identity.userAgentHash}`;
}

export async function getRateLimitStatus(client: DbClient, identity: ClientIdentity): Promise<RateLimitStatus> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  // const identityKey = buildIdentityKey(identity);
  const cidPattern = `cid:${identity.tokenId}|%`;
  const ipPattern = `%|ip:${identity.ipHash}|%`;
  const uaPattern = `%|ua:${identity.userAgentHash}`;

  const [keyUsage] = await client
    .select({ total: count() })
    .from(mcqGenerationRequests)
    .where(
      and(
        like(mcqGenerationRequests.clientKey, cidPattern),
        gte(mcqGenerationRequests.requestedAt, windowStart)
      )
    );

  const [ipUsage] = await client
    .select({ total: count() })
    .from(mcqGenerationRequests)
    .where(
      and(
        like(mcqGenerationRequests.clientKey, ipPattern),
        gte(mcqGenerationRequests.requestedAt, windowStart)
      )
    );

  const [fingerprintUsage] = await client
    .select({ total: count() })
    .from(mcqGenerationRequests)
    .where(
      and(
        like(mcqGenerationRequests.clientKey, ipPattern),
        like(mcqGenerationRequests.clientKey, uaPattern),
        gte(mcqGenerationRequests.requestedAt, windowStart)
      )
    );

  const [oldest] = await client
    .select({ requestedAt: mcqGenerationRequests.requestedAt })
    .from(mcqGenerationRequests)
    .where(
      and(
        or(
          like(mcqGenerationRequests.clientKey, cidPattern),
          like(mcqGenerationRequests.clientKey, ipPattern),
          and(
            like(mcqGenerationRequests.clientKey, ipPattern),
            like(mcqGenerationRequests.clientKey, uaPattern)
          )
        ),
        gte(mcqGenerationRequests.requestedAt, windowStart),
      )
    )
    .orderBy(asc(mcqGenerationRequests.requestedAt))
    .limit(1);

  const keyUsed = Number(keyUsage?.total ?? 0);
  const ipUsed = Number(ipUsage?.total ?? 0);
  const fingerprintUsed = Number(fingerprintUsage?.total ?? 0);

  const keyRemaining = Math.max(0, DAILY_REQUEST_LIMIT - keyUsed);
  const ipRemaining = Math.max(0, IP_LIMIT - ipUsed);
  const fingerprintRemaining = Math.max(0, FINGERPRINT_LIMIT - fingerprintUsed);

  const resetAbuseDetected = keyUsed === 0 && (ipUsed > 0 || fingerprintUsed > 0);
  const blocked =
    keyUsed >= DAILY_REQUEST_LIMIT ||
    ipUsed >= IP_LIMIT ||
    fingerprintUsed >= FINGERPRINT_LIMIT ||
    resetAbuseDetected;

  const used = Math.max(keyUsed, ipUsed, fingerprintUsed);
  const remaining = Math.min(keyRemaining, ipRemaining, fingerprintRemaining);
  const limit = Math.min(DAILY_REQUEST_LIMIT, IP_LIMIT, FINGERPRINT_LIMIT);
  const resetDate = blocked && oldest?.requestedAt
    ? new Date(oldest.requestedAt.getTime() + WINDOW_MS)
    : now;
  const resetInHours = Math.max(0, Number(((resetDate.getTime() - now.getTime()) / (60 * 60 * 1000)).toFixed(2)));

  return {
    keyUsed,
    keyRemaining,
    ipUsed,
    ipRemaining,
    fingerprintUsed,
    fingerprintRemaining,
    resetAbuseDetected,
    used,
    remaining,
    limit,
    blocked,
    resetAt: resetDate.toISOString(),
    resetInHours,
  };
}
