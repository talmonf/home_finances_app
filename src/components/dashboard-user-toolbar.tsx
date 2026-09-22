export function DashboardUserToolbar({ contextTitle }: { contextTitle: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
      <h1 className="text-base font-semibold tracking-tight text-slate-100 sm:text-lg">{contextTitle}</h1>
    </div>
  );
}
