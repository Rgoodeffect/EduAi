import { Entity } from "@domain/shared/entity";
import { DocumentStatus } from "@domain/document/value-objects/document-status";

export interface DocumentProps {
  ownerId: string;
  title: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  pageCount: number | null;
  status: DocumentStatus;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Document extends Entity<DocumentProps> {
  private constructor(props: DocumentProps, id: string) {
    super(props, id);
  }

  static create(props: DocumentProps, id: string): Document {
    return new Document(props, id);
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get title(): string {
    return this.props.title;
  }

  get status(): DocumentStatus {
    return this.props.status;
  }

  get storagePath(): string {
    return this.props.storagePath;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get pageCount(): number | null {
    return this.props.pageCount;
  }

  get fileSizeBytes(): number {
    return this.props.fileSizeBytes;
  }

  get errorMessage(): string | null {
    return this.props.errorMessage;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isReady(): boolean {
    return this.props.status === DocumentStatus.READY;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.ownerId === userId;
  }

  toDTO() {
    return {
      id: this.id,
      ownerId: this.props.ownerId,
      title: this.props.title,
      fileName: this.props.fileName,
      mimeType: this.props.mimeType,
      fileSizeBytes: this.props.fileSizeBytes,
      pageCount: this.props.pageCount,
      status: this.props.status,
      errorMessage: this.props.errorMessage,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
