import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withRole } from "@infrastructure/http/api-guard";
import { RoleName } from "@domain/user/value-objects/role-name";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";

export const GET = withRole([RoleName.ADMIN], async () => {
  const tiny = { page: 1, pageSize: 1 };

  const [
    totalUsers,
    admins,
    teachers,
    students,
    totalDocuments,
    readyDocuments,
    processingDocuments,
    failedDocuments,
    totalQuestions,
    totalExams,
    publishedExams,
    recentActivity,
  ] = await Promise.all([
    container.userRepository.count(),
    container.userRepository.list(tiny, { role: RoleName.ADMIN }).then((r) => r.total),
    container.userRepository.list(tiny, { role: RoleName.TEACHER }).then((r) => r.total),
    container.userRepository.list(tiny, { role: RoleName.STUDENT }).then((r) => r.total),
    container.documentRepository.count(),
    container.documentRepository.count({ status: DocumentStatus.READY }),
    container.documentRepository.count({ status: DocumentStatus.PROCESSING }),
    container.documentRepository.count({ status: DocumentStatus.FAILED }),
    container.questionRepository.count(),
    container.examRepository.list(tiny, {}).then((r) => r.total),
    container.examRepository.list(tiny, { status: ExamStatus.PUBLISHED }).then((r) => r.total),
    container.activityRepository.listRecent(20),
  ]);

  return NextResponse.json({
    users: { total: totalUsers, admins, teachers, students },
    documents: { total: totalDocuments, ready: readyDocuments, processing: processingDocuments, failed: failedDocuments },
    questions: { total: totalQuestions },
    exams: { total: totalExams, published: publishedExams },
    recentActivity,
  });
});
