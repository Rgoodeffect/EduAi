import { PrismaClient, Document as PrismaDocument, Prisma } from "@prisma/client";
import { Document } from "@domain/document/entities/document";
import {
  CreateDocumentData,
  DocumentListFilter,
  IDocumentRepository,
} from "@domain/document/repositories/document-repository";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { PageRequest, PageResult, toPageResult } from "@domain/shared/pagination";

function toDomain(record: PrismaDocument): Document {
  return Document.create(
    {
      ownerId: record.ownerId,
      title: record.title,
      fileName: record.fileName,
      storagePath: record.storagePath,
      mimeType: record.mimeType,
      fileSizeBytes: record.fileSizeBytes,
      pageCount: record.pageCount,
      status: record.status as DocumentStatus,
      errorMessage: record.errorMessage,
      metadata: (record.metadata as Record<string, unknown> | null) ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
    record.id,
  );
}

export class PrismaDocumentRepository implements IDocumentRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Document | null> {
    const record = await this.db.document.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async create(data: CreateDocumentData): Promise<Document> {
    const record = await this.db.document.create({
      data: {
        ownerId: data.ownerId,
        title: data.title,
        fileName: data.fileName,
        storagePath: data.storagePath,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
        status: DocumentStatus.UPLOADED,
      },
    });
    return toDomain(record);
  }

  async updateStatus(id: string, status: DocumentStatus, errorMessage?: string | null): Promise<void> {
    await this.db.document.update({
      where: { id },
      data: { status, errorMessage: errorMessage ?? null },
    });
  }

  async updatePageCount(id: string, pageCount: number): Promise<void> {
    await this.db.document.update({ where: { id }, data: { pageCount } });
  }

  private buildWhere(filter?: DocumentListFilter): Prisma.DocumentWhereInput {
    return {
      ...(filter?.ownerId ? { ownerId: filter.ownerId } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.search ? { title: { contains: filter.search, mode: "insensitive" } } : {}),
    };
  }

  async list(page: PageRequest, filter?: DocumentListFilter): Promise<PageResult<Document>> {
    const where = this.buildWhere(filter);
    const [records, total] = await Promise.all([
      this.db.document.findMany({
        where,
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.db.document.count({ where }),
    ]);
    return toPageResult(records.map(toDomain), total, page);
  }

  async delete(id: string): Promise<void> {
    await this.db.document.delete({ where: { id } });
  }

  async count(filter?: DocumentListFilter): Promise<number> {
    return this.db.document.count({ where: this.buildWhere(filter) });
  }
}
