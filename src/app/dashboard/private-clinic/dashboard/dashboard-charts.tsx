import type { ClinicDashboardBucket, ClinicDashboardSeries } from "@/lib/private-clinic/clinic-dashboard-data";

const PALETTE = [
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#2dd4bf",
  "#818cf8",
  "#94a3b8",
];

function colorForId(id: string, index: number): string {
  if (index >= 0 && index < PALETTE.length) return PALETTE[index]!;
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

function niceMax(value: number): number {
  if (!(value > 0)) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  const scaled = value / base;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * base;
}

function tickValues(max: number): number[] {
  const top = niceMax(max);
  return [0, top / 4, top / 2, (top * 3) / 4, top];
}

export function ClinicStackedBarChart({
  series,
  points,
  formatValue,
  formatTick,
  emptyLabel,
  caption,
}: {
  series: ClinicDashboardSeries[];
  points: ClinicDashboardBucket[];
  formatValue: (n: number) => string;
  formatTick?: (n: number) => string;
  emptyLabel: string;
  caption?: string;
}) {
  const width = 720;
  const height = 260;
  const padL = 52;
  const padR = 12;
  const padT = 16;
  const padB = 44;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const totals = points.map((p) => series.reduce((s, ser) => s + (p.values[ser.id] ?? 0), 0));
  const max = Math.max(0, ...totals);
  const yMax = niceMax(max);
  const ticks = tickValues(max);
  const n = Math.max(points.length, 1);
  const slot = plotW / n;
  const barW = Math.min(36, Math.max(8, slot * 0.62));
  const hasData = max > 0 && series.length > 0;

  if (!hasData) {
    return <p className="px-1 py-8 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
        {ticks.map((tick) => {
          const y = padT + plotH - (tick / yMax) * plotH;
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#334155" strokeWidth="1" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="10">
                {(formatTick ?? formatValue)(tick)}
              </text>
            </g>
          );
        })}
        {points.map((point, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          let y = padT + plotH;
          return (
            <g key={point.key}>
              {series.map((ser, si) => {
                const v = point.values[ser.id] ?? 0;
                if (v <= 0) return null;
                const h = (v / yMax) * plotH;
                y -= h;
                return (
                  <rect key={ser.id} x={x} y={y} width={barW} height={h} fill={colorForId(ser.id, si)}>
                    <title>{`${point.label} · ${ser.label}: ${formatValue(v)}`}</title>
                  </rect>
                );
              })}
              <text
                x={x + barW / 2}
                y={height - 14}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={points.length > 10 ? "9" : "10"}
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      {series.length > 1 ? (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
          {series.map((ser, si) => (
            <li key={ser.id} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: colorForId(ser.id, si) }}
              />
              {ser.label}
            </li>
          ))}
        </ul>
      ) : null}
      {caption ? <p className="mt-1 text-xs text-slate-500">{caption}</p> : null}
    </div>
  );
}

export function ClinicHorizontalBarChart({
  rows,
  formatValue,
  emptyLabel,
}: {
  rows: Array<{ id: string; label: string; total: number }>;
  formatValue: (n: number) => string;
  emptyLabel: string;
}) {
  const max = Math.max(0, ...rows.map((r) => r.total));
  if (rows.length === 0 || max <= 0) {
    return <p className="px-1 py-8 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((row, i) => {
        const pct = Math.max(2, (row.total / max) * 100);
        return (
          <li key={row.id}>
            <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-slate-300">{row.label}</span>
              <span className="shrink-0 tabular-nums text-slate-400">{formatValue(row.total)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: colorForId(row.id, i) }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ClinicCountBarChart({
  points,
  emptyLabel,
  fill = "#38bdf8",
  rotateLabels = false,
}: {
  points: Array<{ key: string; label: string; count: number }>;
  emptyLabel: string;
  fill?: string;
  rotateLabels?: boolean;
}) {
  const width = 720;
  const height = rotateLabels ? 280 : 240;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = rotateLabels ? 80 : 44;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const max = Math.max(0, ...points.map((p) => p.count));
  const yMax = niceMax(max);
  const ticks = tickValues(max);
  const n = Math.max(points.length, 1);
  const slot = plotW / n;
  const barW = Math.min(36, Math.max(8, slot * 0.62));
  const labelSize = points.length > 10 || rotateLabels ? 9 : 10;

  if (max <= 0) {
    return <p className="px-1 py-8 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
      {ticks.map((tick) => {
        const y = padT + plotH - (tick / yMax) * plotH;
        return (
          <g key={tick}>
            <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#334155" strokeWidth="1" />
            <text x={padL - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="10">
              {tick % 1 === 0 ? String(tick) : tick.toFixed(1)}
            </text>
          </g>
        );
      })}
      {points.map((point, i) => {
        const x = padL + i * slot + (slot - barW) / 2;
        const h = (point.count / yMax) * plotH;
        const y = padT + plotH - h;
        const labelX = x + barW / 2;
        const labelAnchorY = rotateLabels ? padT + plotH + 8 : height - 14;
        return (
          <g key={point.key}>
            <rect x={x} y={y} width={barW} height={h} fill={fill} rx="2">
              <title>{`${point.label}: ${point.count}`}</title>
            </rect>
            <text
              x={labelX}
              y={labelAnchorY}
              textAnchor={rotateLabels ? "end" : "middle"}
              fill="#94a3b8"
              fontSize={labelSize}
              transform={rotateLabels ? `rotate(-40 ${labelX} ${labelAnchorY})` : undefined}
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
