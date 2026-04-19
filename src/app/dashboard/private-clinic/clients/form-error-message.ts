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
    "rel-missing": cl.errRelMissing,
    "rel-self": cl.errRelSelf,
    "rel-type": cl.errRelType,
    "rel-client": cl.errRelClient,
    "rel-duplicate": cl.errRelDuplicate,
    "rel-notfound": cl.errRelNotfound,
  };
  return map[key] ?? decodeURIComponent(key.replace(/\+/g, " "));
}
