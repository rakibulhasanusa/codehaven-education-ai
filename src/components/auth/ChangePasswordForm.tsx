"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  KeyRound,
} from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

export default function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 6) {
      setStatus("error");
      setMsg("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMsg("New passwords do not match.");
      return;
    }

    setStatus("loading");

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const json = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMsg(json.error || "Something went wrong. Please try again.");
      return;
    }

    setStatus("success");
    setMsg("Password updated successfully.");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setTimeout(() => {
      setStatus("idle");
      setMsg(null);
    }, 4000);
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>

      {/* Section header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="premium-kicker mb-0.5">Account Security</p>
          <h3 className="mt-1 text-xl font-bold tracking-tight">
            Change Password
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Keep your account safe with a strong, unique password.
          </p>
        </div>

        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "oklch(0.927 0.035 175 / 0.3)",
            border: "1px solid oklch(0.67 0.13 165 / 0.25)",
          }}
        >
          <ShieldCheck
            className="h-5 w-5"
            style={{ color: "oklch(0.42 0.12 165)" }}
          />
        </div>
      </div>

      <Separator />

      {/* Fields grid */}
      <div className="grid gap-5 md:grid-cols-3">
        <PasswordField
          id="old-password"
          label="Current Password"
          placeholder="Enter current password"
          value={oldPassword}
          onChange={setOldPassword}
          autoComplete="current-password"
          icon={<Lock className="h-3.5 w-3.5" />}
        />
        <PasswordField
          id="new-password"
          label="New Password"
          placeholder="Min. 6 characters"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          icon={<KeyRound className="h-3.5 w-3.5" />}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm New Password"
          placeholder="Repeat new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          icon={<KeyRound className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Feedback alert */}
      {msg && (
        <Alert
          variant={status === "success" ? "default" : "destructive"}
          className="border py-3"
          style={
            status === "success"
              ? {
                  background: "oklch(0.927 0.035 175 / 0.15)",
                  borderColor: "oklch(0.67 0.13 165 / 0.3)",
                  color: "oklch(0.32 0.1 165)",
                }
              : undefined
          }
        >
          {status === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription className="font-medium">{msg}</AlertDescription>
        </Alert>
      )}

      {/* Submit row */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={status === "loading"}
          className="relative h-10 gap-2 overflow-hidden px-5 font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0 disabled:opacity-60"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.49 0.17 250) 0%, oklch(0.42 0.17 260) 100%)",
            boxShadow:
              "0 4px 14px -4px oklch(0.49 0.17 250 / 0.5), inset 0 1px 0 rgb(255 255 255 / 0.15)",
            border: "none",
          }}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Update Password
            </>
          )}

          {/* shimmer sweep */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgb(255 255 255 / 0.11) 50%, transparent 60%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2.6s linear infinite",
            }}
          />
        </Button>

        <p className="text-xs text-muted-foreground">
          Minimum 6 characters required
        </p>
      </div>
    </form>
  );
}

/* ── PasswordField ─────────────────────────────────────── */

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
  icon,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  icon?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground/80"
      >
        <span
          className="text-muted-foreground"
          style={{ color: "oklch(0.49 0.17 250 / 0.7)" }}
        >
          {icon}
        </span>
        {label}
      </Label>

      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="premium-input h-10 w-full pr-10 focus-visible:ring-primary/30"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}