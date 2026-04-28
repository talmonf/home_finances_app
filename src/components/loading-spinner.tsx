"use client";

type LoadingSpinnerProps = {
  className?: string;
};

export function LoadingSpinner({ className = "h-3.5 w-3.5" }: LoadingSpinnerProps) {
  return (
    <svg className={`${className} animate-spin`.trim()} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" className="opacity-25" stroke="currentColor" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        className="opacity-90"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
