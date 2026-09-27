import type { Company } from "@/lib/types";

// No service owns company data yet, so display details live here, keyed by the
// companyId stored on each job. The Job Posting Service seed uses these ids.
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

/** The company for an id, or a neutral placeholder for ids we don't know. */
export function companyFor(id: string): Company {
  return (
    companies.find((c) => c.id === id) ?? {
      id,
      name: id,
      initials: id.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?",
      color: FALLBACK_COLOR,
    }
  );
}
