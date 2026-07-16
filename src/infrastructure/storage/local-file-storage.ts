import { promises as fs } from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import {
  IFileStorageService,
  SaveFileInput,
  SaveFileResult,
} from "@application/document/ports/file-storage.port";
import { getEnv } from "@infrastructure/config/env";

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
}

/**
 * Local-disk implementation of IFileStorageService. `storagePath` values are
 * relative (e.g. "documents/<id>/<file>.pdf") so they remain portable if the
 * root mount point changes between environments (dev vs. the Docker volume).
 */
export class LocalFileStorageService implements IFileStorageService {
  private rootDir(): string {
    return getEnv().STORAGE_LOCAL_PATH;
  }

  private absolute(storagePath: string): string {
    return path.join(this.rootDir(), storagePath);
  }

  async save(input: SaveFileInput): Promise<SaveFileResult> {
    const safeName = `${uuidv4()}-${sanitizeFileName(input.fileName)}`;
    const relativePath = path.join(input.namespace, safeName);
    const absolutePath = this.absolute(relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.buffer);

    return { storagePath: relativePath, sizeBytes: input.buffer.byteLength };
  }

  async readBuffer(storagePath: string): Promise<Buffer> {
    return fs.readFile(this.absolute(storagePath));
  }

  async delete(storagePath: string): Promise<void> {
    try {
      await fs.unlink(this.absolute(storagePath));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      await fs.access(this.absolute(storagePath));
      return true;
    } catch {
      return false;
    }
  }
}
