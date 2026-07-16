import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";
import { errorResponse } from "@lib/http/api-error";
import { canViewDocument } from "@application/document/can-view-document";
import { DocumentStatus } from "@domain/document/value-objects/document-status";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Triggers async summary generation. Poll GET on the same route for the result. */
export const POST = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const document = await container.documentService.getDocument(id);
  if (!document || !canViewDocument(document, { userId: session.sub, roles: session.roles })) {
    return errorResponse("DOCUMENT_NOT_FOUND", "Document not found.", 404);
  }
  if (document.status !== DocumentStatus.READY) {
    return errorResponse(
      "DOCUMENT_NOT_READY",
      `Document is not ready for summarization (current status: ${document.status}).`,
      409,
    );
  }

  await container.summarizationQueue.enqueueSummarization(id, session.sub);
  return NextResponse.json({ status: "queued" }, { status: 202 });
});

export const GET = withAuth<RouteContext>(async (_request, session, ctx) => {
  const { id } = await ctx.params;
  const document = await container.documentService.getDocument(id);
  if (!document || !canViewDocument(document, { userId: session.sub, roles: session.roles })) {
    return errorResponse("DOCUMENT_NOT_FOUND", "Document not found.", 404);
  }

  const summary = await container.summarizationService.getLatestSummary(id);
  if (!summary) {
    return NextResponse.json({ summary: null });
  }
  return NextResponse.json({ summary: summary.toDTO() });
});
