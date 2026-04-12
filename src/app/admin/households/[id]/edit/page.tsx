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
import { saveHouseholdSettings } from "./actions";
import { createHouseholdUsefulLink, deleteHouseholdUsefulLink } from "@/lib/useful-links/admin-actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string; usefulSaved?: string; usefulError?: string }>;
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
        hebrew_transcription_provider: true,
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

  const enabledRows = await getHouseholdEnabledSections(householdId);
  const enabledBySectionId = new Map(
    enabledRows.map((r) => [r.sectionId, r.enabled] as const),
  );

  const isSectionEnabled = (id: string) => enabledBySectionId.get(id) ?? true;

  const setupSections = DASHBOARD_SECTIONS.filter((s) => s.group === "setup");
  const ongoingSections = DASHBOARD_SECTIONS.filter((s) => s.group === "ongoing");

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
              date format, home dashboard sections, and Private clinic tab bar.
            </p>
          </div>
          {resolvedSearchParams?.saved && (
            <div className="rounded-lg border border-emerald-600 bg-emerald-950/60 px-3 py-2 text-xs text-emerald-100">
              Settings saved.
            </div>
          )}
        </header>

        <form action={saveHouseholdSettings} className="space-y-8">
          <input type="hidden" name="household_id" value={household.id} />

          <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              Interface language
            </h2>
            <select
              name="ui_language"
              defaultValue={household.ui_language ?? "en"}
              className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {UI_LANGUAGES.map((value) => (
                <option key={value} value={value}>
                  {UI_LANGUAGE_LABELS[value]}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              Links (URL) panels on entity pages
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              When enabled, pages such as insurance policies, savings policies, and
              clinic insurance show a &quot;Links&quot; section for attaching URLs to
              each record. Disable this to hide those panels for this household.
            </p>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="show_entity_url_panels"
                defaultChecked={household.show_entity_url_panels ?? true}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-300">
                Show per-record Links (URL) panels
              </span>
            </label>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              Date display format
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Used for dates in lists and tables for this household&apos;s users.
            </p>
            <select
              name="date_display_format"
              defaultValue={household.date_display_format}
              className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {(["YMD", "DMY", "MDY"] as const).map((value) => (
                <option key={value} value={value}>
                  {HOUSEHOLD_DATE_FORMAT_LABELS[value]}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              Enabled sections
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Uncheck to hide a section from the household&apos;s home dashboard. Users
              won&apos;t see disabled areas in the nav.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Setup
                </h3>
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

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ongoing & tools
                </h3>
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
          </section>

          <section
            id="private-clinic-tabs"
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          >
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              Private clinic tabs
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Controls which links appear in the Private clinic navigation for this household (household users cannot
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
                    defaultChecked={privateClinicNavVisibility[item.key]}
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
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              Private clinic — Hebrew audio transcription
            </h2>
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
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              Private clinic — treatment note labels
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              English label is the canonical title; Hebrew is shown when the household UI language is Hebrew.
            </p>
            <div className="grid max-w-2xl gap-4">
              {(
                [
                  {
                    n: 1,
                    en: "note_1_label",
                    he: "note_1_label_he",
                    enDef: therapySettings?.note_1_label ?? "Note 1",
                    heDef: therapySettings?.note_1_label_he ?? "",
                  },
                  {
                    n: 2,
                    en: "note_2_label",
                    he: "note_2_label_he",
                    enDef: therapySettings?.note_2_label ?? "Note 2",
                    heDef: therapySettings?.note_2_label_he ?? "",
                  },
                  {
                    n: 3,
                    en: "note_3_label",
                    he: "note_3_label_he",
                    enDef: therapySettings?.note_3_label ?? "Note 3",
                    heDef: therapySettings?.note_3_label_he ?? "",
                  },
                ] as const
              ).map((row) => (
                <div
                  key={row.en}
                  className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-2"
                >
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Note {row.n} — English</label>
                    <input
                      name={row.en}
                      defaultValue={row.enDef}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Note {row.n} — Hebrew (optional)</label>
                    <input
                      name={row.he}
                      defaultValue={row.heDef}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              Save settings
            </button>
          </div>
        </form>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">
            Private clinic — consultation / meeting types
          </h2>
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
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Private clinic — expense categories</h2>
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
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
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
      </div>
    </div>
  );
}
