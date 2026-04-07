import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import {
  updateProperty,
  createUtility,
  deleteUtility,
} from "../actions";

export const dynamic = "force-dynamic";

const UTILITY_TYPE_LABELS_EN: Record<string, string> = {
  electricity: "Electricity",
  water: "Water",
  internet: "Internet",
  telephone: "Telephone",
  gas: "Gas",
  other: "Other",
};

const UTILITY_TYPE_LABELS_HE: Record<string, string> = {
  electricity: "חשמל",
  water: "מים",
  internet: "אינטרנט",
  telephone: "טלפון",
  gas: "גז",
  other: "אחר",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; updated?: string }>;
};

export default async function PropertyDetailPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const utilityLabels = isHebrew ? UTILITY_TYPE_LABELS_HE : UTILITY_TYPE_LABELS_EN;
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [property, payees] = await Promise.all([
    prisma.properties.findFirst({
      where: { id, household_id: householdId },
      include: {
        utilities: { include: { payee: true } },
        rentals: {
          include: {
            tenants: {
              orderBy: { full_name: "asc" },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
    }),
    prisma.payees.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!property) redirect("/dashboard/properties?error=Not+found");
  const now = new Date();
  const currentRental =
    property.rentals.find((rental) => !rental.end_date || rental.end_date >= now) ?? property.rentals[0] ?? null;
  const currentTenantNames =
    currentRental?.tenants.map((tenant) => tenant.full_name).filter(Boolean).join(", ") ||
    (isHebrew ? "לא צוינו דיירים" : "No tenants listed");

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-4xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/properties"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה לבתים ונכסים →" : "← Back to homes & properties"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{property.name}</h1>
          <p className="text-sm text-slate-400">
            {isHebrew
              ? "עדכנו פרטי נכס ונהלו את חברות התשתית שמשרתות את הבית."
              : "Update property details and manage utility companies that service this home."}
          </p>
          <div>
            <Link
              href={`/dashboard/properties/${property.id}/rentals`}
              className="inline-flex rounded-lg border border-sky-500/50 px-3 py-1.5 text-sm font-medium text-sky-300 hover:border-sky-400 hover:text-sky-200"
            >
              {isHebrew ? "פתיחת שכירויות" : "Open rentals"}
            </Link>
          </div>
          {(resolvedSearchParams?.error || resolvedSearchParams?.updated) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolvedSearchParams.error
                ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                : resolvedSearchParams.updated === "utility"
                  ? isHebrew ? "התשתית עודכנה." : "Utility updated."
                  : isHebrew ? "נשמר." : "Saved."}
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "פרטי נכס" : "Property details"}</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {isHebrew ? "שכירות נוכחית" : "Current rental"}
            </p>
            {currentRental ? (
              <div className="mt-2 space-y-1 text-sm text-slate-300">
                <p>
                  <span className="text-slate-400">{isHebrew ? "דיירים:" : "Tenants:"}</span> {currentTenantNames}
                </p>
                <p>
                  <span className="text-slate-400">{isHebrew ? "מסתיים:" : "Expires:"}</span>{" "}
                  {currentRental.end_date
                    ? formatHouseholdDate(currentRental.end_date, dateDisplayFormat)
                    : isHebrew ? "ללא תאריך סיום" : "No end date"}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">{isHebrew ? "טרם נמצאה שכירות." : "No rental found yet."}</p>
            )}
          </div>
          <form action={updateProperty} className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={property.id} />
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-slate-400">Name</label>
              <input id="name" name="name" required defaultValue={property.name} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label htmlFor="property_type" className="mb-1 block text-xs font-medium text-slate-400">{isHebrew ? "סוג" : "Type"}</label>
              <select id="property_type" name="property_type" defaultValue={property.property_type ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">—</option>
                <option value="owned">Owned</option>
                <option value="rental">Rental</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="landlord_name" className="mb-1 block text-xs font-medium text-slate-400">In whose name</label>
              <input id="landlord_name" name="landlord_name" defaultValue={property.landlord_name ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="mb-1 block text-xs font-medium text-slate-400">Address</label>
              <textarea id="address" name="address" rows={2} defaultValue={property.address ?? ""} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="landlord_contact" className="mb-1 block text-xs font-medium text-slate-400">
                Contact details (phone / email)
              </label>
              <textarea
                id="landlord_contact"
                name="landlord_contact"
                rows={2}
                defaultValue={property.landlord_contact ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">{isHebrew ? "הערות" : "Notes"}</label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={property.notes ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
                {isHebrew ? "שמירת שינויים" : "Save changes"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "חברות תשתית" : "Utility companies"}</h2>
          <form action={createUtility} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="property_id" value={property.id} />
            <div>
              <label htmlFor="utility_type_new" className="mb-1 block text-xs font-medium text-slate-400">{isHebrew ? "סוג" : "Type"}</label>
              <select id="utility_type_new" name="utility_type" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                {Object.entries(utilityLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="provider_name_new" className="mb-1 block text-xs font-medium text-slate-400">{isHebrew ? "שם ספק" : "Provider name"}</label>
              <input id="provider_name_new" name="provider_name" required placeholder="e.g. Bezeq" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label htmlFor="payee_id_new" className="mb-1 block text-xs font-medium text-slate-400">Link to payee (optional)</label>
              <select id="payee_id_new" name="payee_id" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">— None —</option>
                {payees.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="account_number_new" className="mb-1 block text-xs font-medium text-slate-400">Account number</label>
              <input id="account_number_new" name="account_number" placeholder="Optional" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div>
              <label htmlFor="renewal_date_new" className="mb-1 block text-xs font-medium text-slate-400">
                Renewal date (optional)
              </label>
              <input
                id="renewal_date_new"
                name="renewal_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes_new" className="mb-1 block text-xs font-medium text-slate-400">{isHebrew ? "הערות" : "Notes"}</label>
              <input id="notes_new" name="notes" placeholder="Optional" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
                {isHebrew ? "הוספת תשתית" : "Add utility"}
              </button>
            </div>
          </form>

          {property.utilities.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {isHebrew ? "אין עדיין תשתיות. ניתן להוסיף למעלה (למשל חשמל, מים, אינטרנט)." : "No utilities yet. Add one above (e.g. electricity, water, internet)."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">{isHebrew ? "סוג" : "Type"}</th>
                    <th className="px-4 py-3 font-medium text-slate-300">{isHebrew ? "ספק" : "Provider"}</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Account #</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Renewal</th>
                    <th className="px-4 py-3 font-medium text-slate-300">{isHebrew ? "הערות" : "Notes"}</th>
                    <th className="px-4 py-3 font-medium text-slate-300">{isHebrew ? "פעולות" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {property.utilities.map((u) => (
                    <tr key={u.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-300">
                        {utilityLabels[u.utility_type] ?? u.utility_type}
                      </td>
                      <td className="px-4 py-3 text-slate-100">{u.provider_name}</td>
                      <td className="px-4 py-3 text-slate-300">{u.account_number || "—"}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {u.renewal_date ? formatHouseholdDate(u.renewal_date, dateDisplayFormat) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{u.notes || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/properties/${property.id}/utilities/${u.id}/edit`}
                            className="text-xs font-medium text-sky-400 hover:text-sky-300"
                          >
                            {isHebrew ? "עריכה" : "Edit"}
                          </Link>
                          <ConfirmDeleteForm action={deleteUtility.bind(null, u.id, property.id)} className="inline">
                            <button type="submit" className="text-xs font-medium text-rose-400 hover:text-rose-300">
                              {isHebrew ? "מחיקה" : "Delete"}
                            </button>
                          </ConfirmDeleteForm>
                        </div>
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
