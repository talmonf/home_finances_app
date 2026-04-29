"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  privateClinicCommon,
  privateClinicGettingStarted,
  privateClinicJobs,
} from "@/lib/private-clinic-i18n";
import type { UiLanguage } from "@/lib/ui-language";
import { JobModalForm } from "../jobs/job-modal-form";

const GS_BASE = "/dashboard/private-clinic/getting-started";

function BoldInline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((seg, i) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-slate-100">
              {seg.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{seg}</span>;
      })}
    </>
  );
}

type Gs = ReturnType<typeof privateClinicGettingStarted>;

type HouseholdMemberOption = { id: string; full_name: string };

export function GettingStartedClient({
  gs,
  uiLanguage,
  showWelcomeBanner,
  familyTherapyEnabled,
  canAddJob,
  familyMemberId,
  householdMembers,
  createTherapyJob,
}: {
  gs: Gs;
  uiLanguage: UiLanguage;
  showWelcomeBanner: boolean;
  familyTherapyEnabled: boolean;
  canAddJob: boolean;
  familyMemberId: string | null;
  householdMembers: HouseholdMemberOption[];
  createTherapyJob: (formData: FormData) => void | Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const c = privateClinicCommon(uiLanguage);
  const j = privateClinicJobs(uiLanguage);

  const jobError = searchParams.get("error");
  const jobSaved = searchParams.get("jobSaved") === "1";
  const [jobModalOpen, setJobModalOpen] = useState(Boolean(jobError));

  const closeJobModal = useCallback(() => {
    setJobModalOpen(false);
    router.replace(GS_BASE);
  }, [router]);

  const redirectOnSuccess = useMemo(() => `${GS_BASE}?jobSaved=1`, []);
  const redirectOnError = useMemo(() => GS_BASE, []);

  return (
    <div className="space-y-8">
      {showWelcomeBanner ? (
        <div className="rounded-xl border border-sky-600/50 bg-sky-950/40 px-4 py-3 text-sm text-sky-100">
          <p className="font-semibold">{gs.welcomeTitle}</p>
          <p className="mt-1 text-sky-100/95">
            <BoldInline text={gs.welcomeBody} />
          </p>
        </div>
      ) : null}

      {jobSaved ? (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {gs.jobSavedToast}
        </p>
      ) : null}

      {jobError ? (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {c.saveFailedGeneric}
        </p>
      ) : null}

      <section className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-50">{gs.pageTitle}</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          <BoldInline text={gs.moreMenuHint} />
        </p>

        <ol className="list-decimal space-y-3 ps-5 text-sm text-slate-300">
          <li>
            <span>{gs.step1Lead} </span>
            {canAddJob ? (
              <button
                type="button"
                onClick={() => setJobModalOpen(true)}
                className="font-semibold text-sky-400 underline decoration-sky-500/60 underline-offset-2 hover:text-sky-300"
              >
                {gs.step1JobsLink}
              </button>
            ) : (
              <Link
                href="/dashboard/private-clinic/jobs?modal=new"
                className="font-semibold text-sky-400 underline decoration-sky-500/60 underline-offset-2 hover:text-sky-300"
              >
                {gs.step1JobsLink}
              </Link>
            )}
            <span> {gs.step1After}</span>
          </li>
          <li>
            <BoldInline text={gs.step2} />
            <div className="mt-2">
              <Link
                href="/dashboard/private-clinic/programs?modal=new"
                className="text-sky-400 hover:text-sky-300"
              >
                {uiLanguage === "he" ? "תוכניות — יצירת תוכנית" : "Programs — create a program"}
              </Link>
            </div>
          </li>
          <li>
            <BoldInline text={gs.step3} />
            <div className="mt-2">
              <Link href="/dashboard/private-clinic/clients" className="text-sky-400 hover:text-sky-300">
                {uiLanguage === "he" ? "מסך הלקוחות" : "Clients"}
              </Link>
            </div>
          </li>
          <li>
            <BoldInline text={gs.step4} />
            <div className="mt-2">
              <Link href="/dashboard/private-clinic/treatments" className="text-sky-400 hover:text-sky-300">
                {uiLanguage === "he" ? "טיפולים" : "Treatments"}
              </Link>
            </div>
          </li>
        </ol>
        <p className="text-sm leading-relaxed text-slate-400">
          <BoldInline text={gs.uiLanguageBody} />
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{gs.twoWaysTitle}</h2>
        <ul className="list-disc space-y-2 ps-5 text-sm text-slate-300">
          <li>
            <BoldInline text={gs.wayAppointments} />
            <div className="mt-1">
              <Link href="/dashboard/private-clinic/appointments" className="text-sky-400 hover:text-sky-300">
                {uiLanguage === "he" ? "תורים" : "Appointments"}
              </Link>
            </div>
          </li>
          <li>
            <BoldInline text={gs.wayCadence} />
            <div className="mt-1">
              <Link
                href="/dashboard/private-clinic/upcoming-visits"
                className="text-sky-400 hover:text-sky-300"
              >
                {uiLanguage === "he" ? "ביקורים קרובים" : "Upcoming visits"}
              </Link>
            </div>
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium text-slate-200">{gs.googleTitle}</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          <BoldInline text={gs.googleBody} />
        </p>
      </section>

      <details className="group rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <summary className="cursor-pointer text-base font-medium text-slate-200 group-open:mb-3">
          {gs.advancedSummary}
        </summary>
        <div className="space-y-3 text-sm leading-relaxed text-slate-400">
          <p>
            <BoldInline text={gs.advCalendar} />
          </p>
          <p>
            <BoldInline text={gs.advData} />
          </p>
          <p>
            <BoldInline text={gs.advBulkImport} />
          </p>
          <p>
            <BoldInline text={gs.advReceiptsTreatments} />
          </p>
          <p>
            <BoldInline text={gs.advOps} />
          </p>
          <p>
            <BoldInline text={gs.advDemoPrivacy} />
          </p>

          {familyTherapyEnabled ? (
            <div className="space-y-2 border-t border-slate-700 pt-3">
              <h3 className="text-sm font-semibold text-slate-200">{gs.familiesWhenEnabledTitle}</h3>
              <p>
                <BoldInline text={gs.familiesWhenEnabledBody} />
              </p>
              <Link href="/dashboard/private-clinic/families" className="text-sky-400 hover:text-sky-300">
                {uiLanguage === "he" ? "משפחות" : "Families"}
              </Link>
            </div>
          ) : (
            <div className="space-y-2 border-t border-slate-700 pt-3">
              <p>
                <BoldInline text={gs.familiesWhenDisabled} />
              </p>
            </div>
          )}
        </div>
      </details>

      {jobModalOpen && canAddJob ? (
        <JobModalForm
          action={createTherapyJob}
          householdMembers={householdMembers}
          familyMemberId={familyMemberId}
          closeHref={GS_BASE}
          redirectOnSuccess={redirectOnSuccess}
          redirectOnError={redirectOnError}
          c={c}
          j={j}
          uiLanguage={uiLanguage}
          onCancel={closeJobModal}
          overlayZIndexClassName="z-[50]"
        />
      ) : null}
    </div>
  );
}
