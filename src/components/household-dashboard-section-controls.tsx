"use client";

function setCheckboxesInContainer(containerId: string, checked: boolean) {
  const root = document.getElementById(containerId);
  if (!root) return;
  root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name^="section_"]').forEach((input) => {
    input.checked = checked;
  });
}

export function HouseholdSectionGroupActions({ containerId }: { containerId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setCheckboxesInContainer(containerId, true)}
        className="rounded-md border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-sky-500 hover:text-sky-200"
      >
        Enable all
      </button>
      <button
        type="button"
        onClick={() => setCheckboxesInContainer(containerId, false)}
        className="rounded-md border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-sky-500 hover:text-sky-200"
      >
        Disable all
      </button>
    </div>
  );
}

const PRIVATE_CLINIC_SECTION_NAME = "section_privateClinic";

/** Sets every dashboard section checkbox: only Private clinic on, all others off. */
export function HouseholdPrivateClinicOnlyButton() {
  return (
    <button
      type="button"
      onClick={() => {
        const root = document.getElementById("household-enabled-dashboard-sections");
        if (!root) return;
        root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name^="section_"]').forEach((input) => {
          input.checked = input.name === PRIVATE_CLINIC_SECTION_NAME;
        });
      }}
      className="rounded-md border border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-sky-500 hover:text-sky-200"
    >
      Private clinic module only
    </button>
  );
}
