import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";
import { errorResponse, handleApiError } from "@lib/http/api-error";
import { RoleName } from "@domain/user/value-objects/role-name";
import { canViewDocument } from "@application/document/can-view-document";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const document = await container.documentService.getDocument(id);
  if (!document || !canViewDocument(document, { userId: session.sub, roles: session.roles })) {
    return errorResponse("DOCUMENT_NOT_FOUND", "Document not found.", 404);
  }
  return NextResponse.json({ document: document.toDTO() });
});

export const DELETE = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const result = await container.documentService.deleteDocument(
    id,
    session.sub,
    session.roles.includes(RoleName.ADMIN),
  );
  if (!result.ok) return handleApiError(result.error);
  return NextResponse.json({ success: true });
});
