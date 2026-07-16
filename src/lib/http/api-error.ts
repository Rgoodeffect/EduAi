import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "@domain/shared/result";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function errorResponse(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json<ApiErrorBody>({ error: { code, message, details } }, { status });
}

const DOMAIN_ERROR_STATUS: Record<string, number> = {
  USER_ALREADY_EXISTS: 409,
  INVALID_CREDENTIALS: 401,
  USER_NOT_FOUND: 404,
  USER_INACTIVE: 403,
  INSUFFICIENT_PERMISSIONS: 403,
  DOCUMENT_NOT_FOUND: 404,
  UNSUPPORTED_FILE_TYPE: 415,
  FILE_TOO_LARGE: 413,
  DOCUMENT_NOT_READY: 409,
};

/** Normalizes thrown/returned errors into a consistent JSON API error response. */
export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return errorResponse("VALIDATION_ERROR", "Request validation failed.", 400, err.flatten());
  }
  if (err instanceof DomainError) {
    const status = DOMAIN_ERROR_STATUS[err.code] ?? 400;
    return errorResponse(err.code, err.message, status);
  }
  console.error(err);
  return errorResponse("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}
