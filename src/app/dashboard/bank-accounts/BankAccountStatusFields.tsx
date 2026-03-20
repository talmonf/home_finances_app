"use client";

import { useMemo, useState } from "react";

type Props = {
  initialIsActive: boolean;
  initialDateClosed?: string | null;
};

export default function BankAccountStatusFields({ initialIsActive, initialDateClosed }: Props) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [dateClosed, setDateClosed] = useState(initialDateClosed ?? "");

  const dateClosedInputValue = useMemo(() => dateClosed, [dateClosed]);

  return (
    <>
      <div>
        <label htmlFor="is_active" className="mb-1 block text-xs font-medium text-slate-400">
          Status
        </label>
        <select
          id="is_active"
          name="is_active"
          value={isActive ? "true" : "false"}
          onChange={(e) => {
            const next = e.target.value === "false" ? false : true;
            setIsActive(next);
            if (next) setDateClosed("");
          }}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="true">Active</option>
          <option value="false">Deactive</option>
        </select>
      </div>

      {!isActive && (
        <div>
          <label htmlFor="date_closed" className="mb-1 block text-xs font-medium text-slate-400">
            Date Closed
          </label>
          <input
            id="date_closed"
            name="date_closed"
            type="date"
            value={dateClosedInputValue}
            onChange={(e) => setDateClosed(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      )}
    </>
  );
}

