"use client";

import { useRouter } from "next/navigation";
import type { FormHTMLAttributes, ReactNode } from "react";

export const DELETE_CONFIRM_MESSAGE =
  "This action cannot be undone. Are you sure you want to delete?";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type ConfirmDeleteFormProps = {
  action: ServerFormAction;
  children: ReactNode;
  className?: string;
  message?: string;
} & Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit" | "children">;

export function ConfirmDeleteForm({
  action,
  children,
  className,
  message = DELETE_CONFIRM_MESSAGE,
  ...rest
}: ConfirmDeleteFormProps) {
  return (
    <form
      {...rest}
      className={className}
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}

type ConfirmDeleteFormActionButtonProps = {
  formAction: ServerFormAction;
  children: ReactNode;
  className?: string;
  message?: string;
};

/**
 * Use when the delete action is a separate `formAction` on a button inside another form
 * (Next.js server actions). Native `formAction` cannot be wrapped with confirm otherwise.
 */
export function ConfirmDeleteFormActionButton({
  formAction,
  children,
  className,
  message = DELETE_CONFIRM_MESSAGE,
}: ConfirmDeleteFormActionButtonProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (!window.confirm(message)) return;
        await formAction(new FormData());
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
