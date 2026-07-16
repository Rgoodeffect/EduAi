export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function toPageResult<T>(items: T[], total: number, req: PageRequest): PageResult<T> {
  return {
    items,
    total,
    page: req.page,
    pageSize: req.pageSize,
    totalPages: Math.max(1, Math.ceil(total / req.pageSize)),
  };
}

export function normalizePageRequest(input: Partial<PageRequest>): PageRequest {
  const page = input.page && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize = input.pageSize && input.pageSize > 0 ? Math.min(Math.floor(input.pageSize), 100) : 20;
  return { page, pageSize };
}
