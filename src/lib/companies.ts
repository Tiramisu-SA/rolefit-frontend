import type { Company } from "@/lib/types";

// No service owns company data yet. Demo companies (used by the Job Posting
// seed) have display details here. Real recruiters get a readable id at signup
// from the Supabase trigger, "co-<slug>-<6 hex>", which companyFor turns back
// into a name.
export const companies: Company[] = [
  { id: "co-brightline", name: "Brightline Analytics", initials: "BA", color: "#0F766E" },
  { id: "co-harbor", name: "Harbor Fintech", initials: "HF", color: "#1D4ED8" },
  { id: "co-cobalt", name: "Cobalt Studio", initials: "CS", color: "#7C3AED" },
  { id: "co-meridian", name: "Meridian Health", initials: "MH", color: "#BE123C" },
  { id: "co-atlas", name: "Atlas Logistics", initials: "AL", color: "#B45309" },
  { id: "co-pinecrest", name: "Pinecrest Software", initials: "PS", color: "#0369A1" },
  { id: "co-lotus", name: "Lotus Retail Group", initials: "LR", color: "#15803D" },
];

const FALLBACK_COLOR = "#475569";
const READABLE_ID = /^co-([a-z0-9]+(?:-[a-z0-9]+)*)-[0-9a-f]{6}$/;

/** First letters of the first two words, upper-cased; "?" when there are none. */
export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]);
  return letters.join("").toUpperCase() || "?";
}

const titleCase = (slug: string) =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/** The company for an id: a demo company, a name decoded from a readable id, or a neutral placeholder. */
export function companyFor(id: string): Company {
  const known = companies.find((c) => c.id === id);
  if (known) return known;

  const readable = READABLE_ID.exec(id);
  if (readable) {
    const name = titleCase(readable[1]);
    return { id, name, initials: initialsOf(name), color: FALLBACK_COLOR };
  }

  return {
    id,
    name: id,
    initials: id.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?",
    color: FALLBACK_COLOR,
  };
}
