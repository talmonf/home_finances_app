import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { createTherapyFamily } from "../../actions";
import { therapyClientsWhereLinkedPrivateClinicJobs } from "@/lib/private-clinic/jobs-scope";

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/families";

export default async function NewFamilyPage() {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const t = (en: string, he: string) => (isHebrew ? he : en);

  const [settings, user] = await Promise.all([
    prisma.therapy_settings.findUnique({
      where: { household_id: householdId },
      select: { family_therapy_enabled: true },
    }),
    prisma.users.findFirst({
      where: { id: session.user.id, household_id: householdId, is_active: true },
      select: { family_member_id: true },
    }),
  ]);
  if (!settings?.family_therapy_enabled) redirect("/dashboard/private-clinic");
  const familyMemberId = user?.family_member_id ?? null;

  const clients = await prisma.therapy_clients.findMany({
    where: {
      household_id: householdId,
      is_active: true,
      ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
    },
    orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href={LIST} className="text-sm text-slate-400 hover:text-slate-200">
          {t("Back to Families", "חזרה לרשימת משפחות")}
        </Link>
        <h2 className="mt-2 text-lg font-medium text-slate-200">{t("Add Family", "הוספת משפחה")}</h2>
      </div>
      <form action={createTherapyFamily} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2">
        <input type="hidden" name="redirect_on_error" value={`${LIST}/new`} />
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs text-slate-400">{t("Family name", "שם משפחה")}</label>
          <input name="name" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs text-slate-400">{t("Existing clients (multi-select)", "לקוחות קיימים (בחירה מרובה)")}</label>
          <select multiple name="member_client_ids" className="h-48 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {[client.first_name, client.last_name ?? ""].join(" ").trim()}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs text-slate-400">{t("New family members (first names, one per line)", "חברי משפחה חדשים (שמות פרטיים, אחד בכל שורה)")}</label>
          <textarea
            name="new_member_first_names"
            className="min-h-[6rem] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">{t("Main family member", "חבר/ה מרכזי/ת")}</label>
          <select name="main_family_member_id" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">{t("Select member", "בחירת חבר/ה")}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {[client.first_name, client.last_name ?? ""].join(" ").trim()}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">{t("Billing basis", "בסיס חיוב")}</label>
          <select name="billing_basis" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">{t("Use client/default", "לפי לקוח/ברירת מחדל")}</option>
            <option value="per_treatment">{t("Per treatment", "לפי טיפול")}</option>
            <option value="per_month">{t("Per month", "לפי חודש")}</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">{t("Billing timing", "עיתוי חיוב")}</label>
          <select name="billing_timing" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">{t("Use client/default", "לפי לקוח/ברירת מחדל")}</option>
            <option value="in_advance">{t("In advance", "מראש")}</option>
            <option value="in_arrears">{t("In arrears", "בדיעבד")}</option>
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs text-slate-400">{t("Notes", "הערות")}</label>
          <textarea name="notes" className="min-h-[4rem] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
        </div>
        <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
          {t("Save Family", "שמירת משפחה")}
        </button>
      </form>
    </div>
  );
}
