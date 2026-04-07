import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import {
  ensureDefaultConsultationTypes,
  ensureDefaultExpenseCategories,
  ensureTherapySettings,
} from "@/lib/therapy/bootstrap";

const NAV = [
  { href: "/dashboard/private-clinic", label: "Overview" },
  { href: "/dashboard/private-clinic/jobs", label: "Jobs" },
  { href: "/dashboard/private-clinic/programs", label: "Programs" },
  { href: "/dashboard/private-clinic/clients", label: "Clients" },
  { href: "/dashboard/private-clinic/treatments", label: "Treatments" },
  { href: "/dashboard/private-clinic/receipts", label: "Receipts" },
  { href: "/dashboard/private-clinic/expenses", label: "Expenses" },
  { href: "/dashboard/private-clinic/appointments", label: "Appointments" },
  { href: "/dashboard/private-clinic/consultations", label: "Consultations" },
  { href: "/dashboard/private-clinic/travel", label: "Travel" },
  { href: "/dashboard/private-clinic/petrol", label: "Petrol" },
  { href: "/dashboard/private-clinic/settings", label: "Settings" },
  { href: "/dashboard/private-clinic/import-export", label: "Import / Export" },
] as const;

export default async function PrivateClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (householdId && !session?.user?.isSuperAdmin) {
    await ensureTherapySettings(householdId);
    await ensureDefaultExpenseCategories(householdId);
    await ensureDefaultConsultationTypes(householdId);
  }

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-6">
        <header className="space-y-3">
          <Link href="/" className="inline-block text-sm text-slate-400 hover:text-slate-200">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Private clinic</h1>
          <p className="text-sm text-slate-400">
            Manage clients, sessions, receipts, and clinic expenses per employment job.
          </p>
          <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 ring-1 ring-slate-700 hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
