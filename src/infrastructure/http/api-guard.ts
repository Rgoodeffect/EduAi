import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@infrastructure/http/session";
import { errorResponse, handleApiError } from "@lib/http/api-error";
import { AccessTokenPayload } from "@infrastructure/auth/jwt-service";
import { RoleName } from "@domain/user/value-objects/role-name";

export type AuthedHandler<Ctx = unknown> = (
  request: NextRequest,
  session: AccessTokenPayload,
  ctx: Ctx,
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Next.js Route Handler so it only executes for authenticated
 * requests, and centralizes error handling (domain errors -> proper HTTP
 * status, zod errors -> 400, unknowns -> 500) so individual routes stay thin.
 */
export function withAuth<Ctx = unknown>(handler: AuthedHandler<Ctx>) {
  return async (request: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    try {
      const session = getSession(request);
      if (!session) {
        return errorResponse("UNAUTHENTICATED", "Authentication is required.", 401);
      }
      return await handler(request, session, ctx);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

/**
 * RBAC gate: like withAuth, but additionally requires the caller to hold one
 * of the given roles. Role-based access control lives at this single
 * chokepoint rather than being re-implemented per route.
 */
export function withRole<Ctx = unknown>(roles: RoleName[], handler: AuthedHandler<Ctx>) {
  return withAuth<Ctx>(async (request, session, ctx) => {
    if (!session.roles.some((r) => roles.includes(r))) {
      return errorResponse("FORBIDDEN", "You do not have permission to access this resource.", 403);
    }
    return handler(request, session, ctx);
  });
}

/** For public routes that still want centralized error handling. */
export function withErrorHandling<Ctx = unknown>(
  handler: (request: NextRequest, ctx: Ctx) => Promise<NextResponse> | NextResponse,
) {
  return async (request: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    try {
      return await handler(request, ctx);
    } catch (err) {
      return handleApiError(err);
    }
  };
}
