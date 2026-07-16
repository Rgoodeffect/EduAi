import { NextRequest, NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { loginSchema } from "@application/auth/dto";
import { setAuthCookies } from "@lib/http/cookies";
import { handleApiError, errorResponse } from "@lib/http/api-error";
import { rateLimit } from "@infrastructure/auth/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limit = await rateLimit(`login:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return errorResponse("RATE_LIMITED", "Too many login attempts. Try again shortly.", 429);
    }

    const body = await request.json();
    const input = loginSchema.parse(body);

    const result = await container.authService.login(input, ip);
    if (!result.ok) {
      return handleApiError(result.error);
    }

    const response = NextResponse.json({ user: result.value.user });
    return setAuthCookies(response, result.value.tokens);
  } catch (err) {
    return handleApiError(err);
  }
}
