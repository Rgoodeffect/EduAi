import { NextRequest, NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { REFRESH_COOKIE, clearAuthCookies } from "@lib/http/cookies";
import { handleApiError } from "@lib/http/api-error";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      await container.authService.logout(refreshToken);
    }
    const response = NextResponse.json({ success: true });
    return clearAuthCookies(response);
  } catch (err) {
    return handleApiError(err);
  }
}
