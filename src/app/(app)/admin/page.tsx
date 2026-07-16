import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@lib/session.server";
import { container } from "@infrastructure/di/container";
import { RoleName } from "@domain/user/value-objects/role-name";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";
import { Card, CardBody, CardHeader, CardTitle } from "@components/ui/card";
import { Badge } from "@components/ui/badge";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
      </CardBody>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const session = await getServerSession();
  if (!session || !session.roles.includes(RoleName.ADMIN)) redirect("/dashboard");

  const [userCounts, documentCounts, questionTotal, examCounts, recentActivity] = await Promise.all([
    Promise.all([
      container.userRepository.count(),
      container.userRepository.list({ page: 1, pageSize: 1 }, { role: RoleName.ADMIN }).then((r) => r.total),
      container.userRepository.list({ page: 1, pageSize: 1 }, { role: RoleName.TEACHER }).then((r) => r.total),
      container.userRepository.list({ page: 1, pageSize: 1 }, { role: RoleName.STUDENT }).then((r) => r.total),
    ]),
    Promise.all([
      container.documentRepository.count(),
      container.documentRepository.count({ status: DocumentStatus.READY }),
      container.documentRepository.count({ status: DocumentStatus.FAILED }),
    ]),
    container.questionRepository.count(),
    Promise.all([
      container.examRepository.list({ page: 1, pageSize: 1 }, {}).then((r) => r.total),
      container.examRepository.list({ page: 1, pageSize: 1 }, { status: ExamStatus.PUBLISHED }).then((r) => r.total),
    ]),
    container.activityRepository.listRecent(15),
  ]);

  const [totalUsers, admins, teachers, students] = userCounts;
  const [totalDocuments, readyDocuments, failedDocuments] = documentCounts;
  const [totalExams, publishedExams] = examCounts;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin dashboard</h1>
          <p className="mt-1 text-gray-600">Platform-wide activity and management.</p>
        </div>
        <Link href="/admin/users" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Manage users →
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Users</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Total" value={totalUsers} />
          <Stat label="Admins" value={admins} />
          <Stat label="Teachers" value={teachers} />
          <Stat label="Students" value={students} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Content</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Documents" value={totalDocuments} />
          <Stat label="Ready" value={readyDocuments} />
          <Stat label="Failed" value={failedDocuments} />
          <Stat label="Questions" value={questionTotal} />
          <Stat label="Exams" value={totalExams} />
        </div>
        <p className="mt-2 text-sm text-gray-500">{publishedExams} of {totalExams} exams are published.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <ul className="divide-y divide-gray-100">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between px-5 py-3">
                <Badge tone="purple">{activity.type.replace(/_/g, " ")}</Badge>
                <span className="text-sm text-gray-500">{new Date(activity.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
