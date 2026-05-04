"use client";

import type { ReactNode } from "react";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

export function PetrolFillupShellForm({
  action,
  formKey,
  className,
  children,
}: {
  action: ServerFormAction;
  formKey: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      key={formKey}
      action={action}
      className={className}
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const filled = String(fd.get("filled_at") ?? "").trim();
        if (!filled) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
