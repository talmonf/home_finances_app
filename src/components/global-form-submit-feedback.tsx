"use client";

import { useEffect } from "react";

function defaultPendingLabel(): string {
  if (typeof document === "undefined") return "Saving...";
  return document.documentElement.lang === "he" ? "מעבד..." : "Working...";
}

export function GlobalFormSubmitFeedback() {
  useEffect(() => {
    const onSubmit = (event: Event) => {
      const submitEvent = event as SubmitEvent;
      const form = submitEvent.target as HTMLFormElement | null;
      if (!form) return;

      const submitter = submitEvent.submitter as HTMLButtonElement | HTMLInputElement | null;
      const pendingLabel = submitter?.getAttribute("data-pending-label") || defaultPendingLabel();
      const submitButtons = Array.from(
        form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
          'button[type="submit"],input[type="submit"]',
        ),
      );

      submitButtons.forEach((button) => {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
      });

      if (submitter && "textContent" in submitter && submitter.textContent !== null) {
        submitter.setAttribute("data-original-label", submitter.textContent);
        submitter.textContent = pendingLabel;
      }
      if (submitter instanceof HTMLInputElement) {
        submitter.setAttribute("data-original-label", submitter.value);
        submitter.value = pendingLabel;
      }
    };

    window.addEventListener("submit", onSubmit, true);
    return () => window.removeEventListener("submit", onSubmit, true);
  }, []);

  return null;
}
