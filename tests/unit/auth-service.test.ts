import { describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "@application/auth/auth-service";
import { PasswordService } from "@infrastructure/auth/password-service";
import { JwtService } from "@infrastructure/auth/jwt-service";
import { FakeUserRepository } from "./fakes/fake-user-repository";
import { FakeRefreshTokenRepository } from "./fakes/fake-refresh-token-repository";
import { FakeUserActivityRepository } from "./fakes/fake-activity-repository";
import { UserAlreadyExistsError, InvalidCredentialsError, UserInactiveError } from "@domain/user/errors/user-errors";

function buildService() {
  const userRepository = new FakeUserRepository();
  const refreshTokenRepository = new FakeRefreshTokenRepository();
  const activityRepository = new FakeUserActivityRepository();
  const authService = new AuthService(
    userRepository,
    refreshTokenRepository,
    activityRepository,
    new PasswordService(),
    new JwtService(),
  );
  return { authService, userRepository, refreshTokenRepository, activityRepository };
}

describe("AuthService", () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it("registers a new user and returns a token pair", async () => {
    const result = await ctx.authService.register({
      email: "student@example.com",
      password: "Password1",
      firstName: "Sam",
      lastName: "Student",
      role: "STUDENT",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.user.email).toBe("student@example.com");
    expect(result.value.user.roles).toEqual(["STUDENT"]);
    expect(result.value.tokens.accessToken).toBeTruthy();
    expect(result.value.tokens.refreshToken).toBeTruthy();
  });

  it("rejects registration with a duplicate email", async () => {
    await ctx.authService.register({
      email: "dup@example.com",
      password: "Password1",
      firstName: "A",
      lastName: "B",
      role: "STUDENT",
    });
    const second = await ctx.authService.register({
      email: "dup@example.com",
      password: "Password2",
      firstName: "C",
      lastName: "D",
      role: "STUDENT",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBeInstanceOf(UserAlreadyExistsError);
  });

  it("logs in with correct credentials", async () => {
    await ctx.authService.register({
      email: "login@example.com",
      password: "Password1",
      firstName: "A",
      lastName: "B",
      role: "TEACHER",
    });
    const result = await ctx.authService.login({ email: "login@example.com", password: "Password1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.user.roles).toEqual(["TEACHER"]);
  });

  it("rejects login with a wrong password", async () => {
    await ctx.authService.register({
      email: "wrongpw@example.com",
      password: "Password1",
      firstName: "A",
      lastName: "B",
      role: "STUDENT",
    });
    const result = await ctx.authService.login({ email: "wrongpw@example.com", password: "WrongPass1" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects login for an unknown email", async () => {
    const result = await ctx.authService.login({ email: "nobody@example.com", password: "Password1" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects login for a deactivated account", async () => {
    const reg = await ctx.authService.register({
      email: "inactive@example.com",
      password: "Password1",
      firstName: "A",
      lastName: "B",
      role: "STUDENT",
    });
    if (!reg.ok) throw new Error("setup failed");
    await ctx.userRepository.setActive(reg.value.user.id, false);

    const result = await ctx.authService.login({ email: "inactive@example.com", password: "Password1" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(UserInactiveError);
  });

  it("rotates the refresh token on refresh and rejects reuse of the old one", async () => {
    const reg = await ctx.authService.register({
      email: "rotate@example.com",
      password: "Password1",
      firstName: "A",
      lastName: "B",
      role: "STUDENT",
    });
    if (!reg.ok) throw new Error("setup failed");

    const firstRefreshToken = reg.value.tokens.refreshToken;
    const refreshed = await ctx.authService.refresh(firstRefreshToken);
    expect(refreshed.ok).toBe(true);
    if (!refreshed.ok) return;
    expect(refreshed.value.tokens.refreshToken).not.toBe(firstRefreshToken);

    // The original (now-revoked) refresh token must no longer work.
    const reused = await ctx.authService.refresh(firstRefreshToken);
    expect(reused.ok).toBe(false);
  });

  it("logout revokes the refresh token so it can no longer be used", async () => {
    const reg = await ctx.authService.register({
      email: "logout@example.com",
      password: "Password1",
      firstName: "A",
      lastName: "B",
      role: "STUDENT",
    });
    if (!reg.ok) throw new Error("setup failed");

    await ctx.authService.logout(reg.value.tokens.refreshToken);
    const afterLogout = await ctx.authService.refresh(reg.value.tokens.refreshToken);
    expect(afterLogout.ok).toBe(false);
  });
});
