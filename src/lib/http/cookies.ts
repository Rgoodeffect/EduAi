import { NextResponse } from "next/server";
import { AuthTokens } from "@application/auth/dto";

export const ACCESS_COOKIE = "eduai_access_token";
export const REFRESH_COOKIE = "eduai_refresh_token";

const isProd = process.env.NODE_ENV === "production";

export function setAuthCookies(response: NextResponse, tokens: AuthTokens): NextResponse {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes; kept in sync with JWT_ACCESS_EXPIRES_IN default
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60, // 7 days; kept in sync with JWT_REFRESH_EXPIRES_IN default
  });
  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { path: "/api/auth", maxAge: 0 });
  return response;
}
