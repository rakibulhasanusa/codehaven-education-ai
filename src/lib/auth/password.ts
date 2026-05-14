import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hashHex] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hashHex) return false;
  const calculated = scryptSync(password, salt, KEYLEN);
  const storedBuf = Buffer.from(hashHex, "hex");
  if (storedBuf.length !== calculated.length) return false;
  return timingSafeEqual(storedBuf, calculated);
}
