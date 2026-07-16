import Link from "next/link";
import { getServerSession } from "@lib/session.server";
import { container } from "@infrastructure/di/container";
import { RoleName } from "@domain/user/value-objects/role-name";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";
import { Card } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { ExamStatusBadge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/feedback";
import { Pagination } from "@components/ui/pagination";

export default async function ExamsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const session = await getServerSession();
  if (!session) return null;
  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);

  const result = await container.examService.listExams(
    { page, pageSize: 10 },
    isPrivileged ? { status: (params.status as ExamStatus) || undefined } : { status: ExamStatus.PUBLISHED },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="mt-1 text-gray-600">
            {isPrivileged ? "Build and manage exams from your question bank." : "Exams available for you to take."}
          </p>
        </div>
        {isPrivileged && (
          <Link href="/exams/create">
            <Button>Create exam</Button>
          </Link>
        )}
      </div>

      {result.items.length === 0 ? (
        <EmptyState title="No exams yet" description={isPrivileged ? "Create one from the question bank." : "Check back later."} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {result.items.map((exam) => {
              const dto = exam.toDTO();
              return (
                <li key={dto.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <Link href={`/exams/${dto.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                      {dto.title}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {dto.questionCount} question{dto.questionCount === 1 ? "" : "s"} · {dto.totalPoints} points
                      {dto.durationMinutes ? ` · ${dto.durationMinutes} min` : ""}
                    </p>
                  </div>
                  <ExamStatusBadge status={dto.status} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Pagination page={result.page} totalPages={result.totalPages} basePath="/exams" />
    </div>
  );
}
