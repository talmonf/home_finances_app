"use client";

import { PasswordInputWithToggle } from "@/components/PasswordInputWithToggle";
import { useId, useState } from "react";

type Props = {
  passwordPolicyHintText: string;
};

export function PrivateClinicTherapistFields({ passwordPolicyHintText }: Props) {
  const [privateClinicOnly, setPrivateClinicOnly] = useState(false);
  const baseId = useId();

  return (
    <>
      <div className="md:col-span-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="private_clinic_module_only"
            checked={privateClinicOnly}
            onChange={(e) => setPrivateClinicOnly(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
          />
          <span className="text-sm text-slate-300">
            <span className="font-medium text-slate-200">Private clinic module only</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Enable only the Private clinic dashboard section for this household (all other sections off). You can
              change this later under Edit household. When checked, enter the therapist account below (family member and
              user are created automatically).
            </span>
          </span>
        </label>
      </div>

      {privateClinicOnly ? (
        <div className="md:col-span-3 grid gap-4 rounded-lg border border-sky-900/50 bg-slate-950/50 p-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label htmlFor={`${baseId}-therapist-name`} className="mb-1 block text-xs font-medium text-slate-300">
              Therapist name
            </label>
            <input
              id={`${baseId}-therapist-name`}
              name="therapist_full_name"
              required={privateClinicOnly}
              autoComplete="name"
              placeholder="e.g. Dr. Jane Cohen"
              className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="md:col-span-1">
            <label htmlFor={`${baseId}-therapist-email`} className="mb-1 block text-xs font-medium text-slate-300">
              Therapist email
            </label>
            <input
              id={`${baseId}-therapist-email`}
              name="therapist_email"
              type="email"
              required={privateClinicOnly}
              autoComplete="email"
              className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="md:col-span-1">
            <label htmlFor={`${baseId}-therapist-password`} className="mb-1 block text-xs font-medium text-slate-300">
              Password
            </label>
            <PasswordInputWithToggle
              id={`${baseId}-therapist-password`}
              name="therapist_password"
              required={privateClinicOnly}
              autoComplete="new-password"
              className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              {passwordPolicyHintText} User must change it on first sign-in.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
