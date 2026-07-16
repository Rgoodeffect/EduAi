import { v4 as uuidv4 } from "uuid";
import { UserActivityDTO } from "@domain/activity/entities/user-activity";
import {
  IUserActivityRepository,
  RecordActivityData,
} from "@domain/activity/repositories/activity-repository";

export class FakeUserActivityRepository implements IUserActivityRepository {
  public records: UserActivityDTO[] = [];

  async record(data: RecordActivityData): Promise<UserActivityDTO> {
    const activity: UserActivityDTO = {
      id: uuidv4(),
      userId: data.userId,
      type: data.type,
      metadata: data.metadata ?? null,
      ipAddress: data.ipAddress ?? null,
      createdAt: new Date(),
    };
    this.records.push(activity);
    return activity;
  }

  async listByUser(userId: string): Promise<UserActivityDTO[]> {
    return this.records.filter((r) => r.userId === userId);
  }

  async listRecent(limit = 50): Promise<UserActivityDTO[]> {
    return this.records.slice(-limit);
  }

  async countByType(type: string): Promise<number> {
    return this.records.filter((r) => r.type === type).length;
  }
}
