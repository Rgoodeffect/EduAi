import { Entity } from "@domain/shared/entity";

export interface SummaryProps {
  documentId: string;
  createdById: string;
  content: string;
  model: string;
  createdAt: Date;
}

export class Summary extends Entity<SummaryProps> {
  private constructor(props: SummaryProps, id: string) {
    super(props, id);
  }

  static create(props: SummaryProps, id: string): Summary {
    return new Summary(props, id);
  }

  get documentId(): string {
    return this.props.documentId;
  }

  get content(): string {
    return this.props.content;
  }

  get model(): string {
    return this.props.model;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toDTO() {
    return {
      id: this.id,
      documentId: this.props.documentId,
      createdById: this.props.createdById,
      content: this.props.content,
      model: this.props.model,
      createdAt: this.props.createdAt,
    };
  }
}
