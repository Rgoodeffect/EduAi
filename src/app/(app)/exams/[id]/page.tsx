import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "@lib/session.server";
import { container } from "@infrastructure/di/container";
import { RoleName } from "@domain/user/value-objects/role-name";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";
import { Card, CardBody, CardHeader, CardTitle } from "@components/ui/card";
import { ExamStatusBadge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/feedback";
import { ExamManagementActions, StartAttemptButton } from "@components/exams/exam-actions";

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) return null;

  const exam = await container.examService.getExam(id);
  const isAdmin = session.roles.includes(RoleName.ADMIN);
  const isTeacher = session.roles.includes(RoleName.TEACHER);
  const isOwner = exam?.createdById === session.sub;

  if (!exam || (!isAdmin && !isTeacher && exam.status !== ExamStatus.PUBLISHED)) {
    notFound();
  }

  const dto = exam.toDTO();
  const canManage = isAdmin || isOwner;

  const myAttempts = !canManage ? await container.examService.listMyAttempts(session.sub) : [];
  const myAttemptForThisExam = myAttempts.find((a) => a.examId === id);

  const allAttempts = canManage ? await container.examService.listAttemptsByExam(id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dto.title}</h1>
          {dto.description && <p className="mt-1 text-gray-600">{dto.description}</p>}
          <p className="mt-2 text-sm text-gray-500">
            {dto.questionCount} question{dto.questionCount === 1 ? "" : "s"} · {dto.totalPoints} points
            {dto.durationMinutes ? ` · ${dto.durationMinutes} min` : ""}
            {dto.passingScore !== null ? ` · passing score ${dto.passingScore}%` : ""}
          </p>
        </div>
        <ExamStatusBadge status={dto.status} />
      </div>

      {canManage && <ExamManagementActions examId={id} status={dto.status} />}

      {!canManage && (
        <Card>
          <CardBody>
            {myAttemptForThisExam?.submittedAt ? (
              <div className="space-y-2">
                <p className="font-medium text-gray-900">
                  You scored {myAttemptForThisExam.score} / {myAttemptForThisExam.maxScore}
                </p>
                <Link href={`/exams/attempts/${myAttemptForThisExam.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  View detailed results →
                </Link>
              </div>
            ) : myAttemptForThisExam ? (
              <Link href={`/exams/${id}/take?attemptId=${myAttemptForThisExam.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Resume your in-progress attempt →
              </Link>
            ) : dto.status === ExamStatus.PUBLISHED ? (
              <StartAttemptButton examId={id} />
            ) : (
              <p className="text-sm text-gray-500">This exam is not published yet.</p>
            )}
          </CardBody>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Attempts ({allAttempts.length})</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {allAttempts.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No attempts yet" />
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {allAttempts.map((attempt) => (
                  <li key={attempt.id} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-gray-900">Student {attempt.userId.slice(0, 8)}</span>
                    <span className="text-sm text-gray-600">
                      {attempt.submittedAt ? `${attempt.score} / ${attempt.maxScore}` : "In progress"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
