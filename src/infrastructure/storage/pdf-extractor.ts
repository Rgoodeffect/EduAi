import { extractText, getDocumentProxy } from "unpdf";
import { IPdfExtractor, PdfExtractionResult } from "@application/document/ports/pdf-extractor.port";

export class PdfTextExtractor implements IPdfExtractor {
  async extract(buffer: Buffer): Promise<PdfExtractionResult> {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    return {
      text,
      pageCount: totalPages,
    };
  }
}
