"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatHouseholdDate } from "@/lib/household-date-format";
import type { HouseholdDateDisplayFormat } from "@/lib/household-date-format";

type EmploymentType = "employee" | "freelancer" | "self_employed" | "contractor_via_company";
type TenureFilter = "current" | "past" | "all";

type FamilyMemberOption = {
  id: string;
  full_name: string;
};

type JobListRow = {
  id: string;
  family_member_id: string;
  family_member_name: string;
  employment_type: EmploymentType;
  job_title: string;
  employer_name: string | null;
  start_date_iso: string;
  end_date_iso: string | null;
  is_private_clinic: boolean;
};

function employmentTypeLabel(t: EmploymentType) {
  switch (t) {
    case "employee":
      return "Employee";
    case "freelancer":
      return "Freelancer";
    case "self_employed":
      return "Self-employed";
    case "contractor_via_company":
      return "Contractor via company";
    default:
      return t;
  }
}

export function JobsListClient({
  rows,
  familyMembers,
  dateDisplayFormat,
  isHebrew,
  initialFamilyMemberId,
  initialEmploymentType,
  initialTenure,
}: {
  rows: JobListRow[];
  familyMembers: FamilyMemberOption[];
  dateDisplayFormat: HouseholdDateDisplayFormat;
  isHebrew: boolean;
  initialFamilyMemberId: string;
  initialEmploymentType: EmploymentType | "";
  initialTenure: TenureFilter;
}) {
  const defaultFamilyMemberId = "";
  const defaultEmploymentType: EmploymentType | "" = "";
  const defaultTenure: TenureFilter = "current";

  const [familyMemberId, setFamilyMemberId] = useState(initialFamilyMemberId);
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">(initialEmploymentType);
  const [tenure, setTenure] = useState<TenureFilter>(initialTenure);

  const [appliedFamilyMemberId, setAppliedFamilyMemberId] = useState(initialFamilyMemberId);
  const [appliedEmploymentType, setAppliedEmploymentType] = useState<EmploymentType | "">(initialEmploymentType);
  const [appliedTenure, setAppliedTenure] = useState<TenureFilter>(initialTenure);

  const resetFilters = () => {
    setFamilyMemberId(defaultFamilyMemberId);
    setEmploymentType(defaultEmploymentType);
    setTenure(defaultTenure);
    setAppliedFamilyMemberId(defaultFamilyMemberId);
    setAppliedEmploymentType(defaultEmploymentType);
    setAppliedTenure(defaultTenure);
  };

  const filteredRows = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return rows.filter((job) => {
      if (appliedFamilyMemberId && job.family_member_id !== appliedFamilyMemberId) return false;
      if (appliedEmploymentType && job.employment_type !== appliedEmploymentType) return false;
      if (appliedTenure === "all") return true;

      if (!job.end_date_iso) {
        return appliedTenure === "current";
      }
      const endDate = new Date(job.end_date_iso);
      return appliedTenure === "current" ? endDate >= today : endDate < today;
    });
  }, [appliedEmploymentType, appliedFamilyMemberId, appliedTenure, rows]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "רשימת משרות" : "Jobs list"}</h2>
        <Link
          href="/dashboard/jobs?add=1"
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          {isHebrew ? "הוספת משרה" : "Add job"}
        </Link>
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-4">
        <div className="space-y-1">
          <label className="block text-xs text-slate-300">{isHebrew ? "בן משפחה" : "Family member"}</label>
          <select
            value={familyMemberId}
            onChange={(e) => setFamilyMemberId(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{isHebrew ? "כולם" : "All"}</option>
            {familyMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-300">{isHebrew ? "סוג העסקה" : "Employment type"}</label>
          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType | "")}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{isHebrew ? "כולם" : "All"}</option>
            <option value="employee">{isHebrew ? "שכיר" : "Regular employee"}</option>
            <option value="freelancer">{isHebrew ? "פרילנסר" : "Freelancer"}</option>
            <option value="self_employed">{isHebrew ? "עצמאי" : "Self-employed"}</option>
            <option value="contractor_via_company">{isHebrew ? "קבלן דרך חברה" : "Contractor via company"}</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-300">{isHebrew ? "סטטוס" : "Status"}</label>
          <select
            value={tenure}
            onChange={(e) => setTenure(e.target.value as TenureFilter)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="current">{isHebrew ? "נוכחיות" : "Current jobs"}</option>
            <option value="past">{isHebrew ? "עבר" : "Past jobs"}</option>
            <option value="all">{isHebrew ? "הכול" : "All jobs"}</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setAppliedFamilyMemberId(familyMemberId);
              setAppliedEmploymentType(employmentType);
              setAppliedTenure(tenure);
            }}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
          >
            {isHebrew ? "סינון" : "Apply filters"}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
          >
            {isHebrew ? "ניקוי" : "Clear"}
          </button>
        </div>
      </div>
      {filteredRows.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
          {isHebrew ? "לא נמצאו משרות בהתאם לסינון." : "No jobs found for the selected filters."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-3 py-2 text-slate-300">Title</th>
                <th className="px-3 py-2 text-slate-300">Family member</th>
                <th className="px-3 py-2 text-slate-300">Type</th>
                <th className="px-3 py-2 text-slate-300">Employer</th>
                <th className="px-3 py-2 text-slate-300">Dates</th>
                <th className="px-3 py-2 text-slate-300">{isHebrew ? "קליניקה" : "Clinic"}</th>
                <th className="px-3 py-2 text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((job) => (
                <tr key={job.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                  <td className="px-3 py-2 text-slate-100">{job.job_title}</td>
                  <td className="px-3 py-2 text-slate-300">{job.family_member_name}</td>
                  <td className="px-3 py-2 text-slate-300">{employmentTypeLabel(job.employment_type)}</td>
                  <td className="px-3 py-2 text-slate-300">{job.employer_name ?? "Self-employed / not set"}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {formatHouseholdDate(new Date(job.start_date_iso), dateDisplayFormat)} -{" "}
                    {job.end_date_iso ? formatHouseholdDate(new Date(job.end_date_iso), dateDisplayFormat) : "Present"}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {job.is_private_clinic ? (isHebrew ? "כן" : "Yes") : (isHebrew ? "לא" : "No")}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/dashboard/jobs/${job.id}`} className="text-xs text-sky-400 hover:text-sky-300">
                      {isHebrew ? "עריכה" : "Edit"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
