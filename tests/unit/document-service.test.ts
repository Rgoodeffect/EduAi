import { describe, it, expect, beforeEach } from "vitest";
import { DocumentService } from "@application/document/document-service";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { UnsupportedFileTypeError, FileTooLargeError } from "@domain/document/errors/document-errors";
import { InsufficientPermissionsError } from "@domain/user/errors/user-errors";
import { FakeDocumentRepository } from "./fakes/fake-document-repository";
import { FakeChunkRepository } from "./fakes/fake-chunk-repository";
import { FakeFileStorageService } from "./fakes/fake-file-storage";
import { FakeDocumentProcessingQueue } from "./fakes/fake-document-processing-queue";
import { FakeUserActivityRepository } from "./fakes/fake-activity-repository";

function buildService() {
  const documentRepository = new FakeDocumentRepository();
  const chunkRepository = new FakeChunkRepository();
  const fileStorage = new FakeFileStorageService();
  const processingQueue = new FakeDocumentProcessingQueue();
  const activityRepository = new FakeUserActivityRepository();
  const service = new DocumentService(
    documentRepository,
    chunkRepository,
    fileStorage,
    processingQueue,
    activityRepository,
  );
  return { service, documentRepository, chunkRepository, fileStorage, processingQueue, activityRepository };
}

describe("DocumentService", () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it("uploads a valid PDF: stores the file, creates a document, and enqueues processing", async () => {
    const result = await ctx.service.uploadDocument({
      ownerId: "teacher-1",
      fileName: "syllabus.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake content"),
      title: "Course Syllabus",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe("Course Syllabus");
    expect(result.value.status).toBe(DocumentStatus.UPLOADED);
    expect(ctx.processingQueue.enqueued).toEqual([result.value.id]);
    expect(ctx.activityRepository.records).toHaveLength(1);
  });

  it("defaults the title to the filename (without extension) when none is provided", async () => {
    const result = await ctx.service.uploadDocument({
      ownerId: "teacher-1",
      fileName: "chapter-3-photosynthesis.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("content"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe("chapter-3-photosynthesis");
  });

  it("rejects non-PDF uploads", async () => {
    const result = await ctx.service.uploadDocument({
      ownerId: "teacher-1",
      fileName: "notes.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("content"),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(UnsupportedFileTypeError);
    expect(ctx.processingQueue.enqueued).toHaveLength(0);
  });

  it("rejects files larger than MAX_UPLOAD_SIZE_MB", async () => {
    const oversized = Buffer.alloc(51 * 1024 * 1024); // env default cap is 50MB
    const result = await ctx.service.uploadDocument({
      ownerId: "teacher-1",
      fileName: "huge.pdf",
      mimeType: "application/pdf",
      buffer: oversized,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(FileTooLargeError);
  });

  it("allows the owner to delete their own document and removes the stored file", async () => {
    const upload = await ctx.service.uploadDocument({
      ownerId: "teacher-1",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("content"),
    });
    if (!upload.ok) throw new Error("setup failed");

    const result = await ctx.service.deleteDocument(upload.value.id, "teacher-1", false);
    expect(result.ok).toBe(true);
    expect(await ctx.documentRepository.findById(upload.value.id)).toBeNull();
    expect(ctx.fileStorage.deletedPaths).toHaveLength(1);
  });

  it("prevents a non-owner, non-admin from deleting someone else's document", async () => {
    const upload = await ctx.service.uploadDocument({
      ownerId: "teacher-1",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("content"),
    });
    if (!upload.ok) throw new Error("setup failed");

    const result = await ctx.service.deleteDocument(upload.value.id, "teacher-2", false);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InsufficientPermissionsError);
  });

  it("allows an admin to delete any document", async () => {
    const upload = await ctx.service.uploadDocument({
      ownerId: "teacher-1",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("content"),
    });
    if (!upload.ok) throw new Error("setup failed");

    const result = await ctx.service.deleteDocument(upload.value.id, "admin-1", true);
    expect(result.ok).toBe(true);
  });
});
