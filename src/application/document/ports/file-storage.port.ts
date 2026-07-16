/**
 * Driven port for binary file persistence. The application layer depends
 * only on this interface; today's implementation is local disk
 * (src/infrastructure/storage/local-file-storage.ts) but the same port
 * could be backed by S3/GCS without touching any use case.
 */
export interface SaveFileInput {
  buffer: Buffer;
  fileName: string;
  /** Logical subdirectory, e.g. a document id, to namespace stored files. */
  namespace: string;
}

export interface SaveFileResult {
  storagePath: string;
  sizeBytes: number;
}

export interface IFileStorageService {
  save(input: SaveFileInput): Promise<SaveFileResult>;
  readBuffer(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
  exists(storagePath: string): Promise<boolean>;
}
