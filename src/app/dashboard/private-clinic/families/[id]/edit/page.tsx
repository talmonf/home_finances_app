import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { deleteTherapyFamily, updateTherapyFamily } from "../../../actions";
import { therapyClientsWhereLinkedPrivateClinicJobs } from "@/lib/private-clinic/jobs-scope";
import { FamilyMembersFormSection, type FamilyMembersFormLabels, type InitialFamilyMemberRow } from "../../family-members-form-section";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import { DeleteFamilyForm } from "../../delete-family-form";

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/families";

function toDateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function EditFamilyPage({ params, searchParams }: Props) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const t = (en: string, he: string) => (isHebrew ? he : en);
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const errorKey = (resolvedSearchParams.error ?? "").trim();
  const errorMessage =
    errorKey === "members-have-treatments"
      ? t(
          "Cannot delete family members as clients because one or more members have associated treatments.",
          "לא ניתן למחוק את בני המשפחה כלקוחות כי לאחד או יותר מהם משויכים טיפולים.",
        )
      : null;

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

  const jobScope = jobWherePrivateClinicScoped(familyMemberId);
  const [family, clients, jobs] = await Promise.all([
    prisma.therapy_families.findFirst({
      where: { id, household_id: householdId },
      include: {
        members: { include: { client: true } },
      },
    }),
    prisma.therapy_clients.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
      },
      orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
    }),
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true, ...jobScope },
      orderBy: [{ start_date: "desc" }, { created_at: "desc" }],
      select: { id: true, job_title: true, employer_name: true },
    }),
  ]);
  if (!family) notFound();

  const initialRows: InitialFamilyMemberRow[] = family.members.map((m) => ({
    kind: "existing" as const,
    clientId: m.client_id,
    firstName: m.client.first_name,
    lastName: m.client.last_name ?? null,
    member_position: m.member_position ?? null,
  }));

  const mainSlotIndex = Math.max(
    0,
    family.members.findIndex((m) => m.client_id === family.main_family_member_id),
  );

  const memberLabels: FamilyMembersFormLabels = {
    sectionTitle: t("Family members", "בני משפחה"),
    addMember: t("Add member", "הוספת בן משפחה"),
    mainContact: t("Main contact", "איש קשר ראשי"),
    advancedTitle: t("Add existing clients", "הוספת בני משפחה מתוך לקוחות קיימים"),
    advancedHint: "",
    linkExistingLabel: t("Existing clients (multi-select)", "לקוחות קיימים (בחירה מרובה)"),
    modalTitleAdd: t("Add family member", "הוספת חבר/ת משפחה"),
    modalTitleEdit: t("Edit family member", "עריכת חבר/ת משפחה"),
    firstName: t("First name", "שם פרטי"),
    lastName: t("Last name", "שם משפחה"),
    familyPosition: t("Family position", "תפקיד במשפחה"),
    positionPlaceholder: t("Select…", "בחרי…"),
    filterByName: t("Filter by first or last name", "סינון לפי שם פרטי או משפחה"),
    selectClient: t("Select client", "בחירת לקוח"),
    father: t("Father", "אב"),
    mother: t("Mother", "אם"),
    son: t("Son", "בן"),
    daughter: t("Daughter", "בת"),
    save: t("Add", "הוספה"),
    saveEdit: t("Save", "שמירה"),
    cancel: t("Cancel", "ביטול"),
    emptyListHint: t("Add at least one family member using the button above.", "הוסיפו לפחות חבר/ת משפחה באמצעות הכפתור למעלה."),
    positionUnset: t("—", "—"),
    editMember: t("Edit", "עריכה"),
    removeMember: t("Remove", "הסרה"),
    removeMemberConfirm: t("Remove this family member from the family?", "להסיר את חבר/ת המשפחה מהרשימה?"),
    unsavedChangesConfirm: t("You have unsaved changes. Leave this page and lose them?", "יש שינויים שלא נשמרו. לצאת מהעמוד ולאבד אותם?"),
    nameColumn: t("Name", "שם"),
    positionColumn: t("Position", "תפקיד"),
    actionsColumn: t("Actions", "פעולות"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={LIST} className="text-sm text-slate-400 hover:text-slate-200">
            {t("Back to Families", "חזרה לרשימת משפחות")}
          </Link>
          <h2 className="mt-2 text-lg font-medium text-slate-200">{t("Edit Family", "עריכת משפחה")}</h2>
        </div>
        <DeleteFamilyForm
          action={deleteTherapyFamily}
          familyId={family.id}
          confirmTitle={t("Delete family: choose what to delete.", "מחיקת משפחה: בחרו מה למחוק.")}
          confirmDeleteFamilyOnly={t("Delete family only", "מחיקת משפחה בלבד")}
          confirmDeleteFamilyAndClients={t("Delete family and members", "מחיקת משפחה ובני המשפחה")}
          cancelLabel={t("Cancel", "ביטול")}
          buttonLabel={t("Delete Family", "מחיקת משפחה")}
          deletingLabel={t("Deleting family…", "מוחק משפחה…")}
        />
      </div>
      {errorMessage ? (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">{errorMessage}</p>
      ) : null}
      <form action={updateTherapyFamily} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2">
        <input type="hidden" name="id" value={family.id} />
        <input type="hidden" name="redirect_on_error" value={`${LIST}/${family.id}/edit`} />
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">{t("Family Name", "שם משפחה")}</label>
          <input
            name="name"
            required
            defaultValue={family.name}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">{t("Job", "משרה")}</label>
          <select
            name="default_job_id"
            defaultValue={family.default_job_id ?? ""}
            required
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{t("Select job", "בחירת משרה")}</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {formatJobDisplayLabel(job)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">{t("Start date", "תאריך התחלה")}</label>
          <input
            type="date"
            name="start_date"
            defaultValue={toDateInputValue(family.start_date ?? null)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">{t("End date", "תאריך סיום")}</label>
          <input
            type="date"
            name="end_date"
            defaultValue={toDateInputValue(family.end_date ?? null)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100"
          />
        </div>
        <div className="text-xs text-slate-500 md:col-span-2">
          {t(
            "Start date (if set) is also saved on each member’s client. End date is on the family only. End must be on or after start.",
            "תאריך התחלה (אם מוגדר) נשמר גם בכרטיס הלקוח של כל חבר. תאריך הסיום נשמר רק על המשפחה. תאריך הסיום חייב להיות לא מוקדם מתאריך ההתחלה.",
          )}
        </div>
        <FamilyMembersFormSection
          labels={memberLabels}
          linkableClients={clients.map((c) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name }))}
          initialRows={initialRows}
          initialMainSlotIndex={mainSlotIndex}
          isRtl={isHebrew}
          clientEditBasePath="/dashboard/private-clinic/clients"
          clientEditModalTitle={t("Edit Client", "עריכת לקוח")}
          closeLabel={t("Close", "סגירה")}
        />
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">{t("Billing basis", "בסיס חיוב")}</label>
          <select name="billing_basis" defaultValue={family.billing_basis ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
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
          <select name="billing_timing" defaultValue={family.billing_timing ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
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
          <textarea name="notes" defaultValue={family.notes ?? ""} className="min-h-[4rem] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
        </div>
        <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
          {t("Save Family", "שמירת משפחה")}
        </button>
      </form>
    </div>
  );
}
