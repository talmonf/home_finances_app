import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
  getCurrentObfuscateSensitive,
} from "@/lib/auth";
import { privateClinicClients, privateClinicCommon, privateClinicJobs } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { TherapyClientForm } from "../therapy-client-form";
import { loadTherapyClientFormOptions } from "../load-therapy-client-form-options";
import { therapyClientFormErrorMessage } from "../form-error-message";

export const dynamic = "force-dynamic";

const NEW_PATH = "/dashboard/private-clinic/clients/new";
const LIST_PATH = "/dashboard/private-clinic/clients";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function PrivateClinicNewClientPage({ searchParams }: PageProps) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const cl = privateClinicClients(uiLanguage);
  const j = privateClinicJobs(uiLanguage);

  const resolved = searchParams ? await searchParams : {};
  const errorMsg = therapyClientFormErrorMessage(resolved.error, cl);

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const { jobs, programs, families } = await loadTherapyClientFormOptions({ householdId, familyMemberId });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-50">{cl.newClientPageTitle}</h1>
          {!familyMemberId ? (
            <p className="rounded-lg border border-sky-700/50 bg-sky-950/30 px-3 py-2 text-sm text-sky-100">{j.clinicUnlinkedHint}</p>
          ) : null}
        </div>
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
        mode="create"
        obfuscate={obfuscate}
        jobs={jobs}
        programs={programs}
        families={families}
        cl={cl}
        c={c}
        redirectOnError={NEW_PATH}
      />
    </div>
  );
}
