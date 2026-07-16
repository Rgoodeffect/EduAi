import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";
import { handleApiError } from "@lib/http/api-error";
import { submitExamAttemptSchema } from "@application/exam/dto";

interface RouteContext {
  params: Promise<{ attemptId: string }>;
}

export const POST = withAuth<RouteContext>(async (request, session, ctx) => {
  const { attemptId } = await ctx.params;
  const body = await request.json();
  const input = submitExamAttemptSchema.parse(body);

  const result = await container.examService.submitAttempt(attemptId, session.sub, input);
  if (!result.ok) return handleApiError(result.error);

  return NextResponse.json({ attempt: result.value });
});
