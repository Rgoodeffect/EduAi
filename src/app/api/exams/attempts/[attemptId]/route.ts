import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";
import { errorResponse } from "@lib/http/api-error";
import { RoleName } from "@domain/user/value-objects/role-name";

interface RouteContext {
  params: Promise<{ attemptId: string }>;
}

export const GET = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { attemptId } = await ctx.params;
  const attempt = await container.examService.getAttempt(attemptId);
  if (!attempt) return errorResponse("EXAM_ATTEMPT_NOT_FOUND", "Exam attempt not found.", 404);

  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);
  if (!isPrivileged && attempt.userId !== session.sub) {
    return errorResponse("FORBIDDEN", "You do not have permission to view this exam attempt.", 403);
  }

  return NextResponse.json({ attempt });
});
