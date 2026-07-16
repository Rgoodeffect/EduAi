import { NextRequest, NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { registerSchema } from "@application/auth/dto";
import { setAuthCookies } from "@lib/http/cookies";
import { handleApiError, errorResponse } from "@lib/http/api-error";
import { rateLimit } from "@infrastructure/auth/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limit = await rateLimit(`register:${ip}`, 10, 60_000);
    if (!limit.allowed) {
      return errorResponse("RATE_LIMITED", "Too many registration attempts. Try again shortly.", 429);
    }

    const body = await request.json();
    const input = registerSchema.parse(body);

    const result = await container.authService.register(input, ip);
    if (!result.ok) {
      return handleApiError(result.error);
    }

    const response = NextResponse.json({ user: result.value.user }, { status: 201 });
    return setAuthCookies(response, result.value.tokens);
  } catch (err) {
    return handleApiError(err);
  }
}
