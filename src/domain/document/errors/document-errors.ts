import { DomainError } from "@domain/shared/result";

export class DocumentNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Document "${id}" was not found.`, "DOCUMENT_NOT_FOUND");
  }
}

export class UnsupportedFileTypeError extends DomainError {
  constructor(mimeType: string) {
    super(`Unsupported file type "${mimeType}". Only PDF files are accepted.`, "UNSUPPORTED_FILE_TYPE");
  }
}

export class FileTooLargeError extends DomainError {
  constructor(maxSizeMb: number) {
    super(`File exceeds the maximum allowed size of ${maxSizeMb}MB.`, "FILE_TOO_LARGE");
  }
}

export class DocumentNotReadyError extends DomainError {
  constructor(status: string) {
    super(`Document is not ready for this operation (current status: ${status}).`, "DOCUMENT_NOT_READY");
  }
}
