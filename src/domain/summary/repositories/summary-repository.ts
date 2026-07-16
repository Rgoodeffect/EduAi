import { Summary } from "@domain/summary/entities/summary";

export interface CreateSummaryData {
  documentId: string;
  createdById: string;
  content: string;
  model: string;
}

export interface ISummaryRepository {
  create(data: CreateSummaryData): Promise<Summary>;
  findLatestByDocument(documentId: string): Promise<Summary | null>;
  listByDocument(documentId: string): Promise<Summary[]>;
}
