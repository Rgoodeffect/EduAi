import Link from "next/link";
import { getServerSession } from "@lib/session.server";
import { container } from "@infrastructure/di/container";
import { RoleName } from "@domain/user/value-objects/role-name";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";
import { Card, CardBody, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { StatusBadge, ExamStatusBadge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/feedback";

function StatTile({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition hover:border-brand-300 hover:shadow-md">
        <CardBody>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
        </CardBody>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) return null;
  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);

  if (isPrivileged) {
    const [documents, questions, exams] = await Promise.all([
      container.documentService.listDocuments({ page: 1, pageSize: 5 }, { ownerId: undefined }),
      container.questionService.listQuestions({ page: 1, pageSize: 1 }),
      container.examService.listExams({ page: 1, pageSize: 5 }),
    ]);

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-gray-600">Here&apos;s what&apos;s happening across your content.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Documents" value={documents.total} href="/documents" />
          <StatTile label="Questions in bank" value={questions.total} href="/questions" />
          <StatTile label="Exams" value={exams.total} href="/exams" />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/documents">
            <Button>Upload a document</Button>
          </Link>
          <Link href="/exams/create">
            <Button variant="outline">Create an exam</Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent documents</CardTitle>
            <Link href="/documents" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {documents.items.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No documents yet" description="Upload a PDF to get started." />
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {documents.items.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between px-5 py-3">
                    <Link href={`/documents/${doc.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                      {doc.title}
                    </Link>
                    <StatusBadge status={doc.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // Student view
  const [publishedExams, myAttempts] = await Promise.all([
    container.examService.listExams({ page: 1, pageSize: 5 }, { status: ExamStatus.PUBLISHED }),
    container.examService.listMyAttempts(session.sub),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-gray-600">Browse course material and take exams assigned to you.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile label="Available exams" value={publishedExams.total} href="/exams" />
        <StatTile label="Attempts so far" value={myAttempts.length} href="/exams" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available exams</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {publishedExams.items.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No exams available yet" description="Check back once your teacher publishes one." />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {publishedExams.items.map((exam) => (
                <li key={exam.id} className="flex items-center justify-between px-5 py-3">
                  <Link href={`/exams/${exam.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                    {exam.title}
                  </Link>
                  <ExamStatusBadge status={exam.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent attempts</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {myAttempts.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No attempts yet" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {myAttempts.slice(0, 5).map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between px-5 py-3">
                  <Link href={`/exams/attempts/${attempt.id}`} className="text-gray-900 hover:text-brand-700">
                    Attempt {attempt.id.slice(0, 8)}
                  </Link>
                  <span className="text-sm text-gray-600">
                    {attempt.submittedAt ? `${attempt.score} / ${attempt.maxScore}` : "In progress"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
