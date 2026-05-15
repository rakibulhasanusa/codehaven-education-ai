"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import PublicNavbar from "@/components/navbars/public-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Phone, Lock, ArrowRight, Zap, AlertCircle } from "lucide-react";

const contactLink = process.env.NEXT_PUBLIC_CONTACT_URL || "/";
const EASE_OUT_CUBIC: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── animation ─────────────────────────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT_CUBIC } },
};

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get("next");

  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone, password }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; redirectTo?: string } | null;
      if (!res.ok) { setError(json?.error || "Login failed"); return; }
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      router.push(safeNext || json?.redirectTo || "/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PublicNavbar />

      {/* ── Page shell ──────────────────────────────────────────── */}
      <main className="relative flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-6 sm:py-10">

        {/* Ambient blobs */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-32 top-10 hidden h-[500px] w-[500px] rounded-full bg-primary/8 blur-[100px] md:block" />
          <div className="absolute -right-32 bottom-10 hidden h-[400px] w-[400px] rounded-full bg-accent/10 blur-[90px] md:block" />
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="w-full max-w-sm sm:max-w-md"
        >
          {/* ── Card ──────────────────────────────────────────────── */}
          <div className="premium-panel relative overflow-hidden rounded-3xl p-5 sm:p-7 md:p-8">

            {/* Corner accent */}
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-[3rem] bg-gradient-to-bl from-primary/10 via-accent/5 to-transparent" />

            {/* Header */}
            <motion.div variants={item} className="mb-7 space-y-1">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-primary/8 shadow-sm">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <p className="premium-kicker text-[11px]">Secure Access</p>
              <h1 className="premium-title text-2xl font-black tracking-tight">
                CodeHaven AI
              </h1>
              <p className="text-xs text-muted-foreground">
                Single login for administrators and learners.
              </p>
            </motion.div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Phone */}
              <motion.div variants={item} className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  Phone number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    className="pl-9 text-sm"
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={item} className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9 text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </motion.div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-2.5"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive">{error}</p>
                </motion.div>
              )}

              {/* Submit */}
              <motion.div variants={item}>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 w-full gap-2 rounded-xl font-semibold shadow-md shadow-primary/20"
                >
                  {loading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                      Logging in…
                    </>
                  ) : (
                    <>Login <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Contact footer */}
            <motion.div variants={item}>
              <Separator className="my-5" />
              <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  অ্যাকাউন্ট নেই? অ্যাকাউন্ট খুলতে বা বিস্তারিত জানতে যোগাযোগ করুন।
                </p>
                <Button asChild variant="link" className="mt-0.5 h-auto px-0 py-0 text-xs font-semibold">
                  <Link href={contactLink}>যোগাযোগ করুন →</Link>
                </Button>
              </div>
            </motion.div>

          </div>
        </motion.div>
      </main>
    </>
  );
}
