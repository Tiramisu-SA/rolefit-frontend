/** The text on the bell's badge: empty at 0, "9+" above 9. */
export function badgeLabel(unread: number): string {
  if (unread <= 0) return "";
  return unread > 9 ? "9+" : String(unread);
}

export function bellAriaLabel(unread: number): string {
  return `Notifications, ${Math.max(0, unread)} unread`;
}

/** A short "5m ago" style age for a notification timestamp. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  const seconds = Math.max(0, Math.floor((now.getTime() - at) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(at).toLocaleDateString();
}

/** The server's link if it is an in-app path; otherwise the fallback (never an external or script URL). */
export function internalLink(link: string, fallback = "/seeker/applications"): string {
  return link.startsWith("/") && !link.startsWith("//") && !link.includes("\\") ? link : fallback;
}
