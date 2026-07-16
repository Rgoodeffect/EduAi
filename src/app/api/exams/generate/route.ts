import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withRole } from "@infrastructure/http/api-guard";
import { handleApiError } from "@lib/http/api-error";
import { RoleName } from "@domain/user/value-objects/role-name";
import { autoGenerateExamSchema } from "@application/exam/dto";

/** Auto-assembles an exam by randomly sampling matching questions already in the Question Bank (synchronous — no LLM call). */
export const POST = withRole([RoleName.TEACHER, RoleName.ADMIN], async (request, session) => {
  const body = await request.json();
  const input = autoGenerateExamSchema.parse(body);

  const result = await container.examService.autoGenerateExam(input, session.sub);
  if (!result.ok) return handleApiError(result.error);

  return NextResponse.json({ exam: result.value.toDTO() }, { status: 201 });
});
