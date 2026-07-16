import { Prisma, PrismaClient, UserActivity as PrismaUserActivity } from "@prisma/client";
import { ActivityType, UserActivityDTO } from "@domain/activity/entities/user-activity";
import {
  IUserActivityRepository,
  RecordActivityData,
} from "@domain/activity/repositories/activity-repository";

function toDTO(record: PrismaUserActivity): UserActivityDTO {
  return {
    id: record.id,
    userId: record.userId,
    type: record.type as ActivityType,
    metadata: (record.metadata as Record<string, unknown> | null) ?? null,
    ipAddress: record.ipAddress,
    createdAt: record.createdAt,
  };
}

export class PrismaUserActivityRepository implements IUserActivityRepository {
  constructor(private readonly db: PrismaClient) {}

  async record(data: RecordActivityData): Promise<UserActivityDTO> {
    const record = await this.db.userActivity.create({
      data: {
        userId: data.userId,
        type: data.type,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
        ipAddress: data.ipAddress ?? undefined,
      },
    });
    return toDTO(record);
  }

  async listByUser(userId: string, limit = 50): Promise<UserActivityDTO[]> {
    const records = await this.db.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return records.map(toDTO);
  }

  async listRecent(limit = 50): Promise<UserActivityDTO[]> {
    const records = await this.db.userActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return records.map(toDTO);
  }

  async countByType(type: ActivityType, since?: Date): Promise<number> {
    return this.db.userActivity.count({
      where: { type, ...(since ? { createdAt: { gte: since } } : {}) },
    });
  }
}
