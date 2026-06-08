"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SettingsConsultationTypeFlashPopupProps = {
  messages: {
    saved: string;
    savedRemoved: string;
    savedArchived: string;
    error: string;
  };
};

export function SettingsConsultationTypeFlashPopup({ messages }: SettingsConsultationTypeFlashPopupProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const saved = searchParams.get("saved");
    const error = searchParams.get("error");
    let message: string | null = null;

    if (saved === "ctype-archived") message = messages.savedArchived;
    else if (saved === "ctype-removed") message = messages.savedRemoved;
    else if (saved === "ctype") message = messages.saved;
    else if (error === "ctype") message = messages.error;

    if (!message) return;

    window.alert(message);

    const next = new URLSearchParams(searchParams.toString());
    next.delete("saved");
    next.delete("error");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [messages, pathname, router, searchParams]);

  return null;
}
