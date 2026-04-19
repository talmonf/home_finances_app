import { prisma } from "@/lib/auth";
import { formatJobDisplayLabel } from "@/lib/job-label";
import {
  jobWhereInPrivateClinicModule,
  jobsWhereActiveForPrivateClinicPickers,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";

export type TherapyClientFormJobOption = { id: string; label: string };
export type TherapyClientRelationshipPickerOption = { id: string; label: string };
export type TherapyClientFormProgramOption = {
  id: string;
  jobId: string;
  label: string;
  visits_per_period_count: number | null;
  visits_per_period_weeks: number | null;
};

export async function loadTherapyClientFormOptions(params: {
  householdId: string;
  familyMemberId: string | null;
}): Promise<{ jobs: TherapyClientFormJobOption[]; programs: TherapyClientFormProgramOption[] }> {
  const { householdId, familyMemberId } = params;

  const usedJobIds = new Set<string>();
  const usedProgramIds = new Set<string>();

  const allClients = await prisma.therapy_clients.findMany({
    where: { household_id: householdId },
    select: {
      default_job_id: true,
      default_program_id: true,
      client_jobs: { select: { job_id: true } },
    },
  });
  for (const cl of allClients) {
    if (cl.default_job_id) usedJobIds.add(cl.default_job_id);
    if (cl.default_program_id) usedProgramIds.add(cl.default_program_id);
    for (const cj of cl.client_jobs) usedJobIds.add(cj.job_id);
  }

  const [jobs, programs] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({
        householdId,
        familyMemberId,
        includeJobIds: [...usedJobIds],
      }),
      orderBy: { start_date: "desc" },
      include: { family_member: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        OR: [
          {
            job: {
              ...jobWhereInPrivateClinicModule,
              ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
            },
          },
          ...(usedProgramIds.size ? [{ id: { in: [...usedProgramIds] } }] : []),
        ],
      },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      include: { job: true },
    }),
  ]);

  return {
    jobs: jobs.map((j) => ({
      id: j.id,
      label: formatJobDisplayLabel(j),
    })),
    programs: programs.map((p) => ({
      id: p.id,
      jobId: p.job_id,
      label: `${p.name}${p.job.employer_name ? ` (${p.job.employer_name})` : ""}`,
      visits_per_period_count: p.visits_per_period_count,
      visits_per_period_weeks: p.visits_per_period_weeks,
    })),
  };
}

export async function loadTherapyClientRelationshipPickerClients(params: {
  householdId: string;
  familyMemberId: string | null;
  excludeClientId: string;
}): Promise<TherapyClientRelationshipPickerOption[]> {
  const rows = await prisma.therapy_clients.findMany({
    where: {
      household_id: params.householdId,
      id: { not: params.excludeClientId },
      ...therapyClientsWhereLinkedPrivateClinicJobs(params.familyMemberId),
    },
    select: { id: true, first_name: true, last_name: true },
    orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    label: [r.first_name, r.last_name].filter(Boolean).join(" "),
  }));
}
