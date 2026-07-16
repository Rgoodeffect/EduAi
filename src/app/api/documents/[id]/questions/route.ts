import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth, withRole } from "@infrastructure/http/api-guard";
import { errorResponse } from "@lib/http/api-error";
import { canViewDocument } from "@application/document/can-view-document";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { RoleName } from "@domain/user/value-objects/role-name";
import { generateQuestionsSchema } from "@application/question/dto";
import { normalizePageRequest } from "@domain/shared/pagination";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Triggers async question generation for a document. Poll GET on this route (or GET /api/questions?documentId=) for results. */
export const POST = withRole<RouteContext>([RoleName.TEACHER, RoleName.ADMIN], async (request, session, ctx) => {
  const { id } = await ctx.params;
  const document = await container.documentService.getDocument(id);
  if (!document) {
    return errorResponse("DOCUMENT_NOT_FOUND", "Document not found.", 404);
  }
  if (document.status !== DocumentStatus.READY) {
    return errorResponse(
      "DOCUMENT_NOT_READY",
      `Document is not ready for question generation (current status: ${document.status}).`,
      409,
    );
  }

  const body = await request.json().catch(() => ({}));
  const input = generateQuestionsSchema.parse({ ...body, documentId: id });

  await container.questionGenerationQueue.enqueueGeneration(input, session.sub);
  return NextResponse.json({ status: "queued" }, { status: 202 });
});

export const GET = withAuth<RouteContext>(async (request, session, ctx) => {
  const { id } = await ctx.params;
  const document = await container.documentService.getDocument(id);
  if (!document || !canViewDocument(document, { userId: session.sub, roles: session.roles })) {
    return errorResponse("DOCUMENT_NOT_FOUND", "Document not found.", 404);
  }

  const { searchParams } = new URL(request.url);
  const page = normalizePageRequest({
    page: Number(searchParams.get("page")) || undefined,
    pageSize: Number(searchParams.get("pageSize")) || undefined,
  });

  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);
  const result = await container.questionService.listQuestions(page, { documentId: id });

  return NextResponse.json({
    items: result.items.map((q) => q.toDTO(isPrivileged)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  });
});
