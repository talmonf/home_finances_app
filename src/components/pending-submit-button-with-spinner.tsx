"use client";

import { useFormStatus } from "react-dom";
import { LoadingSpinner } from "./loading-spinner";

type PendingSubmitButtonWithSpinnerProps = {
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
  className?: string;
  form?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
};

export function PendingSubmitButtonWithSpinner({
  label,
  pendingLabel,
  disabled = false,
  className,
  form,
  formAction,
}: PendingSubmitButtonWithSpinnerProps) {
  const { pending } = useFormStatus();
  const effectiveDisabled = disabled || pending;

  return (
    <button
      type="submit"
      form={form}
      formAction={formAction}
      disabled={effectiveDisabled}
      aria-busy={pending}
      data-skip-global-text-replace=""
      className={className}
    >
      {pending ? <LoadingSpinner className="mr-1.5 h-3.5 w-3.5" /> : null}
      {pending ? pendingLabel ?? label : label}
    </button>
  );
}

