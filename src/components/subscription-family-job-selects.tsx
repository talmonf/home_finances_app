"use client";

import { useMemo, useState } from "react";
import { formatJobDisplayLabel } from "@/lib/job-label";

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

type Props = {
  members: SubscriptionFamilyJobSelectMember[];
  jobs: SubscriptionFamilyJobSelectJob[];
  defaultFamilyMemberId?: string;
  defaultJobId?: string;
  familyMemberId?: string;
  jobId?: string;
  onFamilyMemberIdChange?: (id: string) => void;
  onJobIdChange?: (id: string) => void;
  fieldIdPrefix?: string;
  memberLabel: string;
  jobLabel: string;
  selectClassName: string;
  showInactiveMemberSuffix?: boolean;
  showInactiveJobSuffix?: boolean;
  noneLabel?: string;
};

export function SubscriptionFamilyJobSelects({
  members,
  jobs,
  defaultFamilyMemberId = "",
  defaultJobId = "",
  familyMemberId: controlledMemberId,
  jobId: controlledJobId,
  onFamilyMemberIdChange,
  onJobIdChange,
  fieldIdPrefix = "",
  memberLabel,
  jobLabel,
  selectClassName,
  showInactiveMemberSuffix = false,
  showInactiveJobSuffix = false,
  noneLabel = "None",
}: Props) {
  const [internalMemberId, setInternalMemberId] = useState(defaultFamilyMemberId);
  const [internalJobId, setInternalJobId] = useState(defaultJobId);
  const controlled = onFamilyMemberIdChange != null;
  const memberId = controlled ? (controlledMemberId ?? "") : internalMemberId;
  const jobId = controlled ? (controlledJobId ?? "") : internalJobId;
  const memberFieldId = `${fieldIdPrefix}family_member_id`;
  const jobFieldId = `${fieldIdPrefix}job_id`;

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
    if (controlled) {
      onFamilyMemberIdChange!(nextMemberId);
    } else {
      setInternalMemberId(nextMemberId);
    }
    if (!nextMemberId || !jobId) return;
    const j = jobs.find((x) => x.id === jobId);
    if (j && j.family_member_id !== nextMemberId) {
      if (controlled) {
        onJobIdChange?.("");
      } else {
        setInternalJobId("");
      }
    }
  }

  function handleJobChange(nextJobId: string) {
    if (controlled) {
      onJobIdChange?.(nextJobId);
    } else {
      setInternalJobId(nextJobId);
    }
  }

  return (
    <>
      <div>
        <label htmlFor={memberFieldId} className="mb-1 block text-xs font-medium text-slate-400">
          {memberLabel}
        </label>
        <select
          id={memberFieldId}
          name={controlled ? undefined : "family_member_id"}
          className={selectClassName}
          value={memberId}
          onChange={(e) => handleMemberChange(e.target.value)}
        >
          <option value="">{noneLabel}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
              {showInactiveMemberSuffix && m.is_active === false ? " (inactive)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={jobFieldId} className="mb-1 block text-xs font-medium text-slate-400">
          {jobLabel}
        </label>
        <select
          id={jobFieldId}
          name={controlled ? undefined : "job_id"}
          className={selectClassName}
          value={jobId}
          onChange={(e) => handleJobChange(e.target.value)}
        >
          <option value="">{noneLabel}</option>
          {visibleJobs.map((j) => (
            <option key={j.id} value={j.id}>
              {formatJobDisplayLabel(j)}
              {showInactiveJobSuffix && j.is_active === false ? " (inactive)" : ""}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
