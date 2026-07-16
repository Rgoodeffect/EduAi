import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth, withRole } from "@infrastructure/http/api-guard";
import { normalizePageRequest } from "@domain/shared/pagination";
import { RoleName } from "@domain/user/value-objects/role-name";
import { createManualQuestionSchema } from "@application/question/dto";
import { QuestionType, QuestionDifficulty } from "@domain/question/value-objects/question-type";

export const POST = withRole([RoleName.TEACHER, RoleName.ADMIN], async (request, session) => {
  const body = await request.json();
  const input = createManualQuestionSchema.parse(body);
  const question = await container.questionService.createManualQuestion(input, session.sub);
  return NextResponse.json({ question: question.toDTO(true) }, { status: 201 });
});

export const GET = withAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const page = normalizePageRequest({
    page: Number(searchParams.get("page")) || undefined,
    pageSize: Number(searchParams.get("pageSize")) || undefined,
  });

  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);
  const tagsParam = searchParams.get("tags");

  const result = await container.questionService.listQuestions(page, {
    documentId: searchParams.get("documentId") ?? undefined,
    type: (searchParams.get("type") as QuestionType | null) ?? undefined,
    difficulty: (searchParams.get("difficulty") as QuestionDifficulty | null) ?? undefined,
    tags: tagsParam ? tagsParam.split(",").map((t) => t.trim()) : undefined,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({
    items: result.items.map((q) => q.toDTO(isPrivileged)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  });
});
