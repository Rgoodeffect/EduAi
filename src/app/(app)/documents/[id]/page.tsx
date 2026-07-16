import { notFound } from "next/navigation";
import { getServerSession } from "@lib/session.server";
import { container } from "@infrastructure/di/container";
import { canViewDocument } from "@application/document/can-view-document";
import { RoleName } from "@domain/user/value-objects/role-name";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { Card, CardBody, CardHeader, CardTitle } from "@components/ui/card";
import { StatusBadge } from "@components/ui/badge";
import { Alert } from "@components/ui/feedback";
import { SummaryPanel } from "@components/documents/summary-panel";
import { QuestionGenerationPanel } from "@components/documents/question-generation-panel";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) return null;

  const document = await container.documentService.getDocument(id);
  if (!document || !canViewDocument(document, { userId: session.sub, roles: session.roles })) {
    notFound();
  }

  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);
  const [summary, questionsPage] = await Promise.all([
    container.summarizationService.getLatestSummary(id),
    container.questionService.listQuestions({ page: 1, pageSize: 50 }, { documentId: id }),
  ]);

  const isReady = document.status === DocumentStatus.READY;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {document.fileName} · {document.pageCount ?? "?"} pages
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={document.status} />
          <a
            href={`/api/documents/${id}/file`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View PDF
          </a>
        </div>
      </div>

      {document.status === DocumentStatus.FAILED && (
        <Alert>Processing failed: {document.errorMessage ?? "Unknown error."}</Alert>
      )}
      {!isReady && document.status !== DocumentStatus.FAILED && (
        <Alert tone="info">
          This document is still being processed ({document.status.toLowerCase()}). Summaries and question generation
          will be available once it&apos;s ready.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardBody>
          {isReady ? (
            <SummaryPanel
              documentId={id}
              initialSummary={summary ? { ...summary.toDTO(), createdAt: summary.createdAt.toISOString() } : null}
            />
          ) : (
            <p className="text-sm text-gray-500">Available once the document is ready.</p>
          )}
        </CardBody>
      </Card>

      {isPrivileged && (
        <Card>
          <CardHeader>
            <CardTitle>Generate questions</CardTitle>
          </CardHeader>
          <CardBody>
            {isReady ? (
              <QuestionGenerationPanel
                documentId={id}
                initialQuestions={questionsPage.items.map((q) => ({
                  id: q.id,
                  type: q.type,
                  difficulty: q.difficulty,
                  prompt: q.prompt,
                }))}
              />
            ) : (
              <p className="text-sm text-gray-500">Available once the document is ready.</p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
