import type { ReactNode, SelectHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** "2025-06-01" -> "Jun 2025"; blank/invalid input renders as an empty string. */
export function monthLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : monthFmt.format(d);
}

/** "2025-06-01" -> "2025-06", for binding to <input type="month">. */
export function toMonthInput(iso?: string | null): string {
  return iso ? iso.slice(0, 7) : "";
}

/** "2025-06" -> "2025-06-01" (first day); empty input becomes null. */
export function fromMonthInput(value: string): string | null {
  return value ? `${value}-01` : null;
}

/** "2025-06" -> "2025-06-30" (last day), so an end month counts in full; empty becomes null. */
export function fromMonthInputEnd(value: string): string | null {
  if (!value) return null;
  const [y, m] = value.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${value}-${String(lastDay).padStart(2, "0")}`;
}

/** Splits a comma-separated free-text input into a trimmed, non-empty string list. */
export function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** '' -> null, for optional text fields. */
export function orNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}

export function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {action}
      </div>
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

/** Inline validation message under an input. */
export function FieldMessage({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[13px] font-medium text-destructive">
      {message}
    </p>
  );
}

/** A native select styled like the text inputs. */
export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-background px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

/** Save / Cancel row used by every section editor (inside a <form>). */
export function EditorActions({ saving, onCancel, saveLabel = "Save" }: { saving: boolean; onCancel: () => void; saveLabel?: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" size="lg" disabled={saving}>
        {saving ? "Saving…" : saveLabel}
      </Button>
      <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </div>
  );
}
