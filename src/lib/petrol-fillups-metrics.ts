export function petrolMetricsByFillupId(
  rows: { id: string; odometer_km: number; amount_paid: { toString(): string }; litres: { toString(): string } }[],
) {
  const sorted = [...rows].sort((a, b) => {
    if (a.odometer_km !== b.odometer_km) return a.odometer_km - b.odometer_km;
    return a.id.localeCompare(b.id);
  });
  const map = new Map<
    string,
    { deltaKm: number | null; costPerLitre: number | null; kmPerLitre: number | null }
  >();
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const deltaKm = prev != null ? cur.odometer_km - prev.odometer_km : null;
    const litresN = Number(cur.litres.toString());
    const amountN = Number(cur.amount_paid.toString());
    const costPerLitre = litresN > 0 ? amountN / litresN : null;
    const kmPerLitre =
      deltaKm != null && deltaKm > 0 && litresN > 0 ? deltaKm / litresN : null;
    map.set(cur.id, { deltaKm, costPerLitre, kmPerLitre });
  }
  return map;
}

/** Display cost per litre with two decimal places (e.g. 6.85). */
export function formatCostPerLitre(costPerLitre: number | null | undefined): string {
  if (costPerLitre == null || !Number.isFinite(costPerLitre)) return "—";
  return costPerLitre.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function carDisplayLabel(car: {
  custom_name: string | null;
  maker: string;
  model: string;
  model_year: number | null;
}) {
  const base = `${car.maker} ${car.model}${car.model_year ? ` (${car.model_year})` : ""}`;
  return car.custom_name ? `${car.custom_name} — ${base}` : base;
}
