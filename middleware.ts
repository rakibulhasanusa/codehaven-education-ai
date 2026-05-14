import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function verifyToken(token: string, secret: string): Promise<{ role: "admin" | "user" } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expectedBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`));
  const expected = base64UrlFromBytes(new Uint8Array(expectedBuf));
  if (expected !== sig) return null;

  try {
    const head = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(header))) as { alg?: string; typ?: string };
    if (head.alg !== "HS256" || head.typ !== "JWT") return null;
    const json = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(body))) as { role: "admin" | "user"; exp: number };
    if (!json.exp || Date.now() > json.exp) return null;
    if (json.role !== "admin" && json.role !== "user") return null;
    return { role: json.role };
  } catch {
    return null;
  }
}

function base64UrlFromBytes(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesFromBase64Url(value: string) {
  const pad = value.length % 4 ? "=".repeat(4 - (value.length % 4)) : "";
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isApi(pathname: string) {
  return pathname.startsWith("/api/");
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname === "/login" || pathname.startsWith("/api/auth/login")) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET || "default_secret_key_change_me";
  if (!secret) return NextResponse.next();

  const token = req.cookies.get("mcq_auth")?.value;
  const session = token ? await verifyToken(token, secret) : null;

  const needsAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const needsUser = pathname.startsWith("/dashboard") || pathname.startsWith("/exam") || pathname.startsWith("/api/exam") || pathname.startsWith("/api/auth/change-password") || pathname.startsWith("/api/auth/logout");

  if (!needsAdmin && !needsUser) return NextResponse.next();

  if (!session) {
    if (isApi(pathname)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (needsAdmin && session.role !== "admin") {
    if (isApi(pathname)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/exam/:path*", "/api/admin/:path*", "/api/exam/:path*", "/api/attempts/:path*", "/api/auth/change-password", "/api/auth/logout"],
};
