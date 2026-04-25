import { getAuthSession, prisma } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-sections";
import { getHouseholdEnabledSections } from "@/lib/household-sections";
import { HOUSEHOLD_DATE_FORMAT_LABELS } from "@/lib/household-date-format";
import { mergePrivateClinicNavVisibility, PRIVATE_CLINIC_NAV_ITEMS } from "@/lib/private-clinic-nav";
import { UI_LANGUAGES, UI_LANGUAGE_LABELS } from "@/lib/ui-language";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import {
  createTherapyConsultationType,
  createTherapyExpenseCategory,
  deleteTherapyConsultationType,
  deleteTherapyExpenseCategory,
  updateTherapyConsultationType,
  updateTherapyExpenseCategory,
} from "@/app/dashboard/private-clinic/actions";
import {
  ensureDefaultConsultationTypes,
  ensureDefaultExpenseCategories,
  ensureTherapySettings,
} from "@/lib/therapy/bootstrap";
import {
  deleteHousehold,
  getHouseholdDeleteImpactRows,
  saveHouseholdSettings,
} from "./actions";
import {
  HOME_FREQUENT_LINK_ADMIN_LABELS,
  HOME_FREQUENT_LINK_KEYS,
  homeFrequentLinksApplyToVisibleDashboard,
  parseHomeFrequentLinksJson,
} from "@/lib/home-frequent-links";
import { createHouseholdUsefulLink, deleteHouseholdUsefulLink } from "@/lib/useful-links/admin-actions";
import {
  HouseholdPrivateClinicOnlyButton,
  HouseholdSectionGroupActions,
} from "@/components/household-dashboard-section-controls";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    saved?: string;
    usefulSaved?: string;
    usefulError?: string;
    deleteError?: string;
    tab?: string;
  }>;
};

export default async function EditHouseholdPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    redirect("/");
  }

  const resolvedParams = await params;
  if (!resolvedParams?.id) notFound();

  const householdId = resolvedParams.id;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const household = await prisma.households.findUnique({
    where: { id: householdId },
  });

  if (!household) {
    notFound();
  }

  await ensureTherapySettings(householdId);
  await ensureDefaultExpenseCategories(householdId);
  await ensureDefaultConsultationTypes(householdId);

  const [therapySettings, consultationTypes, expenseCategories, householdUsefulLinks] = await Promise.all([
    prisma.therapy_settings.findUnique({
      where: { household_id: householdId },
      select: {
        nav_tabs_json: true,
        note_1_label: true,
        note_2_label: true,
        note_3_label: true,
        note_1_label_he: true,
        note_2_label_he: true,
        note_3_label_he: true,
        note_1_visible: true,
        note_2_visible: true,
        note_3_visible: true,
        hebrew_transcription_provider: true,
        family_therapy_enabled: true,
      },
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_expense_categories.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.useful_links.findMany({
      where: { scope: "household", household_id: householdId, is_active: true },
      orderBy: [{ section_id: "asc" }, { sort_order: "asc" }, { created_at: "asc" }],
    }),
  ]);
  const privateClinicNavVisibility = mergePrivateClinicNavVisibility(therapySettings?.nav_tabs_json);
  const familyTherapyEnabled = therapySettings?.family_therapy_enabled ?? false;
  const frequentLinkToggles = parseHomeFrequentLinksJson(household.home_frequent_links_json);

  const enabledRows = await getHouseholdEnabledSections(householdId);
  const enabledBySectionId = new Map(
    enabledRows.map((r) => [r.sectionId, r.enabled] as const),
  );

  const isSectionEnabled = (id: string) => enabledBySectionId.get(id) ?? true;
  const visibleSections = DASHBOARD_SECTIONS.filter((s) => isSectionEnabled(s.id));
  const isClinicOnlyHousehold =
    visibleSections.length === 1 && visibleSections[0]?.id === "privateClinic";
  const householdDeleteImpactRows = await getHouseholdDeleteImpactRows(householdId);

  const setupSections = DASHBOARD_SECTIONS.filter((s) => s.group === "setup");
  const ongoingSections = DASHBOARD_SECTIONS.filter((s) => s.group === "ongoing");

  const householdVisibleDashboardSections = DASHBOARD_SECTIONS.filter((s) => isSectionEnabled(s.id));
  const showHomeFrequentLinksSettings =
    homeFrequentLinksApplyToVisibleDashboard(householdVisibleDashboardSections);
  const rawTab = resolvedSearchParams?.tab;
  const activeTab =
    rawTab === "diagnostics" ||
    rawTab === "links" ||
    rawTab === "danger"
      ? rawTab
      : "settings";

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-3xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <Link
              href="/admin/households"
              className="hover:text-slate-200"
            >
              ← Households
            </Link>
            <span className="text-slate-600">·</span>
            <Link
              href={`/admin/households/${householdId}`}
              className="hover:text-slate-200"
            >
              Manage users
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">
              Edit household
            </h1>
            <p className="text-sm text-slate-400">
              <span className="font-semibold text-slate-100">{household.name}</span>
              {" — "}
              date format, home dashboard sections, and Clinic tab bar.
            </p>
          </div>
          {resolvedSearchParams?.saved && (
            <div className="rounded-lg border border-emerald-600 bg-emerald-950/60 px-3 py-2 text-xs text-emerald-100">
              Settings saved.
            </div>
          )}
          {resolvedSearchParams?.deleteError === "privateClinicLegalBlock" ? (
            <div className="rounded-lg border border-amber-600 bg-amber-950/60 px-3 py-2 text-xs text-amber-100">
              This household cannot be deleted due to legal requirements: it has Clinic appointments.
              In the future, deletion will be supported after saving a therapist journal (יומן מטפל) for later access.
            </div>
          ) : null}
          {resolvedSearchParams?.deleteError === "foreignKey" ? (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              Household deletion failed due to related data constraints. Review linked records and try again.
            </div>
          ) : null}
          {resolvedSearchParams?.deleteError === "unknown" ? (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              Household deletion failed due to an unexpected error. Please try again.
            </div>
          ) : null}
        </header>

        <nav className="flex flex-wrap gap-2" aria-label="Edit household sections">
          <Link
            href={`/admin/households/${householdId}/edit?tab=settings`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              activeTab === "settings"
                ? "border-sky-500 bg-sky-500/10 text-sky-300"
                : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-sky-500 hover:text-sky-300"
            }`}
          >
            Settings
          </Link>
          <Link
            href={`/admin/households/${householdId}/edit?tab=diagnostics`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              activeTab === "diagnostics"
                ? "border-sky-500 bg-sky-500/10 text-sky-300"
                : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-sky-500 hover:text-sky-300"
            }`}
          >
            Diagnostics
          </Link>
          <Link
            href={`/admin/households/${householdId}/edit?tab=links`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              activeTab === "links"
                ? "border-sky-500 bg-sky-500/10 text-sky-300"
                : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-sky-500 hover:text-sky-300"
            }`}
          >
            Useful links
          </Link>
          <Link
            href={`/admin/households/${householdId}/edit?tab=danger`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              activeTab === "danger"
                ? "border-rose-500 bg-rose-500/10 text-rose-300"
                : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-rose-500 hover:text-rose-300"
            }`}
          >
            Danger zone
          </Link>
        </nav>

        {activeTab === "diagnostics" ? (
        <section id="household-diagnostics" className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-200">Diagnostics</h2>
          <p className="mb-3 text-xs text-slate-400">
            Run household-specific diagnostics without copying URLs.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/api/admin/storage/cors-diagnostic"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
            >
              Storage diagnostics
            </Link>
            <Link
              href={`/api/admin/transcription/diagnostic?household_id=${householdId}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
            >
              Transcription diagnostics (this household)
            </Link>
          </div>
        </section>
        ) : null}

        {activeTab === "settings" ? (
        <>
        <div className="flex flex-col gap-4">
        <form id="household-settings" action={saveHouseholdSettings} className="flex flex-col gap-4">
          <input type="hidden" name="household_id" value={household.id} />
          <input type="hidden" name="tab" value="settings" />

          <input type="hidden" name="household_general_settings_present" value="1" />
          <details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">
              General
            </summary>
            <div className="mt-3 grid max-w-2xl gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Interface language</label>
                <select
                  name="ui_language"
                  defaultValue={household.ui_language ?? "en"}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  {UI_LANGUAGES.map((value) => (
                    <option key={value} value={value}>
                      {UI_LANGUAGE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Date display format</label>
                <select
                  name="date_display_format"
                  defaultValue={household.date_display_format}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  {(["YMD", "DMY", "MDY"] as const).map((value) => (
                    <option key={value} value={value}>
                      {HOUSEHOLD_DATE_FORMAT_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!isClinicOnlyHousehold ? (
              <div className="mt-4 border-t border-slate-800 pt-4">
                <p className="mb-3 text-xs text-slate-500">
                  When enabled, pages such as insurance policies and savings policies show a
                  &quot;Links&quot; section for attaching URLs to each record.
                </p>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="show_entity_url_panels"
                    defaultChecked={household.show_entity_url_panels ?? true}
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-300">
                    Show Links (URL) panels on entity pages
                  </span>
                </label>
              </div>
            ) : null}
          </details>

          {!isClinicOnlyHousehold ? (
            <>
              {showHomeFrequentLinksSettings ? (
                <details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                    Home dashboard — frequent links
                  </summary>
                  <div className="mt-3">
                    <p className="mb-4 text-xs text-slate-500">
                      Shortcuts at the top of the household home screen. Each can be hidden independently.
                      Links to Clinic or Upcoming renewals only appear when that section is enabled
                      for the household.
                    </p>
                    <input type="hidden" name="home_frequent_links_form" value="1" />
                    <ul className="space-y-2">
                      {HOME_FREQUENT_LINK_KEYS.map((key) => (
                        <li
                          key={key}
                          className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            id={`hf_${key}`}
                            name={`hf_${key}`}
                            defaultChecked={frequentLinkToggles[key]}
                            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                          />
                          <label htmlFor={`hf_${key}`} className="cursor-pointer text-sm text-slate-200">
                            {HOME_FREQUENT_LINK_ADMIN_LABELS[key]}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              ) : null}

              <details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <input type="hidden" name="household_section_overrides_present" value="1" />
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">Enabled sections</summary>
                <div className="mt-3">
                  <p className="mb-4 text-xs text-slate-500">
                    Uncheck to hide a section from the household&apos;s home dashboard. Users
                    won&apos;t see disabled areas in the nav.
                  </p>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-500">Quick preset:</span>
                    <HouseholdPrivateClinicOnlyButton />
                    <span className="text-[11px] text-slate-600">
                      (only &quot;Clinic&quot; on; save to apply)
                    </span>
                  </div>

                  <div id="household-enabled-dashboard-sections" className="space-y-6">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Setup
                      </h3>
                      <HouseholdSectionGroupActions containerId="household-enabled-setup" />
                    </div>
                    <div id="household-enabled-setup">
                    <ul className="space-y-2">
                      {setupSections.map((section) => (
                        <li
                          key={section.id}
                          className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            id={`section_${section.id}`}
                            name={`section_${section.id}`}
                            defaultChecked={isSectionEnabled(section.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                          />
                          <label
                            htmlFor={`section_${section.id}`}
                            className="flex-1 cursor-pointer text-sm text-slate-200"
                          >
                            <span className="font-medium">{section.title}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {section.description}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ongoing & tools
                      </h3>
                      <HouseholdSectionGroupActions containerId="household-enabled-ongoing" />
                    </div>
                    <div id="household-enabled-ongoing">
                    <ul className="space-y-2">
                      {ongoingSections.map((section) => (
                        <li
                          key={section.id}
                          className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            id={`section_${section.id}`}
                            name={`section_${section.id}`}
                            defaultChecked={isSectionEnabled(section.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                          />
                          <label
                            htmlFor={`section_${section.id}`}
                            className="flex-1 cursor-pointer text-sm text-slate-200"
                          >
                            <span className="font-medium">{section.title}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {section.description}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    </div>
                  </div>
                </div>
                </div>
              </details>
            </>
          ) : null}

          <details
            id="private-clinic-tabs"
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">Clinic tabs</summary>
            <div className="mt-3">
              <p className="mb-4 text-xs text-slate-500">
                Controls which links appear in the Clinic navigation for this household (household users cannot
                change this in the app).
              </p>
              <ul className="space-y-2">
              {PRIVATE_CLINIC_NAV_ITEMS.map((item) => (
                <li
                  key={item.key}
                  className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    id={`pc_nav_${item.key}`}
                    name={`pc_nav_${item.key}`}
                    defaultChecked={
                      item.key === "families"
                        ? familyTherapyEnabled && privateClinicNavVisibility[item.key]
                        : privateClinicNavVisibility[item.key]
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                  />
                  <label
                    htmlFor={`pc_nav_${item.key}`}
                    className="flex-1 cursor-pointer text-sm text-slate-200"
                  >
                    {item.label}
                  </label>
                </li>
              ))}
              </ul>
            </div>
          </details>

          <details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">
              Clinic — family therapy
            </summary>
            <div className="mt-3">
              <p className="mb-3 text-xs text-slate-500">
                Enables family records and family filters/columns across clinic pages.
              </p>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="family_therapy_enabled"
                  defaultChecked={therapySettings?.family_therapy_enabled ?? false}
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-300">Enable family therapy mode</span>
              </label>
            </div>
          </details>

          <details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">
              Clinic — Hebrew audio transcription
            </summary>
            <div className="mt-3">
              <p className="mb-3 text-xs text-slate-500">
                When users transcribe audio with the Hebrew option, choose whether to use OpenRouter (Whisper via your
                OpenRouter key) or Amazon Transcribe (requires{" "}
                <code className="rounded bg-slate-800 px-1 text-slate-300">TRANSCRIBE_DATA_ACCESS_ROLE_ARN</code> in
                deployment env). English transcription is unchanged.
              </p>
              <label className="mb-1 block text-xs text-slate-500">Hebrew transcription backend</label>
              <select
                name="hebrew_transcription_provider"
                defaultValue={therapySettings?.hebrew_transcription_provider ?? "openrouter"}
                className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="openrouter">OpenRouter (Whisper)</option>
                <option value="aws">Amazon Transcribe (batch, S3)</option>
              </select>
            </div>
          </details>

          <details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">
              Clinic — treatment note labels
            </summary>
            <div className="mt-3 grid max-w-2xl gap-4">
              <p className="text-xs text-slate-500">
                English label is the canonical title; Hebrew is shown when the household UI language is Hebrew.
              </p>
              {(
                [
                  {
                    n: 1,
                    en: "note_1_label",
                    he: "note_1_label_he",
                    visible: "note_1_visible",
                    enDef: therapySettings?.note_1_label ?? "Note 1",
                    heDef: therapySettings?.note_1_label_he ?? "",
                    visibleDef: therapySettings?.note_1_visible ?? true,
                  },
                  {
                    n: 2,
                    en: "note_2_label",
                    he: "note_2_label_he",
                    visible: "note_2_visible",
                    enDef: therapySettings?.note_2_label ?? "Note 2",
                    heDef: therapySettings?.note_2_label_he ?? "",
                    visibleDef: therapySettings?.note_2_visible ?? true,
                  },
                  {
                    n: 3,
                    en: "note_3_label",
                    he: "note_3_label_he",
                    visible: "note_3_visible",
                    enDef: therapySettings?.note_3_label ?? "Note 3",
                    heDef: therapySettings?.note_3_label_he ?? "",
                    visibleDef: therapySettings?.note_3_visible ?? true,
                  },
                ] as const
              ).map((row) => (
                <fieldset
                  key={row.en}
                  className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Note {row.n}
                    </p>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                      <input
                        type="checkbox"
                        name={row.visible}
                        defaultChecked={row.visibleDef}
                        className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-sky-500"
                      />
                      Show Note {row.n} on treatment form
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Note {row.n} — English</label>
                      <input
                        name={row.en}
                        defaultValue={row.enDef}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Note {row.n} — Hebrew (optional)</label>
                      <input
                        name={row.he}
                        defaultValue={row.heDef}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                      />
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>
          </details>

        </form>
          <details id="clinic-taxonomies" className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">
              Clinic — consultation / meeting types
            </summary>
            <div className="mt-3">
              <p className="mb-3 text-xs text-slate-500">
                English label is the canonical identifier (exports, imports). Hebrew is shown when the household UI language
                is Hebrew.
              </p>
              <ul className="mb-4 space-y-2 text-sm">
                {consultationTypes.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                  >
                    <form action={updateTherapyConsultationType} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="household_id" value={householdId} />
                      <input type="hidden" name="id" value={row.id} />
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">English</label>
                        <input
                          name="name"
                          defaultValue={row.name}
                          required
                          className="w-48 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Hebrew</label>
                        <input
                          name="name_he"
                          defaultValue={row.name_he ?? ""}
                          className="w-48 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-600"
                      >
                        Save
                      </button>
                    </form>
                    {row.is_system ? (
                      <span className="text-xs text-slate-600">(default)</span>
                    ) : (
                      <ConfirmDeleteForm action={deleteTherapyConsultationType} className="inline">
                        <input type="hidden" name="household_id" value={householdId} />
                        <input type="hidden" name="id" value={row.id} />
                        <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                          Remove
                        </button>
                      </ConfirmDeleteForm>
                    )}
                  </li>
                ))}
              </ul>
              <form action={createTherapyConsultationType} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="household_id" value={householdId} />
                <input
                  name="name"
                  placeholder="New type (English)"
                  required
                  className="w-48 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="name_he"
                  placeholder="Hebrew (optional)"
                  className="w-48 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
                >
                  Add type
                </button>
              </form>
            </div>
          </details>

          <details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">
              Clinic — expense categories
            </summary>
            <div className="mt-3">
              <p className="mb-3 text-xs text-slate-500">
                English label is canonical. Hebrew is shown when the household UI language is Hebrew.
              </p>
              <ul className="mb-4 space-y-2 text-sm">
                {expenseCategories.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                  >
                    <form action={updateTherapyExpenseCategory} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="household_id" value={householdId} />
                      <input type="hidden" name="id" value={row.id} />
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">English</label>
                        <input
                          name="name"
                          defaultValue={row.name}
                          required
                          className="w-48 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Hebrew</label>
                        <input
                          name="name_he"
                          defaultValue={row.name_he ?? ""}
                          className="w-48 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-600"
                      >
                        Save
                      </button>
                    </form>
                    {row.is_system ? (
                      <span className="text-xs text-slate-600">(default)</span>
                    ) : (
                      <ConfirmDeleteForm action={deleteTherapyExpenseCategory} className="inline">
                        <input type="hidden" name="household_id" value={householdId} />
                        <input type="hidden" name="id" value={row.id} />
                        <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                          Remove
                        </button>
                      </ConfirmDeleteForm>
                    )}
                  </li>
                ))}
              </ul>
              <form action={createTherapyExpenseCategory} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="household_id" value={householdId} />
                <input
                  name="name"
                  placeholder="New category (English)"
                  required
                  className="w-48 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="name_he"
                  placeholder="Hebrew (optional)"
                  className="w-48 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
                >
                  Add category
                </button>
              </form>
            </div>
          </details>
          <div className="flex justify-end">
            <button
              type="submit"
              form="household-settings"
              className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              Save settings (all expanded/collapsed sections above)
            </button>
          </div>
        </div>
        </>
        ) : null}

        {activeTab === "links" ? (
        <section id="household-useful-links" className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Household useful links</h2>
          <p className="mb-3 text-xs text-slate-500">
            Shown to members of this household on matching dashboard sections (when the section is enabled for them).
            System-wide links are managed under{" "}
            <Link href="/admin/useful-links" className="text-sky-400 hover:text-sky-300">
              System useful links
            </Link>
            .
          </p>
          {resolvedSearchParams?.usefulSaved === "1" ? (
            <div className="mb-3 rounded-lg border border-emerald-600 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
              Useful links updated.
            </div>
          ) : null}
          {resolvedSearchParams?.usefulError === "section" ? (
            <div className="mb-3 rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              Choose a valid section.
            </div>
          ) : null}
          {resolvedSearchParams?.usefulError === "url" ? (
            <div className="mb-3 rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              Enter a valid http(s) URL.
            </div>
          ) : null}
          {householdUsefulLinks.length === 0 ? (
            <p className="mb-3 text-sm text-slate-500">No household-specific links yet.</p>
          ) : (
            <ul className="mb-4 space-y-2 text-sm">
              {householdUsefulLinks.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500">{l.section_id}</div>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sky-400 hover:text-sky-300"
                    >
                      {l.title?.trim() || l.url}
                    </a>
                    {l.title?.trim() ? (
                      <div className="break-all text-xs text-slate-500">{l.url}</div>
                    ) : null}
                  </div>
                  <form action={deleteHouseholdUsefulLink}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="household_id" value={householdId} />
                    <input type="hidden" name="tab" value="links" />
                    <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={createHouseholdUsefulLink} className="grid gap-2 border-t border-slate-800 pt-3 sm:grid-cols-2">
            <input type="hidden" name="household_id" value={householdId} />
            <input type="hidden" name="tab" value="links" />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Dashboard section</label>
              <select
                name="section_id"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                {DASHBOARD_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">URL *</label>
              <input
                name="url"
                type="url"
                required
                placeholder="https://…"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Title</label>
              <input
                name="title"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Sort order</label>
              <input
                name="sort_order"
                type="number"
                min={0}
                defaultValue={0}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Notes</label>
              <input
                name="notes"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Add household link
              </button>
            </div>
          </form>
        </section>
        ) : null}

        {activeTab === "danger" ? (
        <section id="danger-zone" className="rounded-xl border border-rose-700/70 bg-rose-950/20 p-4">
          <h2 className="mb-2 text-sm font-semibold text-rose-200">Danger zone — delete household</h2>
          <p className="mb-3 text-xs text-rose-100/80">
            Deleting a household is permanent and cannot be undone. All related records listed below will be deleted.
          </p>
          <ul className="mb-4 space-y-2 rounded-lg border border-rose-900/70 bg-slate-950/50 p-3 text-xs text-slate-200">
            {householdDeleteImpactRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3">
                <span>{row.label}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-100">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
          <p className="mb-4 text-xs text-amber-100/90">
            Legal guardrail: if this household has the Clinic feature and any appointments, deletion is blocked.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/households"
              className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </Link>
            <ConfirmDeleteForm
              action={deleteHousehold}
              className="inline"
              message={`Delete household "${household.name}" permanently?\n\nThis deletes all related data shown above and cannot be undone.\n\nDeletion is blocked if Clinic appointments exist due to legal requirements.`}
            >
              <input type="hidden" name="household_id" value={householdId} />
              <input type="hidden" name="tab" value="danger" />
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Delete household permanently
              </button>
            </ConfirmDeleteForm>
          </div>
        </section>
        ) : null}
      </div>
    </div>
  );
}
