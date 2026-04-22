import { getAuthSession, prisma, requireSuperAdmin } from "@/lib/auth";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-sections";
import { passwordPolicyHint, validatePassword } from "@/lib/password-policy";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { CreateHouseholdModal } from "./create-household-modal";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function HouseholdsAdminPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const households = await prisma.households.findMany({
    orderBy: { created_at: "desc" },
    include: {
      _count: { select: { users: true } },
    },
  });

  async function createHousehold(formData: FormData) {
    "use server";

    await requireSuperAdmin();

    const name = (formData.get("name") as string | null)?.trim();
    const country = ((formData.get("country") as string | null) || "IL").trim();
    const currency =
      ((formData.get("primary_currency") as string | null) || "ILS").trim();
    const privateClinicModuleOnly = formData.get("private_clinic_module_only") === "on";
    const therapistFullName = (formData.get("therapist_full_name") as string | null)?.trim();
    const therapistEmail = (formData.get("therapist_email") as string | null)?.trim();
    const therapistPassword = (formData.get("therapist_password") as string | null) ?? "";

    if (!name) {
      redirect("/admin/households?error=Household+name+is+required");
    }

    if (privateClinicModuleOnly) {
      if (!therapistFullName || !therapistEmail || !therapistPassword) {
        redirect(
          `/admin/households?error=${encodeURIComponent("Therapist name, email, and password are required for a clinic household.")}`,
        );
      }
      const pwCheck = validatePassword(therapistPassword);
      if (!pwCheck.ok) {
        redirect(
          `/admin/households?error=${encodeURIComponent(pwCheck.errors[0] ?? "Invalid password.")}`,
        );
      }
      const emailTaken = await prisma.users.findUnique({
        where: { email: therapistEmail },
        select: { id: true },
      });
      if (emailTaken) {
        redirect(
          `/admin/households?error=${encodeURIComponent("That email is already in use by another user.")}`,
        );
      }
    }

    const householdId = crypto.randomUUID();
    const passwordHash = privateClinicModuleOnly
      ? await bcrypt.hash(therapistPassword, 12)
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.households.create({
        data: {
          id: householdId,
          name,
          country,
          primary_currency: currency,
        },
      });

      if (privateClinicModuleOnly) {
        for (const section of DASHBOARD_SECTIONS) {
          const enabled = section.id === "privateClinic";
          await tx.household_enabled_sections.upsert({
            where: {
              household_id_section_id: {
                household_id: householdId,
                section_id: section.id,
              },
            },
            update: { enabled },
            create: {
              id: crypto.randomUUID(),
              household_id: householdId,
              section_id: section.id,
              enabled,
            },
          });
        }

        const familyMemberId = crypto.randomUUID();
        await tx.family_members.create({
          data: {
            id: familyMemberId,
            household_id: householdId,
            full_name: therapistFullName!,
            is_active: true,
          },
        });

        const now = new Date();
        await tx.users.create({
          data: {
            id: crypto.randomUUID(),
            household_id: householdId,
            email: therapistEmail!,
            password_hash: passwordHash!,
            full_name: therapistFullName!,
            role: "member",
            user_type: "family_member",
            family_member_id: familyMemberId,
            is_active: true,
            must_change_password: true,
            password_changed_at: now,
          },
        });

        const therapyExisting = await tx.therapy_settings.findUnique({
          where: { household_id: householdId },
        });
        if (!therapyExisting) {
          await tx.therapy_settings.create({
            data: {
              id: crypto.randomUUID(),
              household_id: householdId,
            },
          });
        }
      }
    });

    revalidatePath("/admin/households");
    revalidatePath(`/admin/households/${householdId}`);
    if (privateClinicModuleOnly) {
      redirect(`/admin/households/${householdId}?created=1`);
    }
    redirect("/admin/households?created=1");
  }

  async function toggleHouseholdActive(id: string, nextActive: boolean) {
    "use server";

    await requireSuperAdmin();

    await prisma.households.update({
      where: { id },
      data: { is_active: nextActive },
    });

    revalidatePath("/admin/households");
    redirect("/admin/households?updated=1");
  }

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-50">
                Households (Super Admin)
              </h1>
              <p className="text-sm text-slate-400">
                Create and manage all households on the platform.
              </p>
            </div>
            <CreateHouseholdModal
              action={createHousehold}
              passwordPolicyHintText={passwordPolicyHint()}
            />
          </div>

          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.deleted ||
            resolvedSearchParams?.error) && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/60 text-emerald-100"
              }`}
            >
              <span>
                {resolvedSearchParams.error
                  ? decodeURIComponent(resolvedSearchParams.error)
                  : resolvedSearchParams.created
                    ? "Household created successfully."
                    : resolvedSearchParams.deleted
                      ? "Household deleted successfully."
                    : "Household updated successfully."}
              </span>
              <Link
                href="/admin/households"
                className="ml-4 text-[11px] font-medium underline underline-offset-2"
              >
                Dismiss
              </Link>
            </div>
          )}
        </header>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">
            Existing households
          </h2>
          {households.length === 0 ? (
            <p className="text-sm text-slate-400">
              No households have been created yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Country</th>
                    <th className="py-2 pr-4">Currency</th>
                    <th className="py-2 pr-4">Users</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {households.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-slate-800 last:border-0"
                    >
                      <td className="py-2 pr-4">{h.name}</td>
                      <td className="py-2 pr-4">{h.country}</td>
                      <td className="py-2 pr-4">{h.primary_currency}</td>
                      <td className="py-2 pr-4 text-sm tabular-nums">
                        {h._count.users > 0 ? (
                          <Link
                            href={`/admin/households/${h.id}`}
                            className="font-medium text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:text-sky-200"
                          >
                            {h._count.users}
                          </Link>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-400">
                        {h.created_at.toISOString().slice(0, 10)}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {h.is_active ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-slate-300">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="flex flex-wrap items-center justify-end gap-2 py-2 pr-4">
                        <Link
                          href={`/admin/households/${h.id}/edit`}
                          className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/households/${h.id}`}
                          className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                        >
                          Manage users
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await toggleHouseholdActive(h.id, !h.is_active);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
                          >
                            {h.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

