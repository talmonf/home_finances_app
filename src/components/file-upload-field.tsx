"use client";

import { useEffect, useId, useState, type RefObject } from "react";

type FileUploadFieldProps = {
  id?: string;
  name?: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  onFileChange?: (file: File | null) => void;
  buttonLabel?: string;
  noFileText?: string;
  fileName?: string | null;
  resetSignal?: string | number;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
  buttonClassName?: string;
  textClassName?: string;
};

export function FileUploadField({
  id,
  name,
  accept,
  required = false,
  disabled = false,
  onFileChange,
  buttonLabel = "Choose file",
  noFileText = "No file selected",
  fileName,
  resetSignal,
  inputRef,
  className = "",
  buttonClassName = "inline-flex cursor-pointer rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700",
  textClassName = "max-w-full truncate text-xs text-slate-300",
}: FileUploadFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `file-upload-${generatedId}`;
  const [internalFileName, setInternalFileName] = useState<string | null>(null);

  useEffect(() => {
    if (resetSignal !== undefined) {
      setInternalFileName(null);
    }
  }, [resetSignal]);

  const shownFileName = fileName ?? internalFileName;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        className="pointer-events-none absolute opacity-0"
        style={{ width: 1, height: 1, margin: -1, padding: 0, border: 0, clip: "rect(0 0 0 0)", overflow: "hidden" }}
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          setInternalFileName(nextFile?.name ?? null);
          onFileChange?.(nextFile);
        }}
      />
      <label htmlFor={inputId} className={disabled ? `${buttonClassName} cursor-not-allowed opacity-60` : buttonClassName}>
        {buttonLabel}
      </label>
      <span className={textClassName}>{shownFileName || noFileText}</span>
    </div>
  );
}
