"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/auth/LogoutButton";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/exam", label: "Exams" },
  { href: "/smart-exam", label: "Smart Exam" },
];

type MeResponse = {
  user: {
    id: number;
    name: string;
    phone: string;
    role: "admin" | "user";
  } | null;
};

export default function PublicNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<MeResponse["user"] | undefined>(undefined);
  console.log(me,"user login")

  useEffect(() => {
    let dead = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: MeResponse) => {
        if (dead) return;
        setMe(json?.user ?? null);
      })
      .catch(() => {
        if (dead) return;
        setMe(null);
      });
    return () => {
      dead = true;
    };
  }, []);

  const links = [...publicLinks, ...(me ? [] : [{ href: "/login", label: "Login" }])];
  const homeHref = me ? (me.role === "admin" ? "/admin" : "/dashboard") : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-col justify-center px-4 py-2 sm:min-h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-0">
        <div className="flex items-center justify-between">
          <Link href={homeHref} className="premium-title whitespace-nowrap text-lg font-black tracking-tight sm:text-xl">
            CodeHaven AI
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/70 sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium leading-none transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-accent hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {me ? (
            <div className="ml-2 flex items-center gap-2">
              <Link
                href={me.role === "admin" ? "/admin" : "/dashboard"}
                className="rounded-md px-3 py-1.5 text-sm font-medium leading-none text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                {me.role === "admin" ? "Admin" : "Dashboard"}
              </Link>
              <LogoutButton />
            </div>
          ) : null}
        </nav>

        {open && (
          <nav className="mt-2 grid gap-1 border-t border-border/60 pt-2 sm:hidden">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/80 hover:bg-accent hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            {me ? (
              <>
                <Link
                  href={me.role === "admin" ? "/admin" : "/dashboard"}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  {me.role === "admin" ? "Admin" : "Dashboard"}
                </Link>
                <div onClick={() => setOpen(false)}>
                  <LogoutButton />
                </div>
              </>
            ) : null}
          </nav>
        )}
      </div>
    </header>
  );
}
