import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { IUserRepository } from "@domain/user/repositories/user-repository";
import { IRefreshTokenRepository } from "@domain/user/repositories/refresh-token-repository";
import { IUserActivityRepository } from "@domain/activity/repositories/activity-repository";
import { ActivityType } from "@domain/activity/entities/user-activity";
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  UserInactiveError,
  UserNotFoundError,
} from "@domain/user/errors/user-errors";
import { Result } from "@domain/shared/result";
import { PasswordService } from "@infrastructure/auth/password-service";
import { InvalidTokenError, JwtService } from "@infrastructure/auth/jwt-service";
import { AuthResult, AuthenticatedUserDTO, LoginInput, RegisterInput } from "@application/auth/dto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}): AuthenticatedUserDTO {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles as AuthenticatedUserDTO["roles"],
  };
}

/**
 * Application service (use-case layer): orchestrates domain repositories and
 * infrastructure services to implement the authentication use cases. Holds
 * no framework-specific code (no Next.js Request/Response), so it is
 * reusable from API routes, server actions, or tests alike.
 */
export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly activityRepository: IUserActivityRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput, ipAddress?: string): Promise<Result<AuthResult, UserAlreadyExistsError>> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      return Result.fail(new UserAlreadyExistsError(input.email));
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      roles: [input.role],
    });

    await this.activityRepository.record({
      userId: user.id,
      type: ActivityType.LOGIN,
      ipAddress,
      metadata: { reason: "post-registration" },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.roles);
    return Result.ok({ user: toAuthenticatedUser(user), tokens });
  }

  async login(
    input: LoginInput,
    ipAddress?: string,
  ): Promise<Result<AuthResult, InvalidCredentialsError | UserInactiveError>> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      return Result.fail(new InvalidCredentialsError());
    }

    const passwordMatches = await this.passwordService.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      return Result.fail(new InvalidCredentialsError());
    }

    if (!user.isActive) {
      return Result.fail(new UserInactiveError());
    }

    await this.userRepository.updateLastLogin(user.id);
    await this.activityRepository.record({ userId: user.id, type: ActivityType.LOGIN, ipAddress });

    const tokens = await this.issueTokens(user.id, user.email, user.roles);
    return Result.ok({ user: toAuthenticatedUser(user), tokens });
  }

  async refresh(
    rawRefreshToken: string,
  ): Promise<Result<AuthResult, InvalidTokenError | UserNotFoundError | UserInactiveError>> {
    let payload;
    try {
      payload = this.jwtService.verifyRefreshToken(rawRefreshToken);
    } catch (err) {
      return Result.fail(err instanceof InvalidTokenError ? err : new InvalidTokenError("verification failed"));
    }

    const stored = await this.refreshTokenRepository.findById(payload.jti);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return Result.fail(new InvalidTokenError("token revoked, expired, or unknown"));
    }
    if (stored.tokenHash !== hashToken(rawRefreshToken)) {
      return Result.fail(new InvalidTokenError("token hash mismatch"));
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) return Result.fail(new UserNotFoundError(payload.sub));
    if (!user.isActive) return Result.fail(new UserInactiveError());

    // Rotate: revoke the used refresh token and issue a new pair.
    await this.refreshTokenRepository.revoke(stored.id);
    const tokens = await this.issueTokens(user.id, user.email, user.roles);
    return Result.ok({ user: toAuthenticatedUser(user), tokens });
  }

  async logout(rawRefreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verifyRefreshToken(rawRefreshToken);
      await this.refreshTokenRepository.revoke(payload.jti);
      await this.activityRepository.record({ userId: payload.sub, type: ActivityType.LOGOUT });
    } catch {
      // Token already invalid/expired — nothing to revoke, logout is a no-op.
    }
  }

  private async issueTokens(userId: string, email: string, roles: string[]) {
    const accessToken = this.jwtService.signAccessToken({
      sub: userId,
      email,
      roles: roles as AuthenticatedUserDTO["roles"],
    });

    const jti = uuidv4();
    const refreshToken = this.jwtService.signRefreshToken({ sub: userId, jti });
    await this.refreshTokenRepository.create({
      id: jti,
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: this.jwtService.refreshTokenExpiryDate(),
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: "15m",
    };
  }
}
