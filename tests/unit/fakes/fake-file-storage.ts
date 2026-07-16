import { v4 as uuidv4 } from "uuid";
import {
  IFileStorageService,
  SaveFileInput,
  SaveFileResult,
} from "@application/document/ports/file-storage.port";

export class FakeFileStorageService implements IFileStorageService {
  private files = new Map<string, Buffer>();
  public deletedPaths: string[] = [];

  async save(input: SaveFileInput): Promise<SaveFileResult> {
    const storagePath = `${input.namespace}/${uuidv4()}-${input.fileName}`;
    this.files.set(storagePath, input.buffer);
    return { storagePath, sizeBytes: input.buffer.byteLength };
  }

  async readBuffer(storagePath: string): Promise<Buffer> {
    const buffer = this.files.get(storagePath);
    if (!buffer) throw new Error(`File not found: ${storagePath}`);
    return buffer;
  }

  async delete(storagePath: string): Promise<void> {
    this.files.delete(storagePath);
    this.deletedPaths.push(storagePath);
  }

  async exists(storagePath: string): Promise<boolean> {
    return this.files.has(storagePath);
  }
}
