import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { createTherapyFamily } from "../../actions";
import { therapyClientsWhereLinkedPrivateClinicJobs } from "@/lib/private-clinic/jobs-scope";
import { FamilyMembersFormSection, type FamilyMembersFormLabels } from "../family-members-form-section";

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

  const memberLabels: FamilyMembersFormLabels = {
    sectionTitle: t("Family members", "חברי משפחה"),
    addMember: t("Add member", "הוספת חבר/ה"),
    mainContact: t("Main contact", "איש קשר ראשי"),
    advancedTitle: t("Advanced: link existing clients", "מתקדם: קישור לקוחות קיימים"),
    advancedHint: t(
      "Rarely needed if you create clients from this screen. Selected clients are added to the family list.",
      "לרוב לא נדרש אם יוצרים כאן לקוחות חדשים. לקוחות נבחרים יתווספו לרשימת המשפחה.",
    ),
    linkExistingLabel: t("Existing clients (multi-select)", "לקוחות קיימים (בחירה מרובה)"),
    modalTitle: t("Add family member", "הוספת חבר/ת משפחה"),
    firstName: t("First name", "שם פרטי"),
    familyPosition: t("Family position", "תפקיד במשפחה"),
    father: t("Father", "אב"),
    mother: t("Mother", "אם"),
    son: t("Son", "בן"),
    daughter: t("Daughter", "בת"),
    save: t("Add", "הוספה"),
    cancel: t("Cancel", "ביטול"),
    emptyListHint: t("Add at least one family member using the button above.", "הוסיפו לפחות חבר/ת משפחה באמצעות הכפתור למעלה."),
    positionUnset: t("—", "—"),
  };

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
        <FamilyMembersFormSection
          labels={memberLabels}
          linkableClients={clients.map((c) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name }))}
          initialRows={[]}
          initialMainSlotIndex={0}
        />
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">{t("Billing basis", "בסיס חיוב")}</label>
          <select name="billing_basis" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">
              {t("Not set — use each member’s client billing", "לא מוגדר — לפי הגדרות החיוב של כל חבר משפחה בכרטיס הלקוח")}
            </option>
            <option value="per_treatment">{t("Per treatment", "לפי טיפול")}</option>
            <option value="per_month">{t("Per month", "לפי חודש")}</option>
          </select>
          <p className="text-xs text-slate-500">
            {t(
              "If you choose an option here, it is stored on the family. Leave blank so each member keeps their own billing basis on the client record (the client form’s “Use family/default” then refers to this family only when you set it).",
              "אם תבחרו כאן ערך, הוא נשמר על המשפחה. השאירו ריק כדי שכל חבר ישמור את בסיס החיוב שלו בכרטיס הלקוח (בטופס הלקוח, \"לפי משפחה/ברירת מחדל\" מתייחס למשפחה רק כשיש כאן ערך).",
            )}
          </p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">{t("Billing timing", "עיתוי חיוב")}</label>
          <select name="billing_timing" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">
              {t("Not set — use each member’s client billing timing", "לא מוגדר — לפי עיתוי החיוב של כל חבר בכרטיס הלקוח")}
            </option>
            <option value="in_advance">{t("In advance", "מראש")}</option>
            <option value="in_arrears">{t("In arrears", "בדיעבד")}</option>
          </select>
          <p className="text-xs text-slate-500">
            {t(
              "Same as billing basis: set a family-wide timing here, or leave blank to follow each client’s own setting.",
              "כמו בסיס חיוב: עיתוי ברמת המשפחה, או השארת ריק לפי הגדרת כל לקוח.",
            )}
          </p>
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
