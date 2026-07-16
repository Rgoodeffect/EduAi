import { PrismaClient, RefreshToken as PrismaRefreshToken } from "@prisma/client";
import {
  CreateRefreshTokenData,
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from "@domain/user/repositories/refresh-token-repository";

function toRecord(row: PrismaRefreshToken): RefreshTokenRecord {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord> {
    const row = await this.db.refreshToken.create({
      data: {
        id: data.id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<RefreshTokenRecord | null> {
    const row = await this.db.refreshToken.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async revoke(id: string): Promise<void> {
    await this.db.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
