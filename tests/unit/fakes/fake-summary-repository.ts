import { v4 as uuidv4 } from "uuid";
import { Summary } from "@domain/summary/entities/summary";
import { CreateSummaryData, ISummaryRepository } from "@domain/summary/repositories/summary-repository";

export class FakeSummaryRepository implements ISummaryRepository {
  private summaries: Summary[] = [];

  async create(data: CreateSummaryData): Promise<Summary> {
    const summary = Summary.create({ ...data, createdAt: new Date() }, uuidv4());
    this.summaries.push(summary);
    return summary;
  }

  async findLatestByDocument(documentId: string): Promise<Summary | null> {
    const matches = this.summaries.filter((s) => s.documentId === documentId);
    return matches.length > 0 ? matches[matches.length - 1]! : null;
  }

  async listByDocument(documentId: string): Promise<Summary[]> {
    return this.summaries.filter((s) => s.documentId === documentId);
  }
}
