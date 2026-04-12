import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { createEntityUrl } from "@/lib/entity-urls/actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500";

export default async function NewInsurancePolicyLinkPage({ params }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const { id } = await params;

  const policy = await prisma.insurance_policies.findFirst({
    where: { id, household_id: householdId },
    select: { id: true, provider_name: true, policy_name: true },
  });

  if (!policy) {
    redirect("/dashboard/insurance-policies?error=Policy+not+found");
  }

  const detailPath = `/dashboard/insurance-policies/${id}`;

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <Link
            href={detailPath}
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה לעריכת הפוליסה →" : "← Back to policy"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">
            {isHebrew ? "הוספת קישור לפוליסה" : "Add link to policy"}
          </h1>
          <p className="text-sm text-slate-400">
            {policy.provider_name} — {policy.policy_name}
          </p>
        </header>

        <form action={createEntityUrl} className="grid gap-4">
          <input type="hidden" name="entity_kind" value="insurance_policy" />
          <input type="hidden" name="entity_id" value={id} />
          <input type="hidden" name="redirect_to" value={detailPath} />
          <div>
            <label htmlFor="url" className="mb-1 block text-xs font-medium text-slate-400">
              URL <span className="text-rose-400">*</span>
            </label>
            <input
              id="url"
              name="url"
              type="url"
              required
              placeholder="https://…"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="title" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "כותרת" : "Title"}
            </label>
            <input id="title" name="title" type="text" className={inputClass} placeholder={isHebrew ? "אופציונלי" : "Optional"} />
          </div>
          <div>
            <label htmlFor="sort_order" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "סדר" : "Order"}
            </label>
            <input
              id="sort_order"
              name="sort_order"
              type="number"
              min={0}
              defaultValue={0}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "הערות" : "Notes"}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className={inputClass}
              placeholder={isHebrew ? "אופציונלי" : "Optional"}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {isHebrew ? "שמירה" : "Save link"}
            </button>
            <Link
              href={detailPath}
              className="inline-flex items-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              {isHebrew ? "ביטול" : "Cancel"}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
