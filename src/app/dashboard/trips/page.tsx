import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTrip, updateTrip, deleteTrip } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
};

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function TripsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const resolved = searchParams ? await searchParams : undefined;

  const [trips, members] = await Promise.all([
    prisma.trips.findMany({
      where: { household_id: householdId },
      include: {
        participants: { include: { family_member: true } },
      },
      orderBy: [{ start_date: "desc" }, { created_at: "desc" }],
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Trips</h1>
          <p className="text-sm text-slate-400">Track travel details and group related transactions.</p>
          {(resolved?.created || resolved?.updated || resolved?.error) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolved?.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolved?.error
                ? decodeURIComponent(resolved.error.replace(/\+/g, " "))
                : resolved?.created
                  ? "Trip added."
                  : "Trip updated."}
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Add new trip</h2>
          <form action={createTrip} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Name</label>
              <input name="name" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Type</label>
              <input name="trip_type" placeholder="Business / Holiday / Other" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">City</label>
              <input name="city" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Country</label>
              <input name="country" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Start date</label>
              <input type="date" name="start_date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">End date</label>
              <input type="date" name="end_date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Family members on this trip</label>
              <select
                name="family_member_ids"
                multiple
                size={Math.min(6, Math.max(3, members.length))}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Notes</label>
              <textarea name="notes" rows={2} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Add trip</button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">Trips list</h2>
          {trips.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No trips yet. Add one above.
            </p>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => (
                <form key={trip.id} action={updateTrip} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <input type="hidden" name="id" value={trip.id} />
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Name</label>
                    <input name="name" defaultValue={trip.name} required className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Type</label>
                    <input name="trip_type" defaultValue={trip.trip_type ?? ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">City</label>
                    <input name="city" defaultValue={trip.city ?? ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Country</label>
                    <input name="country" defaultValue={trip.country ?? ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Start</label>
                    <input type="date" name="start_date" defaultValue={trip.start_date ? trip.start_date.toISOString().slice(0, 10) : ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">End</label>
                    <input type="date" name="end_date" defaultValue={trip.end_date ? trip.end_date.toISOString().slice(0, 10) : ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-slate-400">
                      Participants ({trip.participants.length}) · {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                    </label>
                    <select
                      name="family_member_ids"
                      multiple
                      size={Math.min(6, Math.max(3, members.length))}
                      defaultValue={trip.participants.map((p) => p.family_member_id)}
                      className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-slate-400">Notes</label>
                    <textarea name="notes" rows={2} defaultValue={trip.notes ?? ""} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100" />
                  </div>
                  <div className="flex items-end gap-3">
                    <button type="submit" className="rounded bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500">Save</button>
                    <button formAction={deleteTrip.bind(null, trip.id)} type="submit" className="rounded bg-rose-700 px-3 py-1.5 text-xs text-white hover:bg-rose-600">
                      Delete
                    </button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
