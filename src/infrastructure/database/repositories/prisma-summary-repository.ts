import { PrismaClient, Summary as PrismaSummary } from "@prisma/client";
import { Summary } from "@domain/summary/entities/summary";
import { CreateSummaryData, ISummaryRepository } from "@domain/summary/repositories/summary-repository";

function toDomain(record: PrismaSummary): Summary {
  return Summary.create(
    {
      documentId: record.documentId,
      createdById: record.createdById,
      content: record.content,
      model: record.model,
      createdAt: record.createdAt,
    },
    record.id,
  );
}

export class PrismaSummaryRepository implements ISummaryRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: CreateSummaryData): Promise<Summary> {
    const record = await this.db.summary.create({ data });
    return toDomain(record);
  }

  async findLatestByDocument(documentId: string): Promise<Summary | null> {
    const record = await this.db.summary.findFirst({
      where: { documentId },
      orderBy: { createdAt: "desc" },
    });
    return record ? toDomain(record) : null;
  }

  async listByDocument(documentId: string): Promise<Summary[]> {
    const records = await this.db.summary.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toDomain);
  }
}
