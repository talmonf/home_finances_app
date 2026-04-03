/** Integer age in years on a calendar day (UTC date parts). */
export function ageInYearsOnDate(dateOfBirth: Date, asOf: Date): number {
  let age = asOf.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const m = asOf.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (m < 0 || (m === 0 && asOf.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/** Family members who can be selected as the person who tanked up (16+ on the fill date, DOB required). */
export function isEligiblePetrolTankerOnFillDate(dateOfBirth: Date | null, filledAt: Date): boolean {
  if (!dateOfBirth) return false;
  return ageInYearsOnDate(dateOfBirth, filledAt) >= 16;
}
