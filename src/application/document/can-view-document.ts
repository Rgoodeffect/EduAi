import { Document } from "@domain/document/entities/document";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { RoleName } from "@domain/user/value-objects/role-name";

export interface ViewerContext {
  userId: string;
  roles: string[];
}

/**
 * Centralizes document visibility rules so every route (detail, chunks,
 * raw file) applies the same policy: admins/teachers see everything;
 * everyone else may only see their own uploads or documents that finished
 * processing (READY) — in-progress or failed uploads stay private to staff.
 */
export function canViewDocument(document: Document, viewer: ViewerContext): boolean {
  if (viewer.roles.includes(RoleName.ADMIN) || viewer.roles.includes(RoleName.TEACHER)) return true;
  if (document.isOwnedBy(viewer.userId)) return true;
  return document.status === DocumentStatus.READY;
}
