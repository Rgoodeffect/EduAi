import { v4 as uuidv4 } from "uuid";
import { Document } from "@domain/document/entities/document";
import {
  CreateDocumentData,
  DocumentListFilter,
  IDocumentRepository,
} from "@domain/document/repositories/document-repository";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { PageRequest, PageResult, toPageResult } from "@domain/shared/pagination";

function withProps(doc: Document, overrides: Partial<ReturnType<Document["toDTO"]>> & { errorMessage?: string | null }) {
  return Document.create(
    {
      ownerId: doc.ownerId,
      title: doc.title,
      fileName: doc.fileName,
      storagePath: doc.storagePath,
      mimeType: doc.mimeType,
      fileSizeBytes: doc.fileSizeBytes,
      pageCount: overrides.pageCount ?? doc.pageCount,
      status: overrides.status ?? doc.status,
      errorMessage: overrides.errorMessage !== undefined ? overrides.errorMessage : doc.errorMessage,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: new Date(),
    },
    doc.id,
  );
}

export class FakeDocumentRepository implements IDocumentRepository {
  private documents = new Map<string, Document>();

  async findById(id: string): Promise<Document | null> {
    return this.documents.get(id) ?? null;
  }

  async create(data: CreateDocumentData): Promise<Document> {
    const id = uuidv4();
    const document = Document.create(
      {
        ownerId: data.ownerId,
        title: data.title,
        fileName: data.fileName,
        storagePath: data.storagePath,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
        pageCount: null,
        status: DocumentStatus.UPLOADED,
        errorMessage: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    );
    this.documents.set(id, document);
    return document;
  }

  async updateStatus(id: string, status: DocumentStatus, errorMessage: string | null = null): Promise<void> {
    const doc = this.documents.get(id);
    if (!doc) return;
    this.documents.set(id, withProps(doc, { status, errorMessage }));
  }

  async updatePageCount(id: string, pageCount: number): Promise<void> {
    const doc = this.documents.get(id);
    if (!doc) return;
    this.documents.set(id, withProps(doc, { pageCount }));
  }

  async list(page: PageRequest, filter?: DocumentListFilter): Promise<PageResult<Document>> {
    let items = Array.from(this.documents.values());
    if (filter?.ownerId) items = items.filter((d) => d.ownerId === filter.ownerId);
    if (filter?.status) items = items.filter((d) => d.status === filter.status);
    return toPageResult(items, items.length, page);
  }

  async delete(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async count(): Promise<number> {
    return this.documents.size;
  }
}
