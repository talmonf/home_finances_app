export type IntakeClientName = {
  id: string;
  first_name: string;
  last_name: string | null;
};

export type IntakeMatchResult<T extends IntakeClientName> =
  | { ok: true; client: T }
  | { ok: false; error: "client_not_found" | "ambiguous_client"; candidates: string[] };

/** Collapse whitespace and compare Latin letters without case. Hebrew is unchanged. */
export function normalizeIntakeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

/** Label a candidate the way the form should be filled next time: first name, plus up to two last-name letters. */
export function intakeCandidateLabel(client: IntakeClientName): string {
  const first = client.first_name.trim().replace(/\s+/g, " ");
  const prefix = Array.from((client.last_name ?? "").trim()).slice(0, 2).join("");
  return prefix ? `${first} ${prefix}` : first;
}

/**
 * Match an active client from a form answer.
 * The whole answer is the first name when it matches exactly (`דנה`, `בת אל`).
 * Otherwise a final token of 1 or 2 letters is a last-name prefix (`דנה כ`, `בת אל כ`).
 */
export function matchIntakeClients<T extends IntakeClientName>(
  rawName: string,
  clients: T[],
): IntakeMatchResult<T> {
  const collapsed = rawName.trim().replace(/\s+/g, " ");
  if (!collapsed) {
    return { ok: false, error: "client_not_found", candidates: [] };
  }
  const parts = collapsed.split(" ");
  const full = normalizeIntakeName(collapsed);
  const exact = clients.filter((client) => normalizeIntakeName(client.first_name) === full);
  if (exact.length === 1) return { ok: true, client: exact[0] };
  if (exact.length > 1) {
    return { ok: false, error: "ambiguous_client", candidates: exact.map(intakeCandidateLabel) };
  }

  const last = parts[parts.length - 1] ?? "";
  const lastLength = Array.from(last).length;
  if (parts.length >= 2 && lastLength >= 1 && lastLength <= 2) {
    const firstName = normalizeIntakeName(parts.slice(0, -1).join(" "));
    const prefix = normalizeIntakeName(last);
    const prefixed = clients.filter((client) => {
      if (normalizeIntakeName(client.first_name) !== firstName) return false;
      const lastName = normalizeIntakeName(client.last_name ?? "");
      return lastName.startsWith(prefix);
    });
    if (prefixed.length === 1) return { ok: true, client: prefixed[0] };
    if (prefixed.length > 1) {
      return { ok: false, error: "ambiguous_client", candidates: prefixed.map(intakeCandidateLabel) };
    }
  }

  return { ok: false, error: "client_not_found", candidates: [] };
}
