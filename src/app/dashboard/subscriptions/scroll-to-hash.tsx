"use client";

import { useEffect } from "react";

type ScrollToTargetProps = {
  targetId: string | null;
};

export function ScrollToTarget({ targetId }: ScrollToTargetProps) {
  useEffect(() => {
    if (!targetId) return;

    let attempts = 0;
    const maxAttempts = 8;
    const intervalMs = 150;

    const tryScroll = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        setTimeout(tryScroll, intervalMs);
      }
    };

    requestAnimationFrame(tryScroll);
  }, [targetId]);

  return null;
}

