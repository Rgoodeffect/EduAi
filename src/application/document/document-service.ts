import { Document } from "@domain/document/entities/document";
import { Chunk } from "@domain/chunk/entities/chunk";
import {
  DocumentListFilter,
  IDocumentRepository,
} from "@domain/document/repositories/document-repository";
import { IChunkRepository } from "@domain/chunk/repositories/chunk-repository";
import {
  DocumentNotFoundError,
  FileTooLargeError,
  UnsupportedFileTypeError,
} from "@domain/document/errors/document-errors";
import { InsufficientPermissionsError } from "@domain/user/errors/user-errors";
import { ActivityType } from "@domain/activity/entities/user-activity";
import { IUserActivityRepository } from "@domain/activity/repositories/activity-repository";
import { Result } from "@domain/shared/result";
import { PageRequest, PageResult } from "@domain/shared/pagination";
import { IFileStorageService } from "@application/document/ports/file-storage.port";
import { IDocumentProcessingQueue } from "@application/document/ports/document-processing-queue.port";
import { getEnv } from "@infrastructure/config/env";

const ACCEPTED_MIME_TYPES = ["application/pdf"];

export interface UploadDocumentInput {
  ownerId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  title?: string;
}

export class DocumentService {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly chunkRepository: IChunkRepository,
    private readonly fileStorage: IFileStorageService,
    private readonly processingQueue: IDocumentProcessingQueue,
    private readonly activityRepository: IUserActivityRepository,
  ) {}

  async uploadDocument(
    input: UploadDocumentInput,
  ): Promise<Result<Document, UnsupportedFileTypeError | FileTooLargeError>> {
    if (!ACCEPTED_MIME_TYPES.includes(input.mimeType)) {
      return Result.fail(new UnsupportedFileTypeError(input.mimeType));
    }

    const env = getEnv();
    const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    if (input.buffer.byteLength > maxBytes) {
      return Result.fail(new FileTooLargeError(env.MAX_UPLOAD_SIZE_MB));
    }

    const saved = await this.fileStorage.save({
      buffer: input.buffer,
      fileName: input.fileName,
      namespace: "documents",
    });

    const document = await this.documentRepository.create({
      ownerId: input.ownerId,
      title: input.title?.trim() || input.fileName.replace(/\.pdf$/i, ""),
      fileName: input.fileName,
      storagePath: saved.storagePath,
      mimeType: input.mimeType,
      fileSizeBytes: saved.sizeBytes,
    });

    await this.processingQueue.enqueueProcessing(document.id);

    await this.activityRepository.record({
      userId: input.ownerId,
      type: ActivityType.DOCUMENT_UPLOAD,
      metadata: { documentId: document.id, fileName: input.fileName },
    });

    return Result.ok(document);
  }

  async getDocument(id: string): Promise<Document | null> {
    return this.documentRepository.findById(id);
  }

  async listDocuments(page: PageRequest, filter?: DocumentListFilter): Promise<PageResult<Document>> {
    return this.documentRepository.list(page, filter);
  }

  async getChunks(documentId: string): Promise<Chunk[]> {
    return this.chunkRepository.listByDocument(documentId);
  }

  async deleteDocument(
    id: string,
    requesterId: string,
    requesterIsAdmin: boolean,
  ): Promise<Result<void, DocumentNotFoundError | InsufficientPermissionsError>> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      return Result.fail(new DocumentNotFoundError(id));
    }
    if (!requesterIsAdmin && !document.isOwnedBy(requesterId)) {
      return Result.fail(new InsufficientPermissionsError("delete this document"));
    }

    await this.fileStorage.delete(document.storagePath);
    await this.documentRepository.delete(id); // cascades to chunks/summaries/embeddings in Postgres
    return Result.ok(undefined);
  }
}
