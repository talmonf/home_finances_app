import { prisma, getCurrentHouseholdId } from "@/lib/auth";
import { toggleSetupSectionDone } from "@/lib/setup-section-actions";
import type { SetupSectionId } from "@/lib/setup-section-ids";

type Props = {
  sectionId: SetupSectionId;
  redirectPath: string;
};

export async function SetupSectionMarkNotDoneBanner({
  sectionId,
  redirectPath,
}: Props) {
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return null;

  const row = await prisma.household_section_statuses.findUnique({
    where: {
      household_id_section_id: {
        household_id: householdId,
        section_id: sectionId,
      },
    },
  });

  if (!row?.is_done) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
      <p className="text-sm text-emerald-100/90">
        This setup is marked done on the home dashboard.
      </p>
      <form action={toggleSetupSectionDone}>
        <input type="hidden" name="section_id" value={sectionId} />
        <input type="hidden" name="next_is_done" value="false" />
        <input type="hidden" name="redirect_to" value={redirectPath} />
        <button
          type="submit"
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
        >
          Mark not done
        </button>
      </form>
    </div>
  );
}
