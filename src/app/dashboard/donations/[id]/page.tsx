import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DonationForm } from "../DonationForm";
import { updateDonation } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

function formatDateInput(d: Date | null) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function EditDonationPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [donation, payees] = await Promise.all([
    prisma.donations.findFirst({
      where: { id, household_id: householdId },
    }),
    prisma.payees.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!donation) {
    redirect("/dashboard/donations?error=Not+found");
  }

  const initial = {
    kind: donation.kind,
    one_time_amount: donation.one_time_amount ? donation.one_time_amount.toFixed(2) : null,
    donation_date: donation.donation_date ? formatDateInput(donation.donation_date) : null,
    monthly_amount: donation.monthly_amount ? donation.monthly_amount.toFixed(2) : null,
    commitment_months: donation.commitment_months ?? null,
    commitment_start_date: donation.commitment_start_date
      ? formatDateInput(donation.commitment_start_date)
      : null,
    organization_name: donation.organization_name,
    organization_tax_number: donation.organization_tax_number,
    provides_seif_46_receipts: donation.provides_seif_46_receipts,
    organization_phone: donation.organization_phone,
    organization_email: donation.organization_email,
    currency: donation.currency,
    payee_id: donation.payee_id,
    renewal_date: donation.renewal_date ? formatDateInput(donation.renewal_date) : null,
    notes: donation.notes,
    is_active: donation.is_active,
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div>
            <Link href="/dashboard/donations" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
              ← Back to donations
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">Edit donation</h1>
            <p className="text-sm text-slate-400">Update amounts, organization details, and status.</p>
          </div>

          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
            </div>
          )}
        </header>

        <DonationForm
          action={updateDonation}
          donationId={donation.id}
          initial={initial}
          payees={payees.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </div>
  );
}

