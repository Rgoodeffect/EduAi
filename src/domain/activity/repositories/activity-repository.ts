import { ActivityType, UserActivityDTO } from "@domain/activity/entities/user-activity";

export interface RecordActivityData {
  userId: string;
  type: ActivityType;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export interface IUserActivityRepository {
  record(data: RecordActivityData): Promise<UserActivityDTO>;
  listByUser(userId: string, limit?: number): Promise<UserActivityDTO[]>;
  listRecent(limit?: number): Promise<UserActivityDTO[]>;
  countByType(type: ActivityType, since?: Date): Promise<number>;
}
