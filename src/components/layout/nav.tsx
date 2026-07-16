"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@lib/cn";
import { Button } from "@components/ui/button";

interface NavProps {
  fullName: string;
  roles: string[];
}

const BASE_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/questions", label: "Question Bank" },
  { href: "/exams", label: "Exams" },
];

export function Nav({ fullName, roles }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = roles.includes("ADMIN");

  const links = isAdmin ? [...BASE_LINKS, { href: "/admin", label: "Admin" }] : BASE_LINKS;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-bold text-brand-700">
            EduAi
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium",
                    active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-600 sm:inline">{fullName}</span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {roles.join(", ")}
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-1 sm:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
              pathname.startsWith(link.href) ? "bg-brand-50 text-brand-700" : "text-gray-600",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
