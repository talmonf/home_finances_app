"use client";

import { useMemo, useState } from "react";

export type SubscriptionFamilyJobSelectMember = {
  id: string;
  full_name: string;
  is_active?: boolean;
};

export type SubscriptionFamilyJobSelectJob = {
  id: string;
  family_member_id: string;
  job_title: string;
  employer_name: string | null;
  is_active?: boolean;
};

function formatJobLabel(job: { job_title: string; employer_name: string | null }) {
  return job.employer_name ? `${job.job_title} · ${job.employer_name}` : job.job_title;
}

type Props = {
  members: SubscriptionFamilyJobSelectMember[];
  jobs: SubscriptionFamilyJobSelectJob[];
  defaultFamilyMemberId?: string;
  defaultJobId?: string;
  memberLabel: string;
  jobLabel: string;
  selectClassName: string;
  showInactiveMemberSuffix?: boolean;
  showInactiveJobSuffix?: boolean;
};

export function SubscriptionFamilyJobSelects({
  members,
  jobs,
  defaultFamilyMemberId = "",
  defaultJobId = "",
  memberLabel,
  jobLabel,
  selectClassName,
  showInactiveMemberSuffix = false,
  showInactiveJobSuffix = false,
}: Props) {
  const [memberId, setMemberId] = useState(defaultFamilyMemberId);
  const [jobId, setJobId] = useState(defaultJobId);

  const visibleJobs = useMemo(() => {
    let list = !memberId ? jobs : jobs.filter((j) => j.family_member_id === memberId);
    if (jobId) {
      const selected = jobs.find((j) => j.id === jobId);
      if (selected && !list.some((j) => j.id === jobId)) {
        list = [...list, selected];
      }
    }
    return list;
  }, [jobs, memberId, jobId]);

  function handleMemberChange(nextMemberId: string) {
    setMemberId(nextMemberId);
    if (!nextMemberId || !jobId) return;
    const j = jobs.find((x) => x.id === jobId);
    if (j && j.family_member_id !== nextMemberId) {
      setJobId("");
    }
  }

  return (
    <>
      <div>
        <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
          {memberLabel}
        </label>
        <select
          id="family_member_id"
          name="family_member_id"
          className={selectClassName}
          value={memberId}
          onChange={(e) => handleMemberChange(e.target.value)}
        >
          <option value="">None</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
              {showInactiveMemberSuffix && m.is_active === false ? " (inactive)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="job_id" className="mb-1 block text-xs font-medium text-slate-400">
          {jobLabel}
        </label>
        <select
          id="job_id"
          name="job_id"
          className={selectClassName}
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
        >
          <option value="">None</option>
          {visibleJobs.map((j) => (
            <option key={j.id} value={j.id}>
              {formatJobLabel(j)}
              {showInactiveJobSuffix && j.is_active === false ? " (inactive)" : ""}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
