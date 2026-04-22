import { getAuthSession, prisma } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    language?: string;
    provider?: string;
    household?: string;
  }>;
};

export default async function TranscriptionsAdminPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    redirect("/");
  }

  const sp = searchParams ? await searchParams : undefined;
  const q = (sp?.q ?? "").trim();
  const status = (sp?.status ?? "").trim();
  const language = (sp?.language ?? "").trim();
  const provider = (sp?.provider ?? "").trim();
  const household = (sp?.household ?? "").trim();

  const where = {
    ...(household ? { household_id: household } : {}),
    ...(status ? { transcription_status: status } : {}),
    ...(language ? { transcription_language: language } : {}),
    ...(provider ? { transcription_provider: provider } : {}),
    ...(q
      ? {
          OR: [
            { file_name: { contains: q, mode: "insensitive" as const } },
            { treatment_id: { contains: q, mode: "insensitive" as const } },
            { transcription_error: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const households = await prisma.households.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  const rows = await prisma.therapy_treatment_attachments.findMany({
    where,
    orderBy: [{ updated_at: "desc" }],
    take: 500,
    select: {
      id: true,
      household_id: true,
      treatment_id: true,
      file_name: true,
      transcription_status: true,
      transcription_language: true,
      transcription_provider: true,
      transcribed_at: true,
      transcription_error: true,
      updated_at: true,
      created_at: true,
      household: {
        select: { name: true },
      },
    },
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-7xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <p className="text-sm text-slate-400">
            <Link href="/" className="text-sky-400 hover:underline">
              ← Back to super admin home
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">Treatment transcription log (super admin)</h1>
          <p className="text-sm text-slate-400">
            Recent transcription records across households, including language and provider used.
          </p>
        </header>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <form method="GET" className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Search</label>
              <input
                name="q"
                defaultValue={q}
                placeholder="File, treatment id, or error"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Status</label>
              <select
                name="status"
                defaultValue={status}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="">All</option>
                <option value="none">none</option>
                <option value="pending">pending</option>
                <option value="completed">completed</option>
                <option value="failed">failed</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Language</label>
              <select
                name="language"
                defaultValue={language}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="">All</option>
                <option value="en">en</option>
                <option value="he">he</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Provider</label>
              <select
                name="provider"
                defaultValue={provider}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="">All</option>
                <option value="aws">aws</option>
                <option value="openrouter">openrouter</option>
                <option value="openai">openai</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Household</label>
              <select
                name="household"
                defaultValue={household}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="">All</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-6 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
              >
                Apply filters
              </button>
              <Link
                href="/admin/transcriptions"
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-400"
              >
                Clear
              </Link>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">No transcription activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700 uppercase text-slate-400">
                    <th className="py-2 pr-3">Updated</th>
                    <th className="py-2 pr-3">Household</th>
                    <th className="py-2 pr-3">File</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Language</th>
                    <th className="py-2 pr-3">Provider</th>
                    <th className="py-2 pr-3">Transcribed at</th>
                    <th className="py-2 pr-3">Treatment</th>
                    <th className="py-2 pr-3">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-800 align-top last:border-0">
                      <td className="py-2 pr-3 text-slate-300">{new Date(r.updated_at).toLocaleString("en-CA")}</td>
                      <td className="py-2 pr-3 text-slate-300">{r.household.name}</td>
                      <td className="max-w-56 truncate py-2 pr-3 text-slate-300" title={r.file_name}>
                        {r.file_name}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            r.transcription_status === "completed"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : r.transcription_status === "failed"
                                ? "bg-rose-500/20 text-rose-300"
                                : r.transcription_status === "pending"
                                  ? "bg-amber-500/20 text-amber-200"
                                  : "bg-slate-500/20 text-slate-300"
                          }`}
                        >
                          {r.transcription_status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-300">{r.transcription_language ?? "—"}</td>
                      <td className="py-2 pr-3 text-slate-300">{r.transcription_provider ?? "—"}</td>
                      <td className="py-2 pr-3 text-slate-300">
                        {r.transcribed_at ? new Date(r.transcribed_at).toLocaleString("en-CA") : "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-slate-400">{r.treatment_id}</td>
                      <td className="max-w-sm truncate py-2 pr-3 text-slate-400" title={r.transcription_error ?? ""}>
                        {r.transcription_error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

