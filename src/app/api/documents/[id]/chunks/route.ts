import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";
import { errorResponse } from "@lib/http/api-error";
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

  const chunks = await container.documentService.getChunks(id);
  return NextResponse.json({ chunks: chunks.map((c) => c.toDTO()) });
});
