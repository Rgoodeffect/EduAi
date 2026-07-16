import { describe, it, expect } from "vitest";
import { JwtService, InvalidTokenError } from "@infrastructure/auth/jwt-service";

describe("JwtService", () => {
  const service = new JwtService();

  it("signs and verifies an access token round-trip", () => {
    const token = service.signAccessToken({ sub: "user-1", email: "a@b.com", roles: ["STUDENT"] });
    const payload = service.verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("a@b.com");
    expect(payload.roles).toEqual(["STUDENT"]);
  });

  it("signs and verifies a refresh token round-trip", () => {
    const token = service.signRefreshToken({ sub: "user-1", jti: "token-1" });
    const payload = service.verifyRefreshToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.jti).toBe("token-1");
  });

  it("throws InvalidTokenError for a garbage token", () => {
    expect(() => service.verifyAccessToken("not-a-real-token")).toThrow(InvalidTokenError);
  });

  it("rejects an access token verified as a refresh token (different secret)", () => {
    const token = service.signAccessToken({ sub: "user-1", email: "a@b.com", roles: ["STUDENT"] });
    expect(() => service.verifyRefreshToken(token)).toThrow(InvalidTokenError);
  });

  it("computes a refresh token expiry roughly matching JWT_REFRESH_EXPIRES_IN (7d)", () => {
    const expiry = service.refreshTokenExpiryDate();
    const deltaMs = expiry.getTime() - Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(deltaMs).toBeGreaterThan(sevenDaysMs - 5000);
    expect(deltaMs).toBeLessThan(sevenDaysMs + 5000);
  });
});
