import { Entity } from "@domain/shared/entity";

export interface ChunkProps {
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  pageNumber: number | null;
  createdAt: Date;
}

export class Chunk extends Entity<ChunkProps> {
  private constructor(props: ChunkProps, id: string) {
    super(props, id);
  }

  static create(props: ChunkProps, id: string): Chunk {
    return new Chunk(props, id);
  }

  get documentId(): string {
    return this.props.documentId;
  }

  get chunkIndex(): number {
    return this.props.chunkIndex;
  }

  get content(): string {
    return this.props.content;
  }

  get tokenCount(): number {
    return this.props.tokenCount;
  }

  get pageNumber(): number | null {
    return this.props.pageNumber;
  }

  toDTO() {
    return {
      id: this.id,
      documentId: this.props.documentId,
      chunkIndex: this.props.chunkIndex,
      content: this.props.content,
      tokenCount: this.props.tokenCount,
      pageNumber: this.props.pageNumber,
    };
  }
}
