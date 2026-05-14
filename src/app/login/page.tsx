"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Login failed");
        return;
      }
      router.push(next || json.redirectTo || "/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <form onSubmit={onSubmit} className="premium-panel w-full max-w-md space-y-5 p-6 md:p-7">
        <div className="space-y-2">
          <p className="premium-kicker">Secure Access</p>
          <h1 className="premium-title text-3xl font-bold tracking-tight">MCQ Smart Exam</h1>
          <p className="text-sm text-muted-foreground">Single login for administrators and learners.</p>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Phone number</span>
            <input className="premium-input w-full" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Password</span>
            <input className="premium-input w-full" placeholder="Enter password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        </div>

        {error ? <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <Button disabled={loading} className="h-11 w-full">{loading ? "Logging in..." : "Login"}</Button>
      </form>
    </main>
  );
}
