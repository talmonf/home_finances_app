import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
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
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [donation, payees, familyMembers, creditCards, bankAccounts, digitalPaymentMethods] =
    await Promise.all([
    prisma.donations.findFirst({
      where: { id, household_id: householdId },
    }),
    prisma.payees.findMany({
      where: { household_id: householdId },
      orderBy: { name: "asc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.credit_cards.findMany({
      where: {
        household_id: householdId,
        cancelled_at: null,
        OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
      },
      orderBy: { card_name: "asc" },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { account_name: "asc" },
    }),
    prisma.digital_payment_methods.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!donation) {
    redirect("/dashboard/donations?error=Not+found");
  }

  // Preserve any currently-linked payment instruments even if they aren't in the active pick lists.
  if (donation.credit_card_id) {
    const found = creditCards.some((c) => c.id === donation.credit_card_id);
    if (!found) {
      const preserved = await prisma.credit_cards.findFirst({
        where: { id: donation.credit_card_id, household_id: householdId },
      });
      if (preserved) creditCards.push(preserved);
    }
  }

  if (donation.bank_account_id) {
    const found = bankAccounts.some((a) => a.id === donation.bank_account_id);
    if (!found) {
      const preserved = await prisma.bank_accounts.findFirst({
        where: { id: donation.bank_account_id, household_id: householdId },
      });
      if (preserved) bankAccounts.push(preserved);
    }
  }

  if (donation.digital_payment_method_id) {
    const found = digitalPaymentMethods.some((d) => d.id === donation.digital_payment_method_id);
    if (!found) {
      const preserved = await prisma.digital_payment_methods.findFirst({
        where: { id: donation.digital_payment_method_id, household_id: householdId },
      });
      if (preserved) digitalPaymentMethods.push(preserved);
    }
  }

  const initial = {
    kind: donation.kind,
    category: donation.category,
    family_member_id: donation.family_member_id,
    payment_method: donation.payment_method,
    credit_card_id: donation.credit_card_id,
    bank_account_id: donation.bank_account_id,
    digital_payment_method_id: donation.digital_payment_method_id,
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
    organization_website_url: donation.organization_website_url,
    tax_authority_info_passed: donation.tax_authority_info_passed,
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
              {isHebrew ? "חזרה לתרומות →" : "← Back to donations"}
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">{isHebrew ? "עריכת תרומה" : "Edit donation"}</h1>
            <p className="text-sm text-slate-400">
              {isHebrew ? "עדכון סכומים, פרטי הארגון וסטטוס." : "Update amounts, organization details, and status."}
            </p>
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
          familyMembers={familyMembers.map((m) => ({ id: m.id, full_name: m.full_name }))}
          creditCards={creditCards.map((c) => ({
            id: c.id,
            label: `${c.card_name} · ****${c.card_last_four}`,
          }))}
          bankAccounts={bankAccounts.map((a) => ({
            id: a.id,
            label: `${a.account_name} · ${a.bank_name}`,
          }))}
          digitalPaymentMethods={digitalPaymentMethods.map((d) => ({ id: d.id, label: d.name }))}
          uiLanguage={uiLanguage}
        />
      </div>
    </div>
  );
}

