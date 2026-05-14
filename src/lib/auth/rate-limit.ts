type Entry = { count: number; resetAt: number; blockedUntil: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;
const BLOCK_MS = 15 * 60 * 1000;

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) return { allowed: true };

  if (entry.blockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  if (entry.resetAt < now) {
    store.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function registerLoginFailure(key: string) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS, blockedUntil: 0 });
    return;
  }

  current.count += 1;
  if (current.count >= MAX_ATTEMPTS) {
    current.blockedUntil = now + BLOCK_MS;
  }
  store.set(key, current);
}

export function clearLoginFailures(key: string) {
  store.delete(key);
}
