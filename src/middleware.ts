import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ACCESS_COOKIE } from "@lib/http/cookies";

/**
 * Edge-runtime page middleware. Handles authentication redirects and coarse
 * RBAC for page routes. `jsonwebtoken` (used elsewhere in the app) relies on
 * Node's crypto module, which the Edge runtime middleware executes under
 * does not support — so verification here uses `jose`, which is built on
 * Web Crypto, against the same HMAC secret.
 *
 * This is a UX layer only: the authoritative authorization check for every
 * mutation happens again in the API route handlers via withAuth/withRole
 * (src/infrastructure/http/api-guard.ts), which run in the Node.js runtime.
 */

const PUBLIC_PATHS = ["/", "/login", "/register"];
const ADMIN_PREFIX = "/admin";

interface TokenClaims {
  sub: string;
  email: string;
  roles: string[];
}

async function verifyAccessToken(token: string): Promise<TokenClaims | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenClaims;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const claims = token ? await verifyAccessToken(token) : null;

  if (!claims) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(ADMIN_PREFIX) && !claims.roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all page routes except:
     * - api routes (guarded independently)
     * - Next.js internals and static assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
