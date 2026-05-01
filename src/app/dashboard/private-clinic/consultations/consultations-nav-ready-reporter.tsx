"use client";

import { useEffect } from "react";
import { PRIVATE_CLINIC_CONSULTATIONS_NAV_READY_EVENT } from "./consultations-nav-ready-event";

/** Fires once after mount so the clinic nav can keep the Consultations tab spinner until content is ready. */
export function ConsultationsNavReadyReporter() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(PRIVATE_CLINIC_CONSULTATIONS_NAV_READY_EVENT));
  }, []);
  return null;
}
