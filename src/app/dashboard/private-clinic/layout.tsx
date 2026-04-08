import Link from "next/link";
import { getAuthSession, prisma } from "@/lib/auth";
import { getVisiblePrivateClinicNavItems } from "@/lib/private-clinic-nav";
import {
  ensureDefaultConsultationTypes,
  ensureDefaultExpenseCategories,
  ensureTherapySettings,
} from "@/lib/therapy/bootstrap";

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

  let navItems = getVisiblePrivateClinicNavItems(null);
  if (householdId && !session?.user?.isSuperAdmin) {
    const settings = await prisma.therapy_settings.findUnique({
      where: { household_id: householdId },
      select: { nav_tabs_json: true },
    });
    navItems = getVisiblePrivateClinicNavItems(settings?.nav_tabs_json);
  }

  return (
    <div className="flex min-h-dvh justify-center bg-slate-950 px-3 py-6 sm:px-4 sm:py-10">
      <div className="w-full min-w-0 max-w-6xl space-y-4 sm:space-y-6">
        <header className="space-y-2 sm:space-y-3">
          <Link
            href="/"
            className="inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            Private clinic
          </h1>
          <p className="text-sm text-slate-400">
            Manage clients, sessions, receipts, and clinic expenses per employment job.
          </p>
          <nav
            className="-mx-1 flex gap-2 overflow-x-auto border-b border-slate-800 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap [&::-webkit-scrollbar]:hidden"
            aria-label="Private clinic sections"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 whitespace-nowrap rounded-lg bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 ring-1 ring-slate-700 hover:bg-slate-800"
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
