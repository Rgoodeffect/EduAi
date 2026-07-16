import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth, withRole } from "@infrastructure/http/api-guard";
import { normalizePageRequest } from "@domain/shared/pagination";
import { RoleName } from "@domain/user/value-objects/role-name";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";
import { createExamSchema } from "@application/exam/dto";

export const POST = withRole([RoleName.TEACHER, RoleName.ADMIN], async (request, session) => {
  const body = await request.json();
  const input = createExamSchema.parse(body);
  const exam = await container.examService.createExam(input, session.sub);
  return NextResponse.json({ exam: exam.toDTO() }, { status: 201 });
});

export const GET = withAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const page = normalizePageRequest({
    page: Number(searchParams.get("page")) || undefined,
    pageSize: Number(searchParams.get("pageSize")) || undefined,
  });

  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);
  const requestedStatus = searchParams.get("status") as ExamStatus | null;

  const result = await container.examService.listExams(page, {
    // Students may only browse published exams; staff can filter freely (including their own drafts).
    status: isPrivileged ? requestedStatus ?? undefined : ExamStatus.PUBLISHED,
    createdById: !isPrivileged ? undefined : searchParams.get("mine") === "true" ? session.sub : undefined,
  });

  return NextResponse.json({
    items: result.items.map((e) => e.toDTO()),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  });
});
