import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";
import { handleApiError } from "@lib/http/api-error";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Re-fetches a published exam's questions with answer keys stripped — used to resume the taking UI without minting a duplicate attempt. */
export const GET = withAuth<RouteContext>(async (_request, _session, ctx) => {
  const { id } = await ctx.params;
  const result = await container.examService.getPublishedExamQuestions(id);
  if (!result.ok) return handleApiError(result.error);

  return NextResponse.json({
    exam: result.value.exam.toDTO(),
    questions: result.value.questions.map((q) => q.toDTO(false)),
  });
});
