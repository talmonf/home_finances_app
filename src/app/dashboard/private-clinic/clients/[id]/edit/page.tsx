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
import { DeleteClientForm } from "../../delete-client-form";
import { deleteTherapyClient } from "../../../actions";

export const dynamic = "force-dynamic";

const LIST_PATH = "/dashboard/private-clinic/clients";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; fromUpcoming?: string; modal?: string }>;
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
  const fromUpcoming = resolved.fromUpcoming === "1";
  const showModal = resolved.modal === "1";
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

  const [{ jobs, programs, families }, otherClients, primaryTreatmentsCount, participantTreatmentsCount] = await Promise.all([
    loadTherapyClientFormOptions({ householdId, familyMemberId }),
    loadTherapyClientRelationshipPickerClients({ householdId, familyMemberId, excludeClientId: id }),
    prisma.therapy_treatments.count({
      where: { household_id: householdId, client_id: id },
    }),
    prisma.therapy_treatment_participants.count({
      where: { household_id: householdId, client_id: id },
    }),
  ]);
  const canDeleteClient = primaryTreatmentsCount === 0 && participantTreatmentsCount === 0;

  const editPath = `${LIST_PATH}/${id}/edit`;
  const backHref = fromUpcoming ? "/dashboard/private-clinic/upcoming-visits" : LIST_PATH;
  const backLabel = fromUpcoming ? "Back to Upcoming visits" : cl.backToClients;
  const redirectSuffix = fromUpcoming ? "?fromUpcoming=1&modal=1" : "";
  const editRedirectPath = `${editPath}${redirectSuffix}`;
  const pageContent = (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-50">{cl.editClientPageTitle}</h1>
        <Link
          href={backHref}
          className="inline-flex shrink-0 items-center rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          {backLabel}
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
        families={families}
        cl={cl}
        c={c}
        redirectOnError={editRedirectPath}
        client={client}
      />

      <TherapyClientRelationshipsSection
        cl={cl}
        obfuscate={obfuscate}
        fromClientId={id}
        redirectOnError={editRedirectPath}
        relationships={client.relationships_from.map((r) => ({
          id: r.id,
          relationship: r.relationship,
          to_client: r.to_client,
        }))}
        otherClients={otherClients}
      />
      {canDeleteClient ? (
        <DeleteClientForm
          action={deleteTherapyClient}
          clientId={id}
          confirmMessage={cl.deleteClientConfirm}
          buttonLabel={cl.deleteClient}
          deletingLabel={cl.deletingClient}
        />
      ) : null}
    </div>
  );

  return (
    showModal ? (
      <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
        <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
          {pageContent}
        </div>
      </div>
    ) : (
      pageContent
    )
  );
}
