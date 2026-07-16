import {
  CreateRefreshTokenData,
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from "@domain/user/repositories/refresh-token-repository";

export class FakeRefreshTokenRepository implements IRefreshTokenRepository {
  private tokens = new Map<string, RefreshTokenRecord>();

  async create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = {
      id: data.id,
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    };
    this.tokens.set(data.id, record);
    return record;
  }

  async findById(id: string): Promise<RefreshTokenRecord | null> {
    return this.tokens.get(id) ?? null;
  }

  async revoke(id: string): Promise<void> {
    const record = this.tokens.get(id);
    if (record) record.revokedAt = new Date();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const record of this.tokens.values()) {
      if (record.userId === userId) record.revokedAt = new Date();
    }
  }
}
