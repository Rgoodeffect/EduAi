import { NextRequest, NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { REFRESH_COOKIE, setAuthCookies, clearAuthCookies } from "@lib/http/cookies";
import { errorResponse, handleApiError } from "@lib/http/api-error";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      return errorResponse("UNAUTHENTICATED", "No refresh token present.", 401);
    }

    const result = await container.authService.refresh(refreshToken);
    if (!result.ok) {
      const response = errorResponse("UNAUTHENTICATED", "Session expired. Please sign in again.", 401);
      return clearAuthCookies(response);
    }

    const response = NextResponse.json({ user: result.value.user });
    return setAuthCookies(response, result.value.tokens);
  } catch (err) {
    return handleApiError(err);
  }
}
