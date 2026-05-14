"use client";

import { useState } from "react";

type UserRow = { id: number; name: string; phone: string; qualification: string; role: "admin" | "user"; isActive: number };

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export default function UsersClient({ initialUsers, initialPagination }: { initialUsers: UserRow[]; initialPagination: Pagination }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", qualification: "", password: "", role: "user" as "admin" | "user" });
  const [resetPassword, setResetPassword] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  async function loadUsers(page = pagination.page, q = query) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pagination.pageSize), q });
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
      setMsg(json.error || "Failed");
      return;
    }
    setForm({ name: "", phone: "", qualification: "", password: "", role: "user" });
    setMsg("User created.");
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
    setMsg(res.ok ? "Password reset successful." : (json.error || "Reset failed"));
  }

  return (
    <div className="space-y-6">
      <div className="premium-panel rounded-2xl p-6">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Users listed here are under this logged-in admin.</p>
        <form onSubmit={createUser} className="mt-4 grid md:grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="border rounded-lg px-3 py-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <input className="border rounded-lg px-3 py-2" placeholder="Qualification" value={form.qualification} onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value }))} />
          <input className="border rounded-lg px-3 py-2" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          <select className="border rounded-lg px-3 py-2" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "admin" | "user" }))}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button className="rounded-lg px-3 py-2 bg-primary text-primary-foreground">Create User</button>
        </form>
        {msg ? <p className="text-sm mt-3 text-muted-foreground">{msg}</p> : null}
      </div>

      <div className="premium-panel rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-xl font-semibold">All Users Under This Admin</h2>
          <div className="flex gap-2">
            <input className="border rounded-lg px-3 py-2" placeholder="Search by name / phone / qualification" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="border rounded-lg px-3 py-2" onClick={() => void loadUsers(1, query)}>Search</button>
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Phone</th>
                <th className="py-2">Qualification</th>
                <th className="py-2">Role</th>
                <th className="py-2">Reset Password</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2">{u.name}</td>
                  <td className="py-2">{u.phone}</td>
                  <td className="py-2">{u.qualification}</td>
                  <td className="py-2">{u.role}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <input className="border rounded px-2 py-1" type="password" placeholder="New password" value={resetPassword[u.id] || ""} onChange={(e) => setResetPassword((p) => ({ ...p, [u.id]: e.target.value }))} />
                      <button className="border rounded px-2 py-1" onClick={() => void handleReset(u.id)}>Reset</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && !loading ? (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No users found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p>Total: {pagination.total}</p>
          <div className="flex items-center gap-2">
            <button
              className="border rounded px-3 py-1 disabled:opacity-50"
              disabled={pagination.page <= 1 || loading}
              onClick={() => void loadUsers(pagination.page - 1, query)}
            >
              Prev
            </button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button
              className="border rounded px-3 py-1 disabled:opacity-50"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => void loadUsers(pagination.page + 1, query)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
