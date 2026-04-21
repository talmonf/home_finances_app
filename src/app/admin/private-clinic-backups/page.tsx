import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession, prisma } from "@/lib/auth";
import { PrivateClinicBackupConsole } from "@/components/admin/private-clinic-backup-console";

export const dynamic = "force-dynamic";

export default async function PrivateClinicBackupsAdminPage() {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    redirect("/");
  }

  const households = await prisma.households.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 500,
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-7xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <p className="text-sm text-slate-400">
            <Link href="/" className="text-sky-400 hover:underline">
              ← Back to Home
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">Private clinic backup and restore (super admin)</h1>
          <p className="text-sm text-slate-400">
            Full-fidelity backup for private-clinic data. Excel import/export remains available for operational migration.
          </p>
        </header>
        <PrivateClinicBackupConsole households={households} />
      </div>
    </div>
  );
}
