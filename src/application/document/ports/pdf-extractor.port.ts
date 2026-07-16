export interface PdfExtractionResult {
  text: string;
  pageCount: number;
}

export interface IPdfExtractor {
  extract(buffer: Buffer): Promise<PdfExtractionResult>;
}
