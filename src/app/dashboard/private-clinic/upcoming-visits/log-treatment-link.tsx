"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { postPrivateClinicUsageAction } from "@/lib/usage-audit/track-client";

type Props = {
  href: string;
  label: string;
  clientId: string;
  appointmentId?: string | null;
};

export function LogTreatmentLink({ href, label, clientId, appointmentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      aria-busy={isPending}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        postPrivateClinicUsageAction("upcomingVisits", "open_log_treatment", {
          client_id: clientId,
          ...(appointmentId ? { appointment_id: appointmentId } : {}),
        });
        startTransition(() => {
          router.push(href);
        });
      }}
      className={`font-medium text-sky-400 hover:text-sky-300 ${isPending ? "opacity-60" : ""}`}
    >
      {label}
    </Link>
  );
}
