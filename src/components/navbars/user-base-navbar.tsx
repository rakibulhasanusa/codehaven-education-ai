"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/password", label: "Password" },
  { href: "/exam", label: "Exams" },
];

export default function UserBaseNavbar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header className="mb-6 border-b border-border/60 pb-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="premium-kicker mb-1">MCQ AI</p>
          <h1 className="premium-title text-2xl font-bold tracking-tight">User Base</h1>
          <p className="text-sm text-muted-foreground">{userName}</p>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <nav className="flex flex-wrap items-center gap-1">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/dashboard" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="w-full md:w-auto">
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
