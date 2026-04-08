import { prisma, requireSuperAdmin } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-sections";
import { getHouseholdEnabledSections } from "@/lib/household-sections";
import { HOUSEHOLD_DATE_FORMAT_LABELS } from "@/lib/household-date-format";
import { mergePrivateClinicNavVisibility, PRIVATE_CLINIC_NAV_ITEMS } from "@/lib/private-clinic-nav";
import { UI_LANGUAGES, UI_LANGUAGE_LABELS } from "@/lib/ui-language";
import { saveHouseholdSettings } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string }>;
};

export default async function EditHouseholdPage({
  params,
  searchParams,
}: PageProps) {
  await requireSuperAdmin();

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

  const therapySettings = await prisma.therapy_settings.findUnique({
    where: { household_id: householdId },
    select: { nav_tabs_json: true },
  });
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
              Controls which links appear in the Private clinic navigation for this household (same as in-app{" "}
              <span className="text-slate-400">Private clinic → Settings</span>
              ). Saving this form updates both.
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

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              Save settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
