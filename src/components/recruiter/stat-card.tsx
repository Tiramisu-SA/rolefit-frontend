export function StatCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card p-5">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <span className="text-[28px] font-extrabold tracking-tight">{value}</span>
      {note && <span className="text-[13px] text-muted-foreground">{note}</span>}
    </div>
  );
}
