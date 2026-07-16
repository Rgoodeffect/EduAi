import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withRole } from "@infrastructure/http/api-guard";
import { normalizePageRequest } from "@domain/shared/pagination";
import { RoleName } from "@domain/user/value-objects/role-name";

export const GET = withRole([RoleName.ADMIN], async (request) => {
  const { searchParams } = new URL(request.url);
  const page = normalizePageRequest({
    page: Number(searchParams.get("page")) || undefined,
    pageSize: Number(searchParams.get("pageSize")) || undefined,
  });

  const result = await container.userRepository.list(page, {
    role: searchParams.get("role") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({
    items: result.items.map((u) => u.toPublicProfile()),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  });
});
