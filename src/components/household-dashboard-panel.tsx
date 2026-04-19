"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SectionId } from "@/lib/dashboard-sections";
import { toggleSetupSectionDone } from "@/lib/setup-section-actions";
import { SetupHouseholdCollapsible } from "@/components/setup-household-collapsible";
import type { HomeFrequentLinkItem } from "@/lib/home-frequent-links";

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
  welcomeTitle: string;
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

export function HouseholdDashboardPanel({
  welcomeTitle,
  welcomeSubtitle,
  frequentLinksTitle,
  frequentLinks,
  hasAnyTiles,
  setupTiles,
  ongoingTiles,
}: HouseholdDashboardPanelProps) {
  const [query, setQuery] = useState("");

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
    !hasAnyTiles && !queryLower
      ? "Your super admin hasn't enabled any sections yet."
      : "No dashboard tiles match your search.";

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">{welcomeTitle}</h1>
          <p className="text-sm text-slate-400">{welcomeSubtitle}</p>
        </div>
        <div className="w-full max-w-[220px] shrink-0">
          <label htmlFor="dashboard-search" className="mb-1 block text-xs text-slate-400">
            Search tiles
          </label>
          <input
            id="dashboard-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. donations"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>
      </div>

      {frequentLinks.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">{frequentLinksTitle}</h2>
          <div className="flex flex-wrap gap-2">
            {frequentLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-sky-500/60 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div>
        {filteredEmpty ? (
          <p className="text-sm text-slate-400">{emptyMessage}</p>
        ) : (
          <>
            {filteredSetup.length > 0 && (
              <SetupHouseholdCollapsible>
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
                            {section.isDone ? "Done" : "Not done"}
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
                            Mark done
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
                    Manage your finances
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
