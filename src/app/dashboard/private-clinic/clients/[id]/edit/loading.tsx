import { getCurrentUiLanguage } from "@/lib/auth";
import { LoadingSpinner } from "@/components/loading-spinner";

export const dynamic = "force-dynamic";

export default async function Loading() {
  const uiLanguage = await getCurrentUiLanguage();
  const text = uiLanguage === "he" ? "טוען…" : "Loading…";

  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-200">
      <LoadingSpinner className="h-4 w-4" />
      <span>{text}</span>
    </div>
  );
}

