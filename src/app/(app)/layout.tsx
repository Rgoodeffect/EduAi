import { redirect } from "next/navigation";
import { getServerSession } from "@lib/session.server";
import { container } from "@infrastructure/di/container";
import { Nav } from "@components/layout/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const user = await container.userRepository.findById(session.sub);
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav fullName={user.fullName} roles={user.roles} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
