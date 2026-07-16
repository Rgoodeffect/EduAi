import { Entity } from "@domain/shared/entity";

export interface EmbeddingProps {
  chunkId: string;
  vectorId: string;
  collection: string;
  model: string;
  dimensions: number;
  createdAt: Date;
}

export class Embedding extends Entity<EmbeddingProps> {
  private constructor(props: EmbeddingProps, id: string) {
    super(props, id);
  }

  static create(props: EmbeddingProps, id: string): Embedding {
    return new Embedding(props, id);
  }

  get chunkId(): string {
    return this.props.chunkId;
  }

  get vectorId(): string {
    return this.props.vectorId;
  }

  get collection(): string {
    return this.props.collection;
  }
}
