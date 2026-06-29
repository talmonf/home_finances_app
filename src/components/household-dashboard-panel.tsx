"use client";

import Link from "next/link";
import { LoadingSpinner } from "@/components/loading-spinner";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { SectionId } from "@/lib/dashboard-sections";
import type { UiLanguage } from "@/lib/ui-language";
import { dashboardHomeStrings } from "@/lib/ui-language";
import { toggleSetupSectionDone } from "@/lib/setup-section-actions";
import { SetupHouseholdCollapsible } from "@/components/setup-household-collapsible";
import type { HomeFrequentLinkItem } from "@/lib/home-frequent-links";
import { homeFrequentLinkToClinicFeature } from "@/lib/usage-audit/catalog";
import { postPrivateClinicUsageVisit } from "@/lib/usage-audit/track-client";

export type DashboardSetupTileProps = {
  id: SectionId;
  title: string;
  description: string;
  href: string;
  count: number | null;
  countSuffix: string | undefined;
  isDone: boolean;
};

export type DashboardOngoingTileProps = {
  id: SectionId;
  title: string;
  description: string;
  href: string;
  reimbursementNote: string | null;
};

type HouseholdDashboardPanelProps = {
  uiLanguage: UiLanguage;
  welcomeTitle: string;
  welcomeTitleMobile: string;
  welcomeSubtitle: string;
  frequentLinksTitle: string;
  frequentLinks: HomeFrequentLinkItem[];
  hasAnyTiles: boolean;
  setupTiles: DashboardSetupTileProps[];
  ongoingTiles: DashboardOngoingTileProps[];
};

function matchesSearch(queryLower: string, title: string, description: string) {
  if (!queryLower) return true;
  const haystack = `${title} ${description}`.toLowerCase();
  return haystack.includes(queryLower);
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function normalizeHrefPath(href: string): string {
  // `usePathname()` omits querystring/hash, so we normalize the link target down to its path.
  const pathOnly = href.split("?")[0]?.split("#")[0] ?? href;
  return normalizePathname(pathOnly);
}

const FREQUENT_LINK_BUTTON_CLASSES: Record<HomeFrequentLinkItem["key"], string> = {
  privateClinic:
    "border-cyan-400/50 bg-gradient-to-r from-cyan-500/25 via-sky-500/20 to-blue-500/25 hover:border-cyan-300/70",
  reportTreatment:
    "border-rose-400/50 bg-gradient-to-r from-rose-500/25 via-pink-500/20 to-fuchsia-500/25 hover:border-rose-300/70",
  reportReceipt:
    "border-emerald-400/50 bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-cyan-500/25 hover:border-emerald-300/70",
  upcomingVisits:
    "border-violet-400/50 bg-gradient-to-r from-violet-500/25 via-indigo-500/20 to-blue-500/25 hover:border-violet-300/70",
  upcomingAppointments:
    "border-amber-400/50 bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-rose-500/25 hover:border-amber-300/70",
  upcomingRenewals:
    "border-lime-400/50 bg-gradient-to-r from-lime-500/25 via-emerald-500/20 to-teal-500/25 hover:border-lime-300/70",
  riseUpImport:
    "border-sky-400/50 bg-gradient-to-r from-sky-500/25 via-cyan-500/20 to-blue-500/25 hover:border-sky-300/70",
};

export function HouseholdDashboardPanel({
  uiLanguage,
  welcomeTitle,
  welcomeTitleMobile,
  welcomeSubtitle,
  frequentLinksTitle,
  frequentLinks,
  hasAnyTiles,
  setupTiles,
  ongoingTiles,
}: HouseholdDashboardPanelProps) {
  const copy = dashboardHomeStrings(uiLanguage);
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPathname = useMemo(
    () => normalizePathname(pathname ?? ""),
    [pathname],
  );
  const [query, setQuery] = useState("");
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const queryLower = query.trim().toLowerCase();

  const filteredSetup = useMemo(
    () => setupTiles.filter((t) => matchesSearch(queryLower, t.title, t.description)),
    [setupTiles, queryLower],
  );

  const filteredOngoing = useMemo(
    () => ongoingTiles.filter((t) => matchesSearch(queryLower, t.title, t.description)),
    [ongoingTiles, queryLower],
  );

  const filteredEmpty = filteredSetup.length === 0 && filteredOngoing.length === 0;

  const emptyMessage =
    !hasAnyTiles && !queryLower ? copy.noSectionsEnabled : copy.noSearchMatches;

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">
            <span className="md:hidden">{welcomeTitleMobile}</span>
            <span className="hidden md:inline">{welcomeTitle}</span>
          </h1>
          <p className="hidden text-sm text-slate-400 md:block">{welcomeSubtitle}</p>
        </div>
        <div className="w-full max-w-[220px] shrink-0">
          <label htmlFor="dashboard-search" className="mb-1 block text-xs text-slate-400">
            {copy.searchTilesLabel}
          </label>
          <input
            id="dashboard-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>
      </div>

      {frequentLinks.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">{frequentLinksTitle}</h2>
          <div className="flex flex-wrap gap-2">
            {frequentLinks.map((link) => {
              const normalizedHref = normalizeHrefPath(link.href);
              const isActive = normalizedPathname === normalizedHref;
              const isPending = pendingHref === normalizedHref && !isActive;

              return (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-busy={isPending}
                  onClick={(event) => {
                    if (
                      isActive ||
                      isPending ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey ||
                      event.button !== 0
                    ) {
                      return;
                    }

                    // Allow the UI to show a loader immediately before navigation.
                    event.preventDefault();
                    const clinicFeature = homeFrequentLinkToClinicFeature(link.key);
                    if (clinicFeature) {
                      postPrivateClinicUsageVisit(clinicFeature, normalizedHref, {
                        from: "home_frequent_link",
                      });
                    }
                    setPendingHref(normalizedHref);
                    startTransition(() => {
                      router.push(link.href);
                    });
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-50 shadow-sm shadow-slate-950/40 transition hover:-translate-y-0.5 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 ${FREQUENT_LINK_BUTTON_CLASSES[link.key]}`}
                >
                  {isPending ? <LoadingSpinner /> : null}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <div>
        {filteredEmpty ? (
          <p className="text-sm text-slate-400">{emptyMessage}</p>
        ) : (
          <>
            {filteredSetup.length > 0 && (
              <SetupHouseholdCollapsible expandWhen={Boolean(queryLower)} title={copy.setupHousehold}>
                  {filteredSetup.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-slate-500"
                    >
                      <Link
                        href={section.href}
                        className="block focus:outline-none focus:ring-2 focus:ring-sky-400"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-sm font-semibold text-slate-200">{section.title}</h2>

                          <span
                            className={`mt-0.5 rounded-full px-2 py-0.5 text-xs ${
                              section.isDone
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-slate-500/15 text-slate-300"
                            }`}
                          >
                            {section.isDone ? copy.done : copy.notDone}
                          </span>
                        </div>

                        {typeof section.count === "number" && section.countSuffix && (
                          <p className="mt-1 text-xs text-slate-400">
                            {section.count} {section.countSuffix}
                          </p>
                        )}

                        {section.description && (
                          <p className="mt-2 text-xs text-slate-400">{section.description}</p>
                        )}
                      </Link>

                      {!section.isDone && (
                        <form action={toggleSetupSectionDone} className="mt-3">
                          <input type="hidden" name="section_id" value={section.id} />
                          <input type="hidden" name="next_is_done" value="true" />
                          <input type="hidden" name="redirect_to" value="/" />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                          >
                            {copy.markDone}
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </SetupHouseholdCollapsible>
              )}

              {filteredOngoing.length > 0 && (
                <>
                  <div className="mt-6 mb-4 text-sm font-semibold text-slate-200">
                    {copy.manageFinances}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {filteredOngoing.map((section) => (
                      <Link
                        key={section.id}
                        href={section.href}
                        className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      >
                        <h2 className="mb-1 text-sm font-semibold text-slate-200">{section.title}</h2>
                        <p className="mt-2 text-xs text-slate-400">{section.description}</p>
                        {section.reimbursementNote && (
                          <p className="mt-2 text-xs font-medium text-amber-200/90">
                            {section.reimbursementNote}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
      </div>
    </>
  );
}
