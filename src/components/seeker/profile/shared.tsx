import type { ReactNode } from "react";

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });

/** Generates a client-side id for a new list entry (experience/project/education row). */
export function newEntryId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** "2025-06-01" -> "Jun 2025"; blank/invalid input renders as an empty string. */
export function monthLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : monthFmt.format(d);
}

/** "2025-06-01" -> "2025-06", for binding to <input type="month">. */
export function toMonthInput(iso?: string): string {
  return iso ? iso.slice(0, 7) : "";
}

/** "2025-06" -> "2025-06-01"; empty input becomes undefined. */
export function fromMonthInput(value: string): string | undefined {
  return value ? `${value}-01` : undefined;
}

/** Splits a comma-separated free-text input into a trimmed, non-empty string list. */
export function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
      <h2 className="text-[17px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase sm:w-32 sm:shrink-0">{label}</span>
      <span className="min-w-0 text-[15px] text-foreground">{value ?? <span className="text-muted-foreground">Not set</span>}</span>
    </div>
  );
}
