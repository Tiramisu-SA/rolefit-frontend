"use client";

import { Globe } from "lucide-react";
import { CompanyAvatar } from "@/components/brand/company-avatar";
import { companyFor } from "@/lib/companies";
import { companyService } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import type { CompanyProfile } from "@/lib/types";

/** Only http(s) links are rendered as links. */
function safeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export function CompanyCardView({ company }: { company: CompanyProfile }) {
  const website = company.website ? safeUrl(company.website) : null;
  const meta = [company.industry, company.size && `${company.size} employees`, company.location].filter(Boolean).join(" · ");

  return (
    <section aria-label="About the company" className="flex flex-col gap-4 rounded-2xl border bg-card p-6 md:p-8">
      <h2 className="text-xl font-bold">About the company</h2>
      <div className="flex items-start gap-4">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt={`${company.name} logo`} className="size-13 shrink-0 rounded-xl border object-cover" />
        ) : (
          <CompanyAvatar company={companyFor(company.id)} size="md" />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-[17px] font-bold">{company.name}</h3>
          {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
        </div>
      </div>
      {company.description && <p className="line-clamp-5 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{company.description}</p>}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit items-center gap-2 text-[15px] font-semibold text-primary hover:underline"
        >
          <Globe className="size-4" aria-hidden />
          Visit website
        </a>
      )}
    </section>
  );
}

/** The company's saved profile; renders nothing while loading, on error, or when none is saved. */
export function CompanyCard({ companyId }: { companyId: string }) {
  const state = useAsync(() => companyService.getCompany(companyId), [companyId]);
  if (!state.data) return null;
  return <CompanyCardView company={state.data} />;
}
