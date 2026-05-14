"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  FilePlus2,
  BookOpen,
  BarChart3,
  Trophy,
  Users,
} from "lucide-react";

const items = [
  { href: "/admin",                  label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin/quizzes",          label: "Quizzes",      icon: ClipboardList   },
  { href: "/admin/quizzes/create",   label: "Create Quiz",  icon: FilePlus2       },
  { href: "/admin/questions",        label: "Question Bank",icon: BookOpen        },
  { href: "/admin/results",          label: "Results",      icon: BarChart3       },
  { href: "/admin/leaderboard",      label: "Leaderboard",  icon: Trophy          },
  { href: "/admin/users",            label: "Users",        icon: Users           },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="premium-panel sticky top-6 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/50 px-4 py-4">
          <p className="premium-kicker text-[10px]">Control Room</p>
          <h2 className="mt-0.5 text-sm font-semibold text-foreground">
            Admin Panel
          </h2>
        </div>

        {/* Nav */}
        <nav className="p-2">
          {/* Mobile: horizontal scroll */}
          <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:pb-0">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    // base
                    "group relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-150",
                    // active
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {/* Active left-bar indicator (desktop only) */}
                  {active && (
                    <span className="absolute -left-2 hidden h-4 w-1 rounded-full bg-primary lg:block" />
                  )}

                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer hint */}
        <div className="border-t border-border/40 px-4 py-3">
          <p className="text-[11px] text-muted-foreground/60">
            {items.length} sections available
          </p>
        </div>
      </div>
    </aside>
  );
}