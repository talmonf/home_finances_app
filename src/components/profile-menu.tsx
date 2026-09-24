"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type ProfileMenuProps = {
  menuLabel: string;
  signedInAs: string;
  signedInName: string;
  changePasswordLabel: string;
  signOutLabel: string;
  signOutConfirm: string;
  isSuperAdmin: boolean;
  superAdminLabel: string;
};

export function ProfileMenu({
  menuLabel,
  signedInAs,
  signedInName,
  changePasswordLabel,
  signOutLabel,
  signOutConfirm,
  isSuperAdmin,
  superAdminLabel,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) return;
      if (!containerRef.current?.contains(targetNode)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
      >
        {menuLabel}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-30 mt-2 flex min-w-52 flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900/95 p-2 shadow-xl"
        >
          <p className="px-2 py-1 text-xs text-slate-400">
            {signedInAs}{" "}
            <span className="font-medium text-slate-50">{signedInName}</span>
            {isSuperAdmin ? (
              <span className="ms-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                {superAdminLabel}
              </span>
            ) : null}
          </p>
          <Link
            role="menuitem"
            href="/change-password"
            onClick={() => setOpen(false)}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800 hover:text-sky-300"
          >
            {changePasswordLabel}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="rounded-lg px-2 py-1.5 text-start text-xs font-medium text-slate-100 hover:bg-slate-800 hover:text-sky-300"
            onClick={async () => {
              if (!window.confirm(signOutConfirm)) return;
              await signOut({ callbackUrl: "/" });
            }}
          >
            {signOutLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
