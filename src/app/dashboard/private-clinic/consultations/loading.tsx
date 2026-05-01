import { LoadingSpinner } from "@/components/loading-spinner";

/** Visible fallback while the consultations server page resolves (nav tab spinner hides as soon as the URL matches). */
export default function ConsultationsLoading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-slate-400"
      role="status"
      aria-live="polite"
      aria-label="Loading consultations"
    >
      <LoadingSpinner className="h-8 w-8 text-sky-400" />
      <span className="sr-only">Loading consultations…</span>
    </div>
  );
}
