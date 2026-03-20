"use client";

import { useState } from "react";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function formatDigits(digits: string) {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

type SortCodeInputProps = {
  id: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
};

export default function SortCodeInput({
  id,
  name,
  defaultValue,
  placeholder,
  className,
}: SortCodeInputProps) {
  const [value, setValue] = useState(() => formatDigits(digitsOnly(defaultValue ?? "")));

  return (
    <input
      id={id}
      name={name}
      value={value}
      onChange={(e) => setValue(formatDigits(digitsOnly(e.target.value)))}
      maxLength={8} // 6 digits + 2 hyphens
      inputMode="text"
      autoComplete="off"
      placeholder={placeholder}
      className={className ?? "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"}
    />
  );
}

