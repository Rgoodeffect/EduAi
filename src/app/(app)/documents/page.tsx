import Link from "next/link";
import { getServerSession } from "@lib/session.server";
import { container } from "@infrastructure/di/container";
import { RoleName } from "@domain/user/value-objects/role-name";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { Card, CardBody } from "@components/ui/card";
import { StatusBadge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/feedback";
import { Pagination } from "@components/ui/pagination";
import { UploadForm } from "@components/documents/upload-form";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const session = await getServerSession();
  if (!session) return null;
  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);

  const result = await container.documentService.listDocuments(
    { page, pageSize: 10 },
    isPrivileged ? {} : { status: DocumentStatus.READY },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-gray-600">Course material uploaded for AI-powered processing.</p>
        </div>
      </div>

      {isPrivileged && <UploadForm />}

      {result.items.length === 0 ? (
        <EmptyState title="No documents yet" description={isPrivileged ? "Upload a PDF to get started." : "Check back later."} />
      ) : (
        <Card className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Title</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Pages</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Size</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {result.items.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/documents/${doc.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{doc.pageCount ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{formatBytes(doc.fileSizeBytes)}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{new Date(doc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pagination page={result.page} totalPages={result.totalPages} basePath="/documents" />
    </div>
  );
}
