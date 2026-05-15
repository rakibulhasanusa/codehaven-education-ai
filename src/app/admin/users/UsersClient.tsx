"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Search, Users, KeyRound, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

// ── types ─────────────────────────────────────────────────────────────────────
type UserRow = {
  id: number;
  name: string;
  phone: string;
  qualification: string;
  role: "admin" | "user";
  isActive: number;
};
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

// ── component ─────────────────────────────────────────────────────────────────
export default function UsersClient({
  initialUsers,
  initialPagination,
}: {
  initialUsers: UserRow[];
  initialPagination: Pagination;
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    qualification: "",
    password: "",
    role: "user" as "admin" | "user",
  });
  const [resetPassword, setResetPassword] = useState<Record<number, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ── data helpers ─────────────────────────────────────────────────────────────
  async function loadUsers(page = pagination.page, q = query) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize),
        q,
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setUsers((json.users || []).map((u: UserRow) => ({ ...u, qualification: u.qualification || "" })));
        setPagination(json.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 });
      }
    } finally {
      setLoading(false);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg({ text: json.error || "Failed to create user.", ok: false });
      return;
    }
    setForm({ name: "", phone: "", qualification: "", password: "", role: "user" });
    setMsg({ text: "User created successfully.", ok: true });
    await loadUsers(1, query);
  }

  async function handleReset(userId: number) {
    const newPassword = resetPassword[userId];
    if (!newPassword) return;
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const json = await res.json();
    setMsg({
      text: res.ok ? "Password reset successfully." : (json.error || "Reset failed."),
      ok: res.ok,
    });
    if (res.ok) setResetPassword((p) => ({ ...p, [userId]: "" }));
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/users?id=${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ text: json.error || "Delete failed.", ok: false });
        return;
      }
      setMsg({ text: "User deleted successfully.", ok: true });
      setDeleteTarget(null);
      await loadUsers(pagination.page, query);
    } finally {
      setDeleteBusy(false);
    }
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Create user ───────────────────────────────────────────── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-primary/8 shadow-sm">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Create User</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                New users will be linked to your admin account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-5">
          <form onSubmit={createUser} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <Input
                placeholder="01XXXXXXXXX"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Qualification</Label>
              <Input
                placeholder="e.g. SSC, HSC, Graduate"
                value={form.qualification}
                onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((p) => ({ ...p, role: v as "admin" | "user" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button type="submit" className="w-full gap-2">
                <UserPlus className="h-4 w-4" />
                Create User
              </Button>
            </div>
          </form>

          {msg && (
            <p className={`mt-3 text-xs font-medium ${msg.ok ? "text-emerald-600" : "text-destructive"}`}>
              {msg.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── User list ─────────────────────────────────────────────── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-primary/8 shadow-sm">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">All Users</CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Users linked to your admin account.
                </CardDescription>
              </div>
            </div>

            {/* Search */}
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-full pl-8 text-sm sm:w-56"
                  placeholder="Name, phone, qualification…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void loadUsers(1, query)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => void loadUsers(1, query)}
                disabled={loading}
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        {/* Table */}
        <ScrollArea className="max-h-[60vh]">
          <div className="min-w-[760px]">
            <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
              <tr>
                {["Name", "Phone", "Qualification", "Role", "Reset Password", "Delete"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="group align-middle transition-colors hover:bg-muted/30">
                    {/* Name */}
                    <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>

                    {/* Phone */}
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{u.phone}</td>

                    {/* Qualification */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.qualification || <span className="text-muted-foreground/40">—</span>}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <Badge
                        variant={u.role === "admin" ? "default" : "secondary"}
                        className="capitalize text-[11px]"
                      >
                        {u.role}
                      </Badge>
                    </td>

                    {/* Reset password */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <KeyRound className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="password"
                            className="h-8 pl-7 text-xs w-36"
                            placeholder="New password"
                            value={resetPassword[u.id] || ""}
                            onChange={(e) =>
                              setResetPassword((p) => ({ ...p, [u.id]: e.target.value }))
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => void handleReset(u.id)}
                          disabled={!resetPassword[u.id]}
                        >
                          Reset
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(u)}
                        aria-label={`Delete ${u.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </ScrollArea>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{pagination.total}</span>{" "}
            total users
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={pagination.page <= 1 || loading}
              onClick={() => void loadUsers(pagination.page - 1, query)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => void loadUsers(pagination.page + 1, query)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deleteTarget?.name ?? "this user"}&quot;. If this user is an admin, all users created under that admin will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteUser()} disabled={deleteBusy}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
