export { cn } from "cn"

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatSalary(min?: number, max?: number): string {
  const k = (n: number) => `฿${n.toLocaleString("en-US")}`;
  if (min && max) return `${k(min)} – ${max.toLocaleString("en-US")} / mo`;
  if (min) return `${k(min)}+ / mo`;
  return "Salary not listed";
}

export function relativeDays(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}
