"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  className?: string;
};

export function PendingSubmitButton({
  label,
  pendingLabel,
  className,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      data-pending-label={pendingLabel}
      className={className}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
