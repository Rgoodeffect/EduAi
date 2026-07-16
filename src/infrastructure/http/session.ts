import { NextRequest } from "next/server";
import { container } from "@infrastructure/di/container";
import { ACCESS_COOKIE } from "@lib/http/cookies";
import { AccessTokenPayload } from "@infrastructure/auth/jwt-service";

/**
 * Extracts and verifies the caller's identity from either the httpOnly
 * access-token cookie (browser requests) or an `Authorization: Bearer`
 * header (API clients / server-to-server), so both flows share one code path.
 */
export function getSession(request: NextRequest): AccessTokenPayload | null {
  const bearer = request.headers.get("authorization");
  const token = bearer?.startsWith("Bearer ")
    ? bearer.slice("Bearer ".length)
    : request.cookies.get(ACCESS_COOKIE)?.value;

  if (!token) return null;

  try {
    return container.jwtService.verifyAccessToken(token);
  } catch {
    return null;
  }
}
