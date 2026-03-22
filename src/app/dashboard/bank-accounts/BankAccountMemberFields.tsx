type Member = { id: string; full_name: string };

type Props = {
  familyMembers: Member[];
  /** Family member IDs that should start checked */
  selectedIds?: string[];
};

export default function BankAccountMemberFields({ familyMembers, selectedIds = [] }: Props) {
  const selected = new Set(selectedIds);

  if (familyMembers.length === 0) {
    return (
      <div className="sm:col-span-2 lg:col-span-4">
        <h3 className="mb-1 text-xs font-medium text-slate-400">Linked family members</h3>
        <p className="text-xs text-slate-500">Add family members under Family members first.</p>
      </div>
    );
  }

  return (
    <fieldset className="sm:col-span-2 lg:col-span-4">
      <legend className="mb-1 block text-xs font-medium text-slate-400">
        Linked family members (optional)
      </legend>
      <p className="mb-3 text-xs text-slate-500">
        Select household members who use or own this account. You can leave none for a household-only
        account.
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {familyMembers.map((fm) => (
          <label key={fm.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              name="family_member_ids"
              value={fm.id}
              defaultChecked={selected.has(fm.id)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500"
            />
            {fm.full_name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
