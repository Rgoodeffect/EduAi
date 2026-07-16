import jwt, { type SignOptions } from "jsonwebtoken";
import { getEnv } from "@infrastructure/config/env";
import { RoleName } from "@domain/user/value-objects/role-name";

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  roles: RoleName[];
}

export interface RefreshTokenPayload {
  sub: string; // user id
  jti: string; // unique token id, matches RefreshToken.id in the DB
}

export class InvalidTokenError extends Error {
  constructor(reason: string) {
    super(`Invalid token: ${reason}`);
    this.name = "InvalidTokenError";
  }
}

/**
 * Wraps jsonwebtoken. Access tokens are short-lived and carry role claims so
 * API routes can authorize requests without a DB round trip; refresh tokens
 * are long-lived, opaque-ish (just a user id + token id) and always verified
 * against the hashed record in the database before being honored.
 */
export class JwtService {
  signAccessToken(payload: AccessTokenPayload): string {
    const env = getEnv();
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    } as SignOptions);
  }

  signRefreshToken(payload: RefreshTokenPayload): string {
    const env = getEnv();
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const env = getEnv();
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch (err) {
      throw new InvalidTokenError(err instanceof Error ? err.message : "unknown");
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const env = getEnv();
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch (err) {
      throw new InvalidTokenError(err instanceof Error ? err.message : "unknown");
    }
  }

  /** Refresh token expiry as a Date, mirroring JWT_REFRESH_EXPIRES_IN, for persisting alongside the hashed token. */
  refreshTokenExpiryDate(): Date {
    const env = getEnv();
    return new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));
  }
}

/** Parses simple duration strings like "15m", "7d", "1h" into milliseconds. */
function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // fallback: 7 days
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as "s" | "m" | "h" | "d"];
  return value * unitMs;
}
