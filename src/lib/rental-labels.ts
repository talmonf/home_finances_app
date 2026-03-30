/** Human-readable rental kind (matches Prisma `RentalType` / DB enum via @map). */
export function formatRentalTypeLabel(value: string): string {
  switch (value) {
    case "lease_monthly":
    case "long_term":
      return "Lease (monthly rent)";
    case "short_stay":
    case "short_term":
      return "Short stay (total for period)";
    default:
      return value;
  }
}
