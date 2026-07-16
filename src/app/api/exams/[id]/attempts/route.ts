import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";
import { errorResponse, handleApiError } from "@lib/http/api-error";
import { RoleName } from "@domain/user/value-objects/role-name";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Starts an attempt for the current user and returns the exam's questions with answer keys stripped. */
export const POST = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const result = await container.examService.startAttempt(id, session.sub);
  if (!result.ok) return handleApiError(result.error);
  return NextResponse.json(result.value, { status: 201 });
});

/** Grading view: lists every attempt for this exam. Restricted to the exam's creator or an admin. */
export const GET = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const exam = await container.examService.getExam(id);
  if (!exam) return errorResponse("EXAM_NOT_FOUND", "Exam not found.", 404);

  const isPrivileged = session.roles.includes(RoleName.ADMIN);
  if (!isPrivileged && exam.createdById !== session.sub) {
    return errorResponse("FORBIDDEN", "You do not have permission to view attempts for this exam.", 403);
  }

  const attempts = await container.examService.listAttemptsByExam(id);
  return NextResponse.json({ attempts });
});
