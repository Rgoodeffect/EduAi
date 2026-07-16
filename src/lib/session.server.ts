import "server-only";
import { cookies } from "next/headers";
import { container } from "@infrastructure/di/container";
import { ACCESS_COOKIE } from "@lib/http/cookies";
import { AccessTokenPayload } from "@infrastructure/auth/jwt-service";

/** Server Component / layout equivalent of infrastructure/http/session.ts (which targets NextRequest). */
export async function getServerSession(): Promise<AccessTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    return container.jwtService.verifyAccessToken(token);
  } catch {
    return null;
  }
}
