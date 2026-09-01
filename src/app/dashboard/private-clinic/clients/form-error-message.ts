import { privateClinicClients } from "@/lib/private-clinic-i18n";

type ClStrings = ReturnType<typeof privateClinicClients>;

export function therapyClientFormErrorMessage(error: string | undefined, cl: ClStrings): string | null {
  if (!error?.trim()) return null;
  const key = error.trim();
  const map: Record<string, string> = {
    missing: cl.errMissing,
    job: cl.errJob,
    program: cl.errProgram,
    "visit-type": cl.errVisitType,
    notfound: cl.errNotfound,
    range: cl.errRange,
    "end-reason": cl.errEndReason,
    "save-failed": cl.errSaveFailed,
    "has-treatments": cl.errHasTreatments,
    "rel-missing": cl.errRelMissing,
    "rel-self": cl.errRelSelf,
    "rel-type": cl.errRelType,
    "rel-client": cl.errRelClient,
    "rel-duplicate": cl.errRelDuplicate,
    "rel-notfound": cl.errRelNotfound,
    "hold-start": cl.errHoldStart,
    "hold-dates": cl.errHoldDates,
    "hold-overlap": cl.errHoldOverlap,
    "hold-open": cl.errHoldOpen,
    "hold-notfound": cl.errHoldNotfound,
    "hold-no-open": cl.errHoldNoOpen,
    "hold-reason": cl.errHoldReason,
  };
  return map[key] ?? decodeURIComponent(key.replace(/\+/g, " "));
}
