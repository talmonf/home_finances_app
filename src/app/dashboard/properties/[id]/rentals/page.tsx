import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { formatRentalTypeLabel } from "@/lib/rental-labels";
import { RentalDetailPanel } from "./rental-detail-panel";
import { RentalModalForm } from "./rental-modal-form";
import { RentalsTableClient, type RentalTableRow } from "./rentals-table-client";
import { RENTAL_PAYMENT_METHODS } from "./rental-form-constants";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ rentalId?: string; modal?: string; created?: string; updated?: string; error?: string }>;
};

function sortRentalsNewestFirst<
  T extends { start_date: Date | null; created_at: Date },
>(rentals: T[]): T[] {
  return [...rentals].sort((a, b) => {
    const aPrimary = a.start_date?.getTime() ?? a.created_at.getTime();
    const bPrimary = b.start_date?.getTime() ?? b.created_at.getTime();
    if (aPrimary !== bPrimary) return bPrimary - aPrimary;
    return b.created_at.getTime() - a.created_at.getTime();
  });
}

function formatPaymentLabel(rental: {
  rental_type: string;
  monthly_payment: { toString(): string } | null;
  period_total_payment: { toString(): string } | null;
  currency: string;
}): string {
  if (rental.rental_type === "lease_monthly" && rental.monthly_payment) {
    return `${rental.monthly_payment.toString()} ${rental.currency}/mo`;
  }
  if (rental.rental_type === "short_stay" && rental.period_total_payment) {
    return `${rental.period_total_payment.toString()} ${rental.currency}`;
  }
  return "—";
}

function buildRentalsHref(
  propertyId: string,
  params: { rentalId?: string | null; modal?: string; created?: string; error?: string },
): string {
  const search = new URLSearchParams();
  if (params.rentalId) search.set("rentalId", params.rentalId);
  if (params.modal) search.set("modal", params.modal);
  if (params.created) search.set("created", params.created);
  if (params.error) search.set("error", params.error);
  const qs = search.toString();
  return `/dashboard/properties/${propertyId}/rentals${qs ? `?${qs}` : ""}`;
}

export default async function PropertyRentalsPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [property, bankAccounts, creditCards, transactions] = await Promise.all([
    prisma.properties.findFirst({
      where: { id, household_id: householdId },
      include: {
        rentals: {
          include: {
            tenants: true,
            utilities: { orderBy: { created_at: "asc" } },
            contracts: true,
            credit_card: true,
            bank_account: true,
            transactions: { orderBy: { transaction_date: "desc" }, take: 25 },
          },
          orderBy: { created_at: "desc" },
        },
      },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { account_name: "asc" },
    }),
    prisma.credit_cards.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { card_name: "asc" },
    }),
    prisma.transactions.findMany({
      where: { household_id: householdId, import_status: "confirmed" },
      orderBy: { transaction_date: "desc" },
      take: 300,
      select: { id: true, transaction_date: true, amount: true, description: true, rental_id: true },
    }),
  ]);

  if (!property) redirect("/dashboard/properties?error=Not+found");

  const rentalsSortedDesc = sortRentalsNewestFirst(property.rentals);

  const requestedRentalId = resolvedSearchParams?.rentalId?.trim();
  const selectedRentalId =
    requestedRentalId && rentalsSortedDesc.some((r) => r.id === requestedRentalId)
      ? requestedRentalId
      : (rentalsSortedDesc[0]?.id ?? null);

  const selectedRental = selectedRentalId
    ? rentalsSortedDesc.find((r) => r.id === selectedRentalId) ?? null
    : null;

  const modalMode = resolvedSearchParams?.modal === "new" ? "new" : null;
  const rentalsBaseHref = buildRentalsHref(property.id, { rentalId: selectedRentalId });
  const addRentalHref = buildRentalsHref(property.id, { rentalId: selectedRentalId, modal: "new" });
  const modalCloseHref = rentalsBaseHref;
  const modalRedirectOnError = addRentalHref;

  const tableRows: RentalTableRow[] = rentalsSortedDesc.map((rental) => ({
    id: rental.id,
    rentalTypeLabel: formatRentalTypeLabel(rental.rental_type),
    tenantNames:
      rental.tenants
        .map((t) => t.full_name)
        .filter(Boolean)
        .join(", ") || "—",
    startDateLabel: rental.start_date
      ? formatHouseholdDate(rental.start_date, dateDisplayFormat)
      : "—",
    endDateLabel: rental.end_date
      ? formatHouseholdDate(rental.end_date, dateDisplayFormat)
      : "—",
    paymentLabel: formatPaymentLabel(rental),
    paymentMethodLabel: rental.payment_method
      ? (RENTAL_PAYMENT_METHODS[rental.payment_method] ?? rental.payment_method)
      : "—",
    isClinicLease: rental.is_clinic_lease,
  }));

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-screen-2xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href={`/dashboard/properties/${property.id}`}
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back to property details
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{property.name} rentals</h1>
          <p className="text-sm text-slate-400">
            Select a rental in the table to view and edit its details. Newest rentals appear first.
          </p>
          {(resolvedSearchParams?.error || resolvedSearchParams?.created || resolvedSearchParams?.updated) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolvedSearchParams.error
                ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                : resolvedSearchParams.created
                  ? "Rental added."
                  : "Rental saved."}
            </div>
          )}
        </header>

        <RentalsTableClient
          propertyId={property.id}
          rows={tableRows}
          selectedRentalId={selectedRentalId}
          addRentalHref={addRentalHref}
        />

        {selectedRental ? (
          <RentalDetailPanel
            rental={selectedRental}
            propertyId={property.id}
            bankAccounts={bankAccounts}
            creditCards={creditCards}
            transactions={transactions}
            dateDisplayFormat={dateDisplayFormat}
          />
        ) : null}

        {modalMode === "new" ? (
          <RentalModalForm
            propertyId={property.id}
            bankAccounts={bankAccounts}
            creditCards={creditCards}
            closeHref={modalCloseHref}
            redirectOnError={modalRedirectOnError}
          />
        ) : null}
      </div>
    </div>
  );
}
