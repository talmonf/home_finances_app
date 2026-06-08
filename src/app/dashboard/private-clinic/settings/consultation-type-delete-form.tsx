"use client";

import type { FormHTMLAttributes, ReactNode } from "react";
import { ConfirmDeleteForm } from "@/components/confirm-delete";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

type ConsultationTypeDeleteFormProps = {
  action: ServerFormAction;
  usageCount: number;
  confirmRemove: string;
  confirmArchive: string;
  children: ReactNode;
  className?: string;
} & Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit" | "children">;

export function ConsultationTypeDeleteForm({
  action,
  usageCount,
  confirmRemove,
  confirmArchive,
  children,
  className,
  ...rest
}: ConsultationTypeDeleteFormProps) {
  const message = usageCount > 0 ? confirmArchive : confirmRemove;

  return (
    <ConfirmDeleteForm action={action} className={className} message={message} {...rest}>
      {children}
    </ConfirmDeleteForm>
  );
}
