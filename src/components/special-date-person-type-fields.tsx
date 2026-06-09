"use client";

import { useState } from "react";
import {
  FAMILY_SPECIAL_DATE_EVENT_TYPE_VALUES,
  getFamilySpecialDateEventTypeLabel,
} from "@/lib/family-special-dates/event-type-labels";
import type { FamilySpecialDateEventType } from "@/generated/prisma/enums";

type MemberOption = { id: string; full_name: string };

type Props = {
  isHebrew: boolean;
  members: MemberOption[];
  defaultFamilyMemberId?: string | null;
  defaultDisplayName?: string | null;
  defaultEventType?: FamilySpecialDateEventType;
  defaultEventTypeOther?: string | null;
};

export function SpecialDatePersonTypeFields({
  isHebrew,
  members,
  defaultFamilyMemberId = "",
  defaultDisplayName = "",
  defaultEventType,
  defaultEventTypeOther = "",
}: Props) {
  const [familyMemberId, setFamilyMemberId] = useState(defaultFamilyMemberId ?? "");
  const [eventType, setEventType] = useState<FamilySpecialDateEventType | "">(defaultEventType ?? "");

  const showDisplayName = !familyMemberId;

  return (
    <>
      <div>
        <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
          {isHebrew ? "בן משפחה (אופציונלי)" : "Family member (optional)"}
        </label>
        <select
          id="family_member_id"
          name="family_member_id"
          value={familyMemberId}
          onChange={(e) => setFamilyMemberId(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{isHebrew ? "ללא קישור לבן משפחה" : "Not linked to a family member"}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </div>

      {showDisplayName && (
        <div>
          <label htmlFor="display_name" className="mb-1 block text-xs font-medium text-slate-400">
            {isHebrew ? "שם לתצוגה" : "Display name"}
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            defaultValue={defaultDisplayName ?? ""}
            placeholder={isHebrew ? "לדוגמה: סבא משה" : "e.g. Grandfather Moshe"}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            {isHebrew
              ? "נדרש כשאין קישור לבן משפחה (למשל קרוב שנפטר ואינו ברשימה)."
              : "Required when not linked to a family member (e.g. a relative not in the list)."}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="event_type" className="mb-1 block text-xs font-medium text-slate-400">
          {isHebrew ? "סוג המועד" : "Event type"}
        </label>
        <select
          id="event_type"
          name="event_type"
          required
          value={eventType}
          onChange={(e) => setEventType(e.target.value as FamilySpecialDateEventType | "")}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{isHebrew ? "בחרו סוג מועד" : "Select event type"}</option>
          {FAMILY_SPECIAL_DATE_EVENT_TYPE_VALUES.map((t) => (
            <option key={t} value={t}>
              {getFamilySpecialDateEventTypeLabel(t, isHebrew ? "he" : "en")}
            </option>
          ))}
        </select>
      </div>

      {eventType === "other" && (
        <div>
          <label htmlFor="event_type_other" className="mb-1 block text-xs font-medium text-slate-400">
            {isHebrew ? "תיאור סוג המועד" : "Event type description"}
          </label>
          <input
            id="event_type_other"
            name="event_type_other"
            type="text"
            required
            defaultValue={defaultEventTypeOther ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      )}
    </>
  );
}
