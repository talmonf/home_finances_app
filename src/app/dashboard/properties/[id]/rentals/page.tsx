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
import { AddRentalForm } from "./add-rental-form";
import { RentalDetailPanel } from "./rental-detail-panel";
import { RentalsTableClient, type RentalTableRow } from "./rentals-table-client";
import { RENTAL_PAYMENT_METHODS } from "./rental-form-constants";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ rentalId?: string }>;
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
        </header>

        <RentalsTableClient
          propertyId={property.id}
          rows={tableRows}
          selectedRentalId={selectedRentalId}
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

        <AddRentalForm
          propertyId={property.id}
          bankAccounts={bankAccounts}
          creditCards={creditCards}
        />
      </div>
    </div>
  );
}
