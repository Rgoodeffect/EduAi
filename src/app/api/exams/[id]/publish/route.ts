import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withRole } from "@infrastructure/http/api-guard";
import { handleApiError } from "@lib/http/api-error";
import { RoleName } from "@domain/user/value-objects/role-name";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withRole<RouteContext>([RoleName.TEACHER, RoleName.ADMIN], async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const result = await container.examService.publishExam(id, session.sub, session.roles.includes(RoleName.ADMIN));
  if (!result.ok) return handleApiError(result.error);
  return NextResponse.json({ success: true });
});
