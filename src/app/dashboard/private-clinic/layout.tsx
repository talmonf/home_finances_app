import { getAuthSession } from "@/lib/auth";
import {
  ensureDefaultConsultationTypes,
  ensureDefaultExpenseCategories,
  ensureTherapySettings,
} from "@/lib/therapy/bootstrap";
import { PrivateClinicSectionNav } from "./private-clinic-section-nav";
import { PrivateClinicNavPendingProvider } from "./private-clinic-nav-pending-context";
import PrivateClinicUsageTracker from "./usage-tracker";

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
    <div className="flex min-h-dvh justify-center bg-slate-950 px-3 py-3 sm:px-5 sm:py-4 lg:px-8">
      <div className="w-full min-w-0 max-w-screen-2xl space-y-3 sm:space-y-4">
        <PrivateClinicNavPendingProvider>
          <PrivateClinicUsageTracker />
          <PrivateClinicSectionNav />
          {children}
        </PrivateClinicNavPendingProvider>
      </div>
    </div>
  );
}
