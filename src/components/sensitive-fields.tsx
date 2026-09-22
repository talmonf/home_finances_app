import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { OBFUSCATED } from "@/lib/privacy-display";

function realString(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

/** Edit-form text field. When privacy mode is on, the visible control shows a mask and a hidden input keeps the real value. */
export function SensitiveTextInput({
  obfuscate,
  name,
  value,
  ...rest
}: {
  obfuscate: boolean;
  name: string;
  value: string | number | null | undefined;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "defaultValue">) {
  const real = realString(value);
  if (!obfuscate || real.trim() === "") {
    return <input {...rest} name={name} defaultValue={real} />;
  }
  const { type: _ignoredType, form, ...visibleRest } = rest;
  return (
    <>
      <input type="hidden" name={name} value={real} form={form} />
      <input {...visibleRest} form={form} type="text" value={OBFUSCATED} readOnly />
    </>
  );
}

/** Edit-form textarea. Same preserve-on-save behavior as SensitiveTextInput. */
export function SensitiveTextarea({
  obfuscate,
  name,
  value,
  ...rest
}: {
  obfuscate: boolean;
  name: string;
  value: string | null | undefined;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "value" | "defaultValue">) {
  const real = value ?? "";
  if (!obfuscate || real.trim() === "") {
    return <textarea {...rest} name={name} defaultValue={real} />;
  }
  const { form, ...visibleRest } = rest;
  return (
    <>
      <input type="hidden" name={name} value={real} form={form} />
      <textarea {...visibleRest} form={form} value={OBFUSCATED} readOnly />
    </>
  );
}
