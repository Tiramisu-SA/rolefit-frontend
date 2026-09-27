import type { FieldError } from "@/lib/api/errors";

/** Field name → message, for showing server validation errors next to inputs. */
export type FieldErrors = Record<string, string>;

/**
 * Picks the errors under `prefix` and keys them by the next field name.
 * "experience[1].endDate" with prefix "experience[1]." → { endDate }.
 * List items fold into their list: "links[2]" → { links }.
 */
export function scopeErrors(errors: FieldError[] | undefined, prefix = ""): FieldErrors {
  const out: FieldErrors = {};
  for (const { field, message } of errors ?? []) {
    if (!field.startsWith(prefix)) continue;
    const rest = field.slice(prefix.length);
    const key = rest.split(".")[0].replace(/\[\d+\]$/, "");
    // Nested paths belong to a deeper scope ("experience[1].endDate" is not a top-level error).
    if (prefix === "" && rest.includes(".")) continue;
    if (key && !(key in out)) out[key] = message;
  }
  return out;
}
