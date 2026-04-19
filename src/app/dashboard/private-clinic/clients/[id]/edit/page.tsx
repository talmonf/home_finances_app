import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
  getCurrentObfuscateSensitive,
} from "@/lib/auth";
import { privateClinicClients, privateClinicCommon } from "@/lib/private-clinic-i18n";
import { redirect, notFound } from "next/navigation";
import { TherapyClientForm } from "../../therapy-client-form";
import {
  loadTherapyClientFormOptions,
  loadTherapyClientRelationshipPickerClients,
} from "../../load-therapy-client-form-options";
import { therapyClientFormErrorMessage } from "../../form-error-message";
import { TherapyClientRelationshipsSection } from "../../therapy-client-relationships-section";

export const dynamic = "force-dynamic";

const LIST_PATH = "/dashboard/private-clinic/clients";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function PrivateClinicEditClientPage({ params, searchParams }: PageProps) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const cl = privateClinicClients(uiLanguage);

  const resolved = searchParams ? await searchParams : {};
  const errorMsg = therapyClientFormErrorMessage(resolved.error, cl);

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const client = await prisma.therapy_clients.findFirst({
    where: { id, household_id: householdId },
    include: {
      client_jobs: true,
      relationships_from: {
        include: {
          to_client: { select: { id: true, first_name: true, last_name: true } },
        },
        orderBy: { created_at: "asc" },
      },
    },
  });
  if (!client) notFound();

  const [{ jobs, programs }, otherClients] = await Promise.all([
    loadTherapyClientFormOptions({ householdId, familyMemberId }),
    loadTherapyClientRelationshipPickerClients({ householdId, familyMemberId, excludeClientId: id }),
  ]);

  const editPath = `${LIST_PATH}/${id}/edit`;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-50">{cl.editClientPageTitle}</h1>
        <Link
          href={LIST_PATH}
          className="inline-flex shrink-0 items-center rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          {cl.backToClients}
        </Link>
      </header>

      {errorMsg ? (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">{errorMsg}</p>
      ) : null}

      <TherapyClientForm
        mode="edit"
        obfuscate={obfuscate}
        jobs={jobs}
        programs={programs}
        cl={cl}
        c={c}
        redirectOnError={editPath}
        client={client}
      />

      <TherapyClientRelationshipsSection
        cl={cl}
        obfuscate={obfuscate}
        fromClientId={id}
        redirectOnError={editPath}
        relationships={client.relationships_from.map((r) => ({
          id: r.id,
          relationship: r.relationship,
          to_client: r.to_client,
        }))}
        otherClients={otherClients}
      />
    </div>
  );
}
