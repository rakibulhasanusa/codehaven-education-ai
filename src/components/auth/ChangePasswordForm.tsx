"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || "Failed");
      return;
    }
    setOldPassword("");
    setNewPassword("");
    setMsg("Password updated.");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="premium-kicker">Account Security</p>
        <h3 className="mt-1 text-xl font-semibold">Change Password</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-medium">
          <span>Old password</span>
          <input className="premium-input w-full" placeholder="Current password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          <span>New password</span>
          <input className="premium-input w-full" placeholder="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </label>
      </div>
      {msg ? <p className="rounded-md border bg-background/70 px-3 py-2 text-sm text-muted-foreground">{msg}</p> : null}
      <Button>Update Password</Button>
    </form>
  );
}
