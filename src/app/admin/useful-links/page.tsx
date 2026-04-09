import { getAuthSession, prisma } from "@/lib/auth";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-sections";
import { createSystemUsefulLink, deleteSystemUsefulLink } from "@/lib/useful-links/admin-actions";
import { parseDashboardSectionId } from "@/lib/useful-links/parse-section-id";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    section?: string;
    saved?: string;
    error?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  section: "Choose a valid section.",
  url: "Enter a valid http(s) URL.",
  id: "Missing link id.",
};

export default async function AdminUsefulLinksPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    redirect("/");
  }

  const resolved = searchParams ? await searchParams : {};
  const parsedSection = parseDashboardSectionId(resolved.section);
  const sectionId = parsedSection ?? DASHBOARD_SECTIONS[0].id;

  const links = await prisma.useful_links.findMany({
    where: { scope: "system", section_id: sectionId, is_active: true },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });

  const errKey = resolved.error?.trim();
  const errorMessage = errKey ? ERROR_MESSAGES[errKey] ?? "Something went wrong." : null;

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-3xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <Link href="/admin/households" className="text-sm text-slate-400 hover:text-slate-200">
            ← Households
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">System useful links</h1>
          <p className="text-sm text-slate-400">
            Links here appear for every household on matching dashboard sections (if that section is enabled for
            the user). Use household edit to add links for a single household.
          </p>
        </header>

        {resolved.saved === "1" ? (
          <div className="rounded-lg border border-emerald-600 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
            Saved.
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="section" className="mb-1 block text-xs text-slate-400">
              Section
            </label>
            <select
              id="section"
              name="section"
              defaultValue={sectionId}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {DASHBOARD_SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.id})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600"
          >
            Load
          </button>
        </form>

        <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-200">Links for this section</h2>
          {links.length === 0 ? (
            <p className="text-sm text-slate-500">No system links yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {links.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-2 last:border-0"
                >
                  <div className="min-w-0">
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
                  <form action={deleteSystemUsefulLink}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="section_id" value={sectionId} />
                    <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={createSystemUsefulLink} className="grid gap-2 border-t border-slate-800 pt-3 sm:grid-cols-2">
            <input type="hidden" name="section_id" value={sectionId} />
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
                Add system link
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
