import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FamilyMemberBirthdateFields } from "@/components/family-member-birthdate-fields";
import { FamilyMemberRelationshipFields } from "@/components/family-member-relationship-fields";
import { updateFamilyMember } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function EditFamilyMemberPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [member, users, allMembers] = await Promise.all([
    prisma.family_members.findFirst({
      where: { id, household_id: householdId },
      include: { users: true },
    }),
    prisma.users.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId },
      select: { id: true, full_name: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  if (!member) {
    redirect("/dashboard/family-members?error=Not+found");
  }

  const linkedUserId = member.users[0]?.id ?? "";

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-screen-2xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/family-members"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה לבני משפחה →" : "← Back to family members"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{isHebrew ? "עריכת בן משפחה" : "Edit family member"}</h1>
          <p className="text-sm text-slate-400">
            Update details and optionally link a household user account.
          </p>
          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
            </div>
          )}
        </header>

        <form
          action={updateFamilyMember}
          className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
        >
          <input type="hidden" name="id" value={member.id} />
          <div>
            <label htmlFor="full_name" className="mb-1 block text-xs font-medium text-slate-400">
              Full name
            </label>
            <input
              id="full_name"
              name="full_name"
              required
              defaultValue={member.full_name}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
            />
          </div>
          <FamilyMemberBirthdateFields
            isHebrew={isHebrew}
            hebrewPersistedInDb={
              member.hebrew_date_of_birth_day != null &&
              member.hebrew_date_of_birth_month != null
            }
            defaultGregorian={
              member.date_of_birth ? member.date_of_birth.toISOString().slice(0, 10) : ""
            }
            defaultHebrewDay={member.hebrew_date_of_birth_day}
            defaultHebrewMonth={member.hebrew_date_of_birth_month}
            defaultHebrewYear={member.hebrew_date_of_birth_year}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="id_number" className="mb-1 block text-xs font-medium text-slate-400">
                ID number
              </label>
              <input
                id="id_number"
                name="id_number"
                defaultValue={member.id_number ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-xs font-medium text-slate-400">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={member.phone ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-slate-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={member.email ?? ""}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FamilyMemberRelationshipFields
              isHebrew={isHebrew}
              members={allMembers}
              excludeMemberId={member.id}
              defaultRelationship={member.relationship ?? ""}
              defaultParentAId={member.parent_a_family_member_id}
              defaultParentBId={member.parent_b_family_member_id}
            />
            <div>
              <label htmlFor="user_id" className="mb-1 block text-xs font-medium text-slate-400">
                Linked user (optional)
              </label>
              <select
                id="user_id"
                name="user_id"
                defaultValue={linkedUserId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">— None —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "הערות" : "Notes"}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={member.notes ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/dashboard/family-members"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              {isHebrew ? "ביטול" : "Cancel"}
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {isHebrew ? "שמירת שינויים" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

