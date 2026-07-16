import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth, withRole } from "@infrastructure/http/api-guard";
import { errorResponse, handleApiError } from "@lib/http/api-error";
import { normalizePageRequest } from "@domain/shared/pagination";
import { RoleName } from "@domain/user/value-objects/role-name";
import { DocumentStatus } from "@domain/document/value-objects/document-status";

export const POST = withRole([RoleName.TEACHER, RoleName.ADMIN], async (request, session) => {
  const formData = await request.formData();
  const file = formData.get("file");
  const title = formData.get("title");

  if (!(file instanceof File)) {
    return errorResponse("VALIDATION_ERROR", "A 'file' field containing a PDF upload is required.", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await container.documentService.uploadDocument({
    ownerId: session.sub,
    fileName: file.name,
    mimeType: file.type || "application/pdf",
    buffer,
    title: typeof title === "string" ? title : undefined,
  });

  if (!result.ok) return handleApiError(result.error);
  return NextResponse.json({ document: result.value.toDTO() }, { status: 201 });
});

export const GET = withAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const page = normalizePageRequest({
    page: Number(searchParams.get("page")) || undefined,
    pageSize: Number(searchParams.get("pageSize")) || undefined,
  });

  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);
  const requestedStatus = searchParams.get("status") as DocumentStatus | null;

  const result = await container.documentService.listDocuments(page, {
    // Non-staff users may only browse READY documents; staff can filter freely.
    status: isPrivileged ? requestedStatus ?? undefined : DocumentStatus.READY,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({
    items: result.items.map((d) => d.toDTO()),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  });
});
