import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";
import { errorResponse } from "@lib/http/api-error";
import { RoleName } from "@domain/user/value-objects/role-name";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const question = await container.questionService.getQuestion(id);
  if (!question) return errorResponse("QUESTION_NOT_FOUND", "Question not found.", 404);

  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);
  return NextResponse.json({ question: question.toDTO(isPrivileged) });
});

export const DELETE = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const question = await container.questionService.getQuestion(id);
  if (!question) return errorResponse("QUESTION_NOT_FOUND", "Question not found.", 404);

  const isPrivileged = session.roles.includes(RoleName.ADMIN);
  if (!isPrivileged && question.createdById !== session.sub) {
    return errorResponse("FORBIDDEN", "You do not have permission to delete this question.", 403);
  }

  await container.questionService.deleteQuestion(id);
  return NextResponse.json({ success: true });
});
