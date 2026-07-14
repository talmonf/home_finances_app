import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
  getAuthSession,
} from "@/lib/auth";
import {
  ensureDefaultConsultationTypes,
  ensureDefaultExpenseCategories,
  ensureTherapySettings,
} from "@/lib/therapy/bootstrap";
import { redirect } from "next/navigation";
import {
  createTherapyConsultationType,
  createTherapyExpenseCategory,
  deleteTherapyExpenseCategory,
  updateTherapyExpenseCategory,
  updateTherapyNoteLabelsFromDashboard,
} from "../actions";
import { Suspense } from "react";
import { privateClinicCommon, privateClinicSettings } from "@/lib/private-clinic-i18n";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { DashboardModal } from "@/components/dashboard-modal";
import { updateMyGoogleCalendarSettings } from "@/app/dashboard/user-preferences-actions";
import { GoogleCalendarConnectionControls } from "./google-calendar-connection-controls";
import { ClinicDigestEmailSection } from "./clinic-digest-email-section";
import { ConsultationTypeEditRow } from "./consultation-type-edit-row";
import { SettingsConsultationTypeFlashPopup } from "./settings-consultation-type-flash-popup";
import {
  disconnectMorningIntegration,
  saveMorningIntegration,
  testMorningIntegration,
} from "./morning-integration-actions";
import {
  MorningIntegrationSection,
  type MorningIntegrationInitial,
} from "./morning-integration-section";
import { jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { decryptSecret } from "@/lib/crypto/secret";
import { maskApiKeyId } from "@/lib/morning/integration";

export const dynamic = "force-dynamic";

type Search = {
  saved?: string;
  error?: string;
  modal?: string;
  digest?: string;
  reason?: string;
  morning?: string;
  morningReason?: string;
  morningJob?: string;
};

export default async function PrivateClinicSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  await ensureTherapySettings(householdId);
  await ensureDefaultExpenseCategories(householdId);
  await ensureDefaultConsultationTypes(householdId);
  const uiLanguage = await getCurrentUiLanguage();
  const st = privateClinicSettings(uiLanguage);
  const c = privateClinicCommon(uiLanguage);
  const sp = searchParams ? await searchParams : {};
  const modalMode = sp.modal;

  const session = await getAuthSession();
  const settingsUser = session?.user?.id
    ? await prisma.users.findFirst({
        where: { id: session.user.id, household_id: householdId, is_active: true },
        select: { family_member_id: true },
      })
    : null;
  const userFamilyMemberId = settingsUser?.family_member_id ?? null;
  const [settings, consultationTypes, expenseCategories, currentUser, clinicJobs, morningIntegrations] =
    await Promise.all([
    prisma.therapy_settings.findUnique({
      where: { household_id: householdId },
      select: {
        note_1_label: true,
        note_2_label: true,
        note_3_label: true,
        note_1_label_he: true,
        note_2_label_he: true,
        note_3_label_he: true,
        note_1_visible: true,
        note_2_visible: true,
        note_3_visible: true,
      },
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ is_active: "desc" }, { sort_order: "asc" }, { name: "asc" }],
      include: { _count: { select: { consultations: true } } },
    }),
    prisma.therapy_expense_categories.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    session?.user?.id
      ? prisma.users.findFirst({
          where: { id: session.user.id, household_id: householdId },
          select: {
            email: true,
            google_calendar_enabled: true,
            google_gmail_address: true,
            google_calendar_refresh_token_encrypted: true,
          },
        })
      : null,
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({
        householdId,
        familyMemberId: userFamilyMemberId,
      }),
      orderBy: [{ job_title: "asc" }],
      select: { id: true, job_title: true, employer_name: true },
    }),
    prisma.job_morning_integrations.findMany({
      where: { household_id: householdId },
    }),
  ]);
  const gmailFromLoginEmail =
    currentUser?.email?.toLowerCase().endsWith("@gmail.com") ? currentUser.email : "";
  const defaultGoogleGmailAddress = currentUser?.google_gmail_address ?? gmailFromLoginEmail;
  const googleConnected = Boolean(currentUser?.google_calendar_refresh_token_encrypted);

  const morningFlash =
    sp.morning === "saved"
      ? ({
          kind: "ok" as const,
          text:
            sp.morningReason === "test_ok"
              ? st.morningTestOk
              : sp.morningReason === "disconnected"
                ? st.morningDisconnected
                : st.morningSaved,
        })
      : sp.morning === "error"
        ? ({
            kind: "err" as const,
            text:
              sp.morningReason === "missing_credentials"
                ? st.morningErrMissingCredentials
                : sp.morningReason === "job"
                  ? st.morningErrJob
                  : sp.morningReason || st.errGeneric,
          })
        : null;

  const integrationsByJobId: Record<string, MorningIntegrationInitial> = {};
  for (const row of morningIntegrations) {
    let maskedApiKeyId: string | null = null;
    if (row.api_key_id_encrypted) {
      try {
        maskedApiKeyId = maskApiKeyId(decryptSecret(row.api_key_id_encrypted));
      } catch {
        maskedApiKeyId = null;
      }
    }
    integrationsByJobId[row.job_id] = {
      jobId: row.job_id,
      enabled: row.enabled,
      environment: row.environment,
      hasCredentials: Boolean(row.api_key_id_encrypted && row.api_secret_encrypted),
      maskedApiKeyId,
      businessName: row.business_name,
      businessTaxId: row.business_tax_id,
      defaultDocumentType: row.default_document_type,
      lastTestedAt: row.last_tested_at
        ? row.last_tested_at.toLocaleString(uiLanguage === "he" ? "he-IL" : "en-IL", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : null,
      lastError: row.last_error,
      receiptNumberingMode: row.receipt_numbering_mode,
    };
  }

  const flash =
    morningFlash ??
    (sp.error === "google-gmail"
      ? ({ kind: "err" as const, text: "Please enter a valid Gmail address to enable integration." })
      : sp.error === "google-not-connected"
        ? ({ kind: "err" as const, text: "Connect your Google account before enabling integration." })
      : sp.error === "google-oauth" || sp.error === "google-oauth-state"
        ? ({ kind: "err" as const, text: "Google connection failed. Please try connecting again." })
      : sp.error === "cat"
      ? ({ kind: "err" as const, text: st.errGeneric })
      : sp.error === "cat-in-use"
        ? ({ kind: "err" as const, text: st.errCatInUse })
        : sp.error === "ctype"
          ? null
            : sp.saved === "google-connected"
              ? ({ kind: "ok" as const, text: st.googleConnectedSuccess })
              : sp.saved === "google"
              ? ({ kind: "ok" as const, text: st.googleSettingsSaved })
              : sp.saved === "1"
              ? ({ kind: "ok" as const, text: c.saved })
              : sp.saved === "cat"
                ? ({ kind: "ok" as const, text: st.savedExpenseCat })
                : sp.saved === "ctype" || sp.saved === "ctype-archived" || sp.saved === "ctype-removed"
                  ? null
                  : null);

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <SettingsConsultationTypeFlashPopup
          messages={{
            saved: st.savedConsultType,
            savedRemoved: st.savedConsultTypeRemoved,
            savedArchived: st.savedConsultTypeArchived,
            error: st.errGeneric,
          }}
        />
      </Suspense>
      {flash ? (
        <p
          className={
            flash.kind === "ok"
              ? "rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
              : "rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-sm text-rose-100"
          }
        >
          {flash.text}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:p-6">
        <h2 className="text-lg font-medium text-slate-200">{st.googleCalendarTitle}</h2>
        <p className="mt-2 text-sm text-slate-400">{st.googleCalendarIntro}</p>
        <form action={updateMyGoogleCalendarSettings} className="mt-4 space-y-3">
          {!googleConnected ? (
            <p className="rounded-md border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
              {st.googleConnectFirst}
            </p>
          ) : null}
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              name="google_calendar_enabled"
              defaultChecked={currentUser?.google_calendar_enabled ?? false}
              disabled={!googleConnected}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500"
            />
            {st.googleCalendarEnabled}
          </label>
          <GoogleCalendarConnectionControls
            googleConnected={googleConnected}
            initialGmailAddress={defaultGoogleGmailAddress}
            labels={{
              accountConnected: st.googleAccountConnected,
              accountNotConnected: st.googleAccountNotConnected,
              connectAccount: st.connectGoogleAccount,
              reconnectAccount: st.reconnectGoogleAccount,
              gmailAddress: st.gmailAddress,
              gmailChangedReconnect: st.gmailChangedReconnect,
              gmailPlaceholder: st.gmailPlaceholder,
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              {st.saveGoogleSettings}
            </button>
          </div>
        </form>
      </section>

      <MorningIntegrationSection
        jobs={clinicJobs.map((j) => ({
          id: j.id,
          label: formatJobDisplayLabel(j),
        }))}
        integrationsByJobId={integrationsByJobId}
        initialJobId={sp.morningJob}
        saveAction={saveMorningIntegration}
        testAction={testMorningIntegration}
        disconnectAction={disconnectMorningIntegration}
        labels={{
          title: st.morningTitle,
          intro: st.morningIntro,
          guideTitle: st.morningGuideTitle,
          guideIntro: st.morningGuideIntro,
          guideSteps: [
            st.morningGuideStep1,
            st.morningGuideStep2,
            st.morningGuideStep3,
            st.morningGuideStep4,
            st.morningGuideStep5,
            st.morningGuideStep6,
          ],
          guideDocsLink: st.morningGuideDocsLink,
          job: st.morningJob,
          environment: st.morningEnvironment,
          sandbox: st.morningSandbox,
          production: st.morningProduction,
          enabled: st.morningEnabled,
          apiKeyId: st.morningApiKeyId,
          apiSecret: st.morningApiSecret,
          apiSecretPlaceholder: st.morningApiSecretPlaceholder,
          save: st.morningSave,
          testConnection: st.morningTest,
          testHint: st.morningTestHint,
          testRequiresCredentials: st.morningTestRequiresCredentials,
          disconnect: st.morningDisconnect,
          connected: st.morningConnected,
          notConnected: st.morningNotConnected,
          businessName: st.morningBusinessName,
          businessTaxId: st.morningBusinessTaxId,
          documentType: st.morningDocumentType,
          lastError: st.morningLastError,
          lastTested: st.morningLastTested,
          receiptNumberingMode: st.morningReceiptNumberingMode,
          receiptNumberingManual: st.morningReceiptNumberingManual,
          receiptNumberingAuto: st.morningReceiptNumberingAuto,
          receiptNumberingAsk: st.morningReceiptNumberingAsk,
          receiptNumberingHint: st.morningReceiptNumberingHint,
        }}
      />

      {session?.user?.isSuperAdmin ? null : (
        <ClinicDigestEmailSection
          searchParams={{
            digest: sp.digest,
            reason: sp.reason,
          }}
          userEmail={currentUser?.email ?? ""}
          uiLanguage={uiLanguage === "he" ? "he" : "en"}
        />
      )}

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:p-6">
        <h2 className="text-lg font-medium text-slate-200">{st.pageTitle}</h2>
        <p className="mt-2 text-sm text-slate-400">{st.pageIntro}</p>

        <h3 className="mt-6 text-sm font-semibold text-slate-200">{st.noteLabelsTitle}</h3>
        <p className="mt-1 text-xs text-slate-500">{st.noteLabelsHelp}</p>

        <form action={updateTherapyNoteLabelsFromDashboard} className="mt-3 space-y-3 sm:mt-4 sm:space-y-5">
          {(
            [
              {
                n: 1 as const,
                enKey: "note_1_label",
                heKey: "note_1_label_he",
                visibleKey: "note_1_visible",
                enDefault: settings?.note_1_label ?? "Note 1",
                heDefault: settings?.note_1_label_he ?? "",
                visibleDefault: settings?.note_1_visible ?? true,
              },
              {
                n: 2 as const,
                enKey: "note_2_label",
                heKey: "note_2_label_he",
                visibleKey: "note_2_visible",
                enDefault: settings?.note_2_label ?? "Note 2",
                heDefault: settings?.note_2_label_he ?? "",
                visibleDefault: settings?.note_2_visible ?? true,
              },
              {
                n: 3 as const,
                enKey: "note_3_label",
                heKey: "note_3_label_he",
                visibleKey: "note_3_visible",
                enDefault: settings?.note_3_label ?? "Note 3",
                heDefault: settings?.note_3_label_he ?? "",
                visibleDefault: settings?.note_3_visible ?? true,
              },
            ] as const
          ).map((row) => (
            <fieldset
              key={row.enKey}
              className="space-y-2.5 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 sm:space-y-3 sm:p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {st.noteFieldPlaceholder(row.n)}
                </p>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                  <input
                    type="checkbox"
                    name={row.visibleKey}
                    defaultChecked={row.visibleDefault}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-sky-500"
                  />
                  {st.noteFieldVisible(row.n)}
                </label>
              </div>

              <div className="grid gap-2.5 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    {st.noteFieldEnglish(row.n)}
                  </label>
                  <input
                    name={row.enKey}
                    defaultValue={row.enDefault}
                    placeholder={st.noteFieldPlaceholder(row.n)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-2 text-sm text-slate-100 sm:px-3"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    {st.noteFieldHebrew(row.n)}
                  </label>
                  <input
                    name={row.heKey}
                    defaultValue={row.heDefault}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-2 text-sm text-slate-100 sm:px-3"
                  />
                </div>
              </div>
            </fieldset>
          ))}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 sm:w-auto"
          >
            {st.saveLabels}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:p-6">
        <h2 className="text-lg font-medium text-slate-200">{st.consultTypesTitle}</h2>
        <p className="mt-2 text-sm text-slate-400">{st.consultTypesHelp}</p>

        <ul className="mb-3 mt-3 space-y-2 text-sm sm:mb-4 sm:mt-4">
          {consultationTypes.map((row) => (
            <ConsultationTypeEditRow
              key={row.id}
              id={row.id}
              initialName={row.name}
              initialNameHe={row.name_he ?? ""}
              isActive={row.is_active}
              isSystem={row.is_system}
              usageCount={row._count.consultations}
              labels={{
                fieldEnglish: st.fieldEnglish,
                fieldHebrew: st.fieldHebrew,
                save: c.save,
                remove: st.remove,
                defaultTag: st.defaultTag,
                archivedTag: st.archivedTag,
                unsavedChanges: st.unsavedTypeChanges,
                saved: c.saved,
                saveFailed: st.errGeneric,
                saving: st.savingType,
                confirmRemove: st.confirmRemoveConsultType,
                confirmArchive: st.confirmArchiveConsultType,
              }}
            />
          ))}
        </ul>
        <a
          href="/dashboard/private-clinic/settings?modal=consultation-type-new"
          className="inline-flex w-full items-center justify-center rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 sm:w-auto"
        >
          {st.addConsultationTypeBtn}
        </a>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:p-6">
        <h2 className="text-lg font-medium text-slate-200">{st.expenseCatsTitle}</h2>
        <p className="mt-2 text-sm text-slate-400">{st.expenseCatsHelp}</p>

        <ul className="mb-3 mt-3 space-y-2 text-sm sm:mb-4 sm:mt-4">
          {expenseCategories.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 sm:p-3"
            >
              <form
                action={updateTherapyExpenseCategory}
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <input type="hidden" name="id" value={row.id} />
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{st.fieldEnglish}</label>
                  <input
                    name="name"
                    defaultValue={row.name}
                    required
                    className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{st.fieldHebrew}</label>
                  <input
                    name="name_he"
                    defaultValue={row.name_he ?? ""}
                    className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-600 sm:mt-auto"
                >
                  {c.save}
                </button>
              </form>
              <div className="mt-1.5 flex items-center justify-between sm:mt-2">
                {row.is_system ? (
                  <span className="text-xs text-slate-600">{st.defaultTag}</span>
                ) : (
                  <ConfirmDeleteForm action={deleteTherapyExpenseCategory} className="inline">
                    <input type="hidden" name="id" value={row.id} />
                    <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                      {st.remove}
                    </button>
                  </ConfirmDeleteForm>
                )}
              </div>
            </li>
          ))}
        </ul>
        <a
          href="/dashboard/private-clinic/settings?modal=expense-category-new"
          className="inline-flex w-full items-center justify-center rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 sm:w-auto"
        >
          {st.addExpenseCategoryBtn}
        </a>
      </section>
      {modalMode === "consultation-type-new" ? (
        <DashboardModal
          title={st.addConsultationTypeBtn}
          closeHref="/dashboard/private-clinic/settings"
          closeLabel={c.cancel}
          maxWidthClassName="max-w-xl"
        >
            <form action={createTherapyConsultationType} className="grid gap-2 sm:grid-cols-2">
              <input
                name="name"
                placeholder={st.newTypeName}
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <input
                name="name_he"
                placeholder={st.fieldHebrew}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 sm:col-span-2"
              >
                {st.addConsultationTypeBtn}
              </button>
            </form>
        </DashboardModal>
      ) : null}
      {modalMode === "expense-category-new" ? (
        <DashboardModal
          title={st.addExpenseCategoryBtn}
          closeHref="/dashboard/private-clinic/settings"
          closeLabel={c.cancel}
          maxWidthClassName="max-w-xl"
        >
            <form action={createTherapyExpenseCategory} className="grid gap-2 sm:grid-cols-2">
              <input
                name="name"
                placeholder={st.newCatName}
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <input
                name="name_he"
                placeholder={st.fieldHebrew}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 sm:col-span-2"
              >
                {st.addExpenseCategoryBtn}
              </button>
            </form>
        </DashboardModal>
      ) : null}
    </div>
  );
}
