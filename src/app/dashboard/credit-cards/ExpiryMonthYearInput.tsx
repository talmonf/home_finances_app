"use client";

import { useState } from "react";

type ExpiryMonthYearInputProps = {
  id: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
};

function normalizeExpiryInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function ExpiryMonthYearInput({
  id,
  name,
  required,
  defaultValue = "",
  className,
  placeholder,
}: ExpiryMonthYearInputProps) {
  const [value, setValue] = useState(normalizeExpiryInput(defaultValue));

  return (
    <input
      id={id}
      name={name}
      required={required}
      inputMode="numeric"
      pattern="(0[1-9]|1[0-2])\/\d{2}"
      maxLength={5}
      value={value}
      onChange={(e) => setValue(normalizeExpiryInput(e.target.value))}
      placeholder={placeholder}
      className={className}
    />
  );
}
