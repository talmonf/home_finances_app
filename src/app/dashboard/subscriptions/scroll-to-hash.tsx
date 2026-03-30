"use client";

import { useEffect } from "react";

export function ScrollToHash() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    // Decode in case the browser encoded the hash
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id) return;

    const el = document.getElementById(id);
    if (!el) return;

    // Give the browser a tick to finish layout before scrolling.
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, []);

  return null;
}

