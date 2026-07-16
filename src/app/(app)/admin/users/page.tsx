import { redirect } from "next/navigation";
import { getServerSession } from "@lib/session.server";
import { container } from "@infrastructure/di/container";
import { RoleName } from "@domain/user/value-objects/role-name";
import { Card } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Pagination } from "@components/ui/pagination";
import { UserRowActions } from "@components/admin/user-row-actions";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const session = await getServerSession();
  if (!session || !session.roles.includes(RoleName.ADMIN)) redirect("/dashboard");

  const result = await container.userRepository.list({ page, pageSize: 20 }, { search: params.search });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User management</h1>
        <p className="mt-1 text-gray-600">{result.total} registered users.</p>
      </div>

      <Card>
        <form method="get" className="border-b border-gray-200 p-4">
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder="Search by name or email..."
            className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm sm:w-80"
          />
        </form>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Email</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Role / Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {result.items.map((user) => {
              const profile = user.toPublicProfile();
              return (
                <tr key={profile.id}>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{profile.fullName}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{profile.email}</td>
                  <td className="px-5 py-3">
                    <Badge tone={profile.isActive ? "green" : "red"}>{profile.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <UserRowActions
                      userId={profile.id}
                      roles={profile.roles}
                      isActive={profile.isActive}
                      isSelf={profile.id === session.sub}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/users" searchParams={{ search: params.search }} />
    </div>
  );
}
