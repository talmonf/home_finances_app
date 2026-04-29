"use client";

import { useFormStatus } from "react-dom";
import { LoadingSpinner } from "./loading-spinner";

type PendingSubmitButtonWithSpinnerProps = {
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function PendingSubmitButtonWithSpinner({
  label,
  pendingLabel,
  disabled = false,
  className,
}: PendingSubmitButtonWithSpinnerProps) {
  const { pending } = useFormStatus();
  const effectiveDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={effectiveDisabled}
      aria-busy={pending}
      className={className}
    >
      {pending ? <LoadingSpinner className="mr-1.5 h-3.5 w-3.5" /> : null}
      {pending ? pendingLabel ?? label : label}
    </button>
  );
}

