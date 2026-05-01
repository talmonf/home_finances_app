import { getCurrentUiLanguage } from "@/lib/auth";
import { LoadingSpinner } from "@/components/loading-spinner";

export const dynamic = "force-dynamic";

/** Top-aligned like the real page intro — avoids a lone spinner in the middle of the viewport. */
export default async function ConsultationsLoading() {
  const uiLanguage = await getCurrentUiLanguage();
  const message = uiLanguage === "he" ? "טוען ייעוצים…" : "Loading consultations…";
  const aria = uiLanguage === "he" ? "טוען ייעוצים" : "Loading consultations";

  return (
    <div className="space-y-6 sm:space-y-8" role="status" aria-live="polite" aria-label={aria}>
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <LoadingSpinner className="h-4 w-4 shrink-0 text-sky-400" />
        <span>{message}</span>
      </p>
    </div>
  );
}
