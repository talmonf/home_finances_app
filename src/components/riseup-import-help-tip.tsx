"use client";

import type { ReactNode } from "react";

type Props = {
  tip: string;
  children: ReactNode;
  className?: string;
  block?: boolean;
};

/** Desktop hover tooltip for RiseUp import UI. Also sets native title as fallback. */
export function RiseUpImportHelpTip({ tip, children, className, block }: Props) {
  if (!tip) {
    return <>{children}</>;
  }

  const Wrapper = block ? "div" : "span";

  return (
    <Wrapper
      className={`group/riseup-tip relative cursor-help ${block ? "block" : "inline-flex"} max-w-full ${className ?? ""}`}
      title={tip}
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 z-[200] hidden w-max max-w-md rounded-lg border border-violet-700/80 bg-slate-950 px-3 py-2 text-xs font-normal leading-relaxed text-slate-100 shadow-2xl ring-1 ring-slate-700 group-hover/riseup-tip:block group-focus-within/riseup-tip:block"
      >
        {tip}
      </span>
    </Wrapper>
  );
}
