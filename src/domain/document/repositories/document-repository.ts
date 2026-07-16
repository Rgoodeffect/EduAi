import { Document } from "@domain/document/entities/document";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { PageRequest, PageResult } from "@domain/shared/pagination";

export interface CreateDocumentData {
  ownerId: string;
  title: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface DocumentListFilter {
  ownerId?: string;
  status?: DocumentStatus;
  search?: string;
}

export interface IDocumentRepository {
  findById(id: string): Promise<Document | null>;
  create(data: CreateDocumentData): Promise<Document>;
  updateStatus(id: string, status: DocumentStatus, errorMessage?: string | null): Promise<void>;
  updatePageCount(id: string, pageCount: number): Promise<void>;
  list(page: PageRequest, filter?: DocumentListFilter): Promise<PageResult<Document>>;
  delete(id: string): Promise<void>;
  count(filter?: DocumentListFilter): Promise<number>;
}
