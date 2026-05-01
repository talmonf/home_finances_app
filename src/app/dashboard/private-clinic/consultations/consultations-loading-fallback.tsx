import { LoadingSpinner } from "@/components/loading-spinner";

/** Sync fallback for `<Suspense>` — stays mounted until async page content resolves (route `loading.tsx` alone cannot). */
export default function ConsultationsLoadingFallback() {
  return (
    <div className="space-y-6 sm:space-y-8" role="status" aria-live="polite" aria-label="Loading consultations">
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <LoadingSpinner className="h-4 w-4 shrink-0 text-sky-400" />
        <span>Loading consultations…</span>
      </p>
    </div>
  );
}
