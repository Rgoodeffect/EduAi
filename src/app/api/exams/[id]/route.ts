import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";
import { errorResponse, handleApiError } from "@lib/http/api-error";
import { RoleName } from "@domain/user/value-objects/role-name";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const exam = await container.examService.getExam(id);
  if (!exam) return errorResponse("EXAM_NOT_FOUND", "Exam not found.", 404);

  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);
  if (!isPrivileged && exam.status !== ExamStatus.PUBLISHED) {
    return errorResponse("EXAM_NOT_FOUND", "Exam not found.", 404);
  }

  return NextResponse.json({ exam: exam.toDTO() });
});

export const DELETE = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const result = await container.examService.deleteExam(id, session.sub, session.roles.includes(RoleName.ADMIN));
  if (!result.ok) return handleApiError(result.error);
  return NextResponse.json({ success: true });
});
