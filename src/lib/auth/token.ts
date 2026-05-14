const encoder = new TextEncoder();

function toBase64Url(input: Uint8Array): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): Uint8Array {
  const pad = input.length % 4 ? "=".repeat(4 - (input.length % 4)) : "";
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return new Uint8Array(Buffer.from(base64, "base64"));
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toBase64Url(new Uint8Array(sig));
}

export type SessionPayload = {
  uid: number;
  role: "admin" | "user";
  sid: string;
  exp: number;
};

export async function createSessionToken(payload: SessionPayload, secret: string): Promise<string> {
  const header = toBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${header}.${body}`;
  const sig = await sign(signingInput, secret);
  return `${signingInput}.${sig}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionPayload | null> {
  const [header, body, sig] = token.split(".");
  if (!header || !body || !sig) return null;
  const expected = await sign(`${header}.${body}`, secret);
  if (expected !== sig) return null;
  try {
    const parsedHeader = JSON.parse(Buffer.from(fromBase64Url(header)).toString("utf8")) as { alg?: string; typ?: string };
    if (parsedHeader.alg !== "HS256" || parsedHeader.typ !== "JWT") return null;
    const payload = JSON.parse(Buffer.from(fromBase64Url(body)).toString("utf8")) as SessionPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (!payload.uid || !payload.sid || (payload.role !== "admin" && payload.role !== "user")) return null;
    return payload;
  } catch {
    return null;
  }
}
