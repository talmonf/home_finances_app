"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function CarServiceAttachmentDeleteButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(async () => {
    if (
      !window.confirm(
        "Remove this file from the app and delete it from storage? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cars/services/${serviceId}/attachment`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Remove failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Remove failed");
    } finally {
      setBusy(false);
    }
  }, [serviceId, router]);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="w-fit rounded border border-rose-500/50 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-900/50 disabled:opacity-60"
      >
        {busy ? "Removing…" : "Delete file from storage"}
      </button>
      {error ? (
        <span className="text-xs text-rose-300" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
