import Link from "next/link";
import type { TherapyClientRelationshipType } from "@/generated/prisma/enums";
import { OBFUSCATED } from "@/lib/privacy-display";
import { privateClinicClients } from "@/lib/private-clinic-i18n";
import { addTherapyClientRelationship, removeTherapyClientRelationship } from "../actions";
import type { TherapyClientRelationshipPickerOption } from "./load-therapy-client-form-options";

type ClStrings = ReturnType<typeof privateClinicClients>;

function relationshipLabel(cl: ClStrings, r: TherapyClientRelationshipType): string {
  switch (r) {
    case "mother":
      return cl.relMother;
    case "father":
      return cl.relFather;
    case "husband":
      return cl.relHusband;
    case "wife":
      return cl.relWife;
    case "referred_by":
      return cl.relReferredBy;
    default:
      return r;
  }
}

function displayClientName(c: { first_name: string; last_name: string | null }): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

const REL_TYPES: TherapyClientRelationshipType[] = ["mother", "father", "husband", "wife", "referred_by"];

export function TherapyClientRelationshipsSection({
  cl,
  obfuscate,
  fromClientId,
  redirectOnError,
  relationships,
  otherClients,
}: {
  cl: ClStrings;
  obfuscate: boolean;
  fromClientId: string;
  redirectOnError: string;
  relationships: {
    id: string;
    relationship: TherapyClientRelationshipType;
    to_client: { id: string; first_name: string; last_name: string | null };
  }[];
  otherClients: TherapyClientRelationshipPickerOption[];
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">{cl.clientRelationshipsTitle}</h2>
        <p className="mt-1 text-xs text-slate-500">{cl.clientRelationshipsHelp}</p>
      </div>

      {relationships.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-400">
                <th className="py-2 pr-3 font-medium">{cl.relColRelatedClient}</th>
                <th className="py-2 pr-3 font-medium">{cl.relColRelationship}</th>
                <th className="py-2 font-medium">{cl.relColActions}</th>
              </tr>
            </thead>
            <tbody>
              {relationships.map((row) => (
                <tr key={row.id} className="border-b border-slate-800">
                  <td className="py-2 pr-3">
                    {obfuscate ? (
                      <span className="text-slate-300">{OBFUSCATED}</span>
                    ) : (
                      <Link
                        href={`/dashboard/private-clinic/clients/${row.to_client.id}/edit`}
                        className="text-sky-400 hover:text-sky-300"
                      >
                        {displayClientName(row.to_client)}
                      </Link>
                    )}
                  </td>
                  <td className="py-2 pr-3">{relationshipLabel(cl, row.relationship)}</td>
                  <td className="py-2">
                    {obfuscate ? (
                      <span className="text-xs text-slate-600">—</span>
                    ) : (
                      <form action={removeTherapyClientRelationship} className="inline">
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="from_client_id" value={fromClientId} />
                        <input type="hidden" name="redirect_on_error" value={redirectOnError} />
                        <button
                          type="submit"
                          className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                        >
                          {cl.relRemove}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">{cl.relEmptyList}</p>
      )}

      {!obfuscate && otherClients.length > 0 ? (
        <form action={addTherapyClientRelationship} className="flex flex-wrap items-end gap-2 border-t border-slate-800 pt-3">
          <input type="hidden" name="from_client_id" value={fromClientId} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          <div className="min-w-[12rem] flex-1 space-y-1">
            <label htmlFor={`rel_to_${fromClientId}`} className="block text-xs text-slate-400">
              {cl.relColRelatedClient}
            </label>
            <select
              id={`rel_to_${fromClientId}`}
              name="to_client_id"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="" disabled>
                {cl.relSelectClient}
              </option>
              {otherClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[10rem] space-y-1">
            <label htmlFor={`rel_type_${fromClientId}`} className="block text-xs text-slate-400">
              {cl.relSelectType}
            </label>
            <select
              id={`rel_type_${fromClientId}`}
              name="relationship"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="" disabled>
                {cl.relSelectType}
              </option>
              {REL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {relationshipLabel(cl, t)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600"
          >
            {cl.relAdd}
          </button>
        </form>
      ) : null}
    </section>
  );
}
