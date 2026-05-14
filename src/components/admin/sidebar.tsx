"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/quizzes", label: "Quizzes" },
  { href: "/admin/quizzes/create", label: "Create Quiz" },
  { href: "/admin/questions", label: "Question Bank" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/leaderboard", label: "Leaderboard" },
  { href: "/admin/users", label: "Users" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="premium-panel sticky top-4 p-4">
        <p className="premium-kicker">Control Room</p>
        <h2 className="mt-1 text-lg font-semibold">Admin Panel</h2>
        <nav className="mt-4 flex gap-2 overflow-x-auto lg:block lg:space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                  active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
