import Link from "next/link";
import { cn } from "@lib/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}

function buildHref(basePath: string, page: number, searchParams?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function Pagination({ page, totalPages, basePath, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2 pt-4">
      <Link
        href={buildHref(basePath, Math.max(1, page - 1), searchParams)}
        aria-disabled={page <= 1}
        className={cn(
          "rounded-md border border-gray-300 px-3 py-1.5 text-sm",
          page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50",
        )}
      >
        Previous
      </Link>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(basePath, Math.min(totalPages, page + 1), searchParams)}
        aria-disabled={page >= totalPages}
        className={cn(
          "rounded-md border border-gray-300 px-3 py-1.5 text-sm",
          page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-gray-50",
        )}
      >
        Next
      </Link>
    </nav>
  );
}
