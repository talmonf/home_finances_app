import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
  getCurrentObfuscateSensitive,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { OBFUSCATED } from "@/lib/privacy-display";
import { privateClinicClients, privateClinicCommon } from "@/lib/private-clinic-i18n";
import { redirect, notFound } from "next/navigation";
import { TherapyClientForm } from "../../therapy-client-form";
import {
  loadTherapyClientFormOptions,
  loadTherapyClientRelationshipPickerClients,
} from "../../load-therapy-client-form-options";
import { therapyClientFormErrorMessage } from "../../form-error-message";
import {
  displayRelatedClientName,
  TherapyClientRelationshipsSection,
  therapyClientRelationshipLabel,
} from "../../therapy-client-relationships-section";
import { TherapyClientHoldPeriodsSection } from "../../therapy-client-hold-periods-section";
import { TherapyClientSectionModal } from "../../therapy-client-section-modal";
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
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
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
      hold_periods: { orderBy: { started_on: "desc" } },
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
  const errorKey = resolved.error?.trim() ?? "";
  const openRelatedModal = errorKey.startsWith("rel-");
  const openHoldModal = errorKey.startsWith("hold-");
  const currentlyOnHold = client.hold_periods.some((p) => p.ended_on == null);
  const relatedRows = client.relationships_from.map((r) => ({
    id: r.id,
    relationship: r.relationship,
    to_client: r.to_client,
  }));

  const editPath = `${LIST_PATH}/${id}/edit`;
  const backHref = fromUpcoming ? "/dashboard/private-clinic/upcoming-visits" : LIST_PATH;
  const backLabel = fromUpcoming ? "Back to Upcoming visits" : cl.backToClients;
  const redirectSuffix = fromUpcoming ? "?fromUpcoming=1&modal=1" : "";
  const editRedirectPath = `${editPath}${redirectSuffix}`;
  const pageContent = (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6">
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
        uiLanguage={uiLanguage}
        redirectOnError={editRedirectPath}
        client={client}
        pendingLabel={uiLanguage === "he" ? "טוען…" : "Loading…"}
      />

      <div
        className={
          relatedRows.length > 0 || currentlyOnHold ? "space-y-6" : "flex flex-wrap items-center gap-3"
        }
      >
      <TherapyClientSectionModal
        title={cl.clientRelationshipsTitle}
        openLabel={relatedRows.length > 0 ? cl.relManage : cl.clientRelationshipsTitle}
        closeLabel={cl.overlayClose}
        defaultOpen={openRelatedModal}
        summary={
          relatedRows.length > 0 ? (
            <ul className="space-y-1 text-sm text-slate-300">
              {relatedRows.map((row) => (
                <li key={row.id}>
                  {obfuscate ? OBFUSCATED : displayRelatedClientName(row.to_client)}
                  <span className="text-slate-500">
                    {" · "}
                    {therapyClientRelationshipLabel(cl, row.relationship)}
                  </span>
                </li>
              ))}
            </ul>
          ) : undefined
        }
      >
        <TherapyClientRelationshipsSection
          cl={cl}
          obfuscate={obfuscate}
          fromClientId={id}
          redirectOnError={editRedirectPath}
          relationships={relatedRows}
          otherClients={otherClients}
        />
      </TherapyClientSectionModal>

      {currentlyOnHold ? (
        <TherapyClientHoldPeriodsSection
          cl={cl}
          c={c}
          obfuscate={obfuscate}
          clientId={id}
          redirectOnError={editRedirectPath}
          dateDisplayFormat={dateDisplayFormat}
          pendingLabel={uiLanguage === "he" ? "טוען…" : "Loading…"}
          periods={client.hold_periods}
        />
      ) : (
        <TherapyClientSectionModal
          title={cl.holdPeriodsTitle}
          openLabel={cl.holdPlaceOnHold}
          closeLabel={cl.overlayClose}
          defaultOpen={openHoldModal}
        >
          <TherapyClientHoldPeriodsSection
            cl={cl}
            c={c}
            obfuscate={obfuscate}
            clientId={id}
            redirectOnError={editRedirectPath}
            dateDisplayFormat={dateDisplayFormat}
            pendingLabel={uiLanguage === "he" ? "טוען…" : "Loading…"}
            periods={client.hold_periods}
          />
        </TherapyClientSectionModal>
      )}
      </div>
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
        <div className="max-h-[92vh] w-full max-w-screen-2xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
          {pageContent}
        </div>
      </div>
    ) : (
      pageContent
    )
  );
}
