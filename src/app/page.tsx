import Link from "next/link";
import { ArrowRight, Check, Minus, Search, Sparkles, MapPin } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { MatchRing } from "@/components/brand/match-ring";
import { CompanyAvatar } from "@/components/brand/company-avatar";
import { SiteHeader } from "@/components/landing/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";

const SAMPLE_COMPANY: Company = {
  id: "co-brightline",
  name: "Brightline Analytics",
  initials: "BA",
  color: "#0F766E",
};

const POPULAR_SEARCHES = ["Frontend Developer", "Data Analyst", "UX Designer", "Internship"];

const WHY_YOU_FIT = [
  "React, TypeScript, Tailwind CSS",
  "1 year internship in web development",
  "Prefers hybrid work in Bangkok",
];

const STEPS = [
  {
    n: "1",
    title: "Import your profile",
    body: "Upload your existing resume. We pull out your skills, experience and education, and you review and confirm every detail.",
  },
  {
    n: "2",
    title: "See why you fit",
    body: "Each job gets a match score calculated from your verified profile, with a plain-language explanation of your strengths and gaps.",
  },
  {
    n: "3",
    title: "Apply with a tailored resume",
    body: "Generate a resume for that specific role, use the company template or your own format, then edit and approve it before sending.",
  },
];

const SEEKER_POINTS = [
  "Personalized recommendations from your verified profile",
  "Clear strengths and missing requirements for every job",
  "Track every application status in one timeline",
];

const RECRUITER_POINTS = [
  "Create, publish, close and reopen job postings",
  "Attach your company resume template",
  "Review applicants with a match snapshot and update their status",
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <SiteHeader />

      <section className="grid gap-12 border-b bg-card px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-20 lg:py-24">
        <div className="flex flex-col gap-7">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-soft px-3.5 py-1.5 text-sm font-semibold text-primary-soft-foreground">
            <Sparkles className="size-4" aria-hidden />
            Explainable job matching
          </span>
          <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight md:text-6xl">
            Find the roles that actually fit you.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-[19px]">
            RoleFit compares your verified profile with each job&apos;s real requirements, explains why you fit,
            and tailors your resume for the role. It never invents skills or experience you don&apos;t have.
          </p>

          <form
            action="/login"
            method="get"
            className="flex flex-col gap-2 rounded-2xl border border-input bg-card p-2 shadow-lg shadow-foreground/5 sm:flex-row sm:gap-0"
          >
            <input type="hidden" name="role" value="seeker" />
            <label className="flex flex-1 items-center gap-2.5 px-3 py-2 text-muted-foreground sm:py-0">
              <Search className="size-5 shrink-0" aria-hidden />
              <span className="sr-only">Job title, skill, or company</span>
              <input
                type="text"
                name="q"
                placeholder="Job title, skill, or company"
                className="w-full border-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex items-center gap-2.5 border-t border-input px-3 py-2 text-muted-foreground sm:w-48 sm:border-t-0 sm:border-l sm:py-0">
              <MapPin className="size-5 shrink-0" aria-hidden />
              <span className="sr-only">Location</span>
              <input
                type="text"
                name="location"
                placeholder="Bangkok"
                className="w-full border-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="submit"
              className={cn(buttonVariants({ size: "lg" }), "h-13 w-full sm:w-auto")}
            >
              Search jobs
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
            <span>Popular:</span>
            {POPULAR_SEARCHES.map((term) => (
              <span key={term} className="rounded-full bg-muted px-3 py-1.5 font-medium text-foreground/80">
                {term}
              </span>
            ))}
          </div>
        </div>

        <div className="relative hidden min-h-125 items-center justify-center lg:flex">
          <div className="absolute inset-6 left-10 rounded-[28px] bg-primary-soft" aria-hidden />
          <div
            role="img"
            aria-label="Example match: Frontend Developer at Brightline Analytics, 92% match"
            className="relative flex w-120 flex-col gap-5 rounded-[20px] border bg-card p-7 shadow-2xl shadow-brand-deep/10"
          >
            <div aria-hidden className="flex items-start gap-4">
              <CompanyAvatar company={SAMPLE_COMPANY} size="md" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="text-lg font-bold">Frontend Developer</div>
                <div className="text-sm text-muted-foreground">Brightline Analytics · Bangkok · Hybrid</div>
              </div>
              <MatchRing score={92} size="md" />
            </div>

            <div aria-hidden className="flex flex-col gap-2.5">
              <div className="text-[13px] font-bold tracking-wide text-muted-foreground uppercase">Why you fit</div>
              {WHY_YOU_FIT.map((reason) => (
                <div key={reason} className="flex items-center gap-2.5 text-[15px] text-foreground/90">
                  <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-match-strong-soft text-match-strong">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  {reason}
                </div>
              ))}
              <div className="flex items-center gap-2.5 text-[15px] text-foreground/90">
                <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-match-good-soft text-match-good">
                  <Minus className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
                No GraphQL experience listed yet
              </div>
            </div>

            <div aria-hidden className="rounded-xl bg-muted p-3.5 text-sm leading-relaxed text-muted-foreground">
              Your React and TypeScript projects match 5 of 6 required skills. Your internship matches the 1+ year
              experience requirement.
            </div>

            <div aria-hidden className="flex gap-2.5">
              <span className="flex h-11 flex-1 items-center justify-center rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground">
                Tailor my resume
              </span>
              <span className="flex h-11 items-center justify-center rounded-lg border border-input px-4 text-[15px] font-semibold">
                Save
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="flex flex-col gap-12 px-4 py-16 sm:px-6 lg:px-20 lg:py-24">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm font-bold tracking-wide text-primary uppercase">How it works</span>
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            From profile to application in three steps
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="flex flex-col gap-4 rounded-[20px] border bg-card p-8">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-lg font-extrabold text-primary-soft-foreground">
                {step.n}
              </span>
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="recruiters" className="grid gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-20 lg:pb-24">
        <div className="flex flex-col gap-5 rounded-3xl border bg-card p-8 sm:p-10">
          <span className="text-sm font-bold tracking-wide text-primary uppercase">For job seekers</span>
          <h3 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
            Know where you stand before you apply
          </h3>
          <ul className="flex flex-col gap-3">
            {SEEKER_POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-base leading-relaxed text-foreground/90">
                <Check className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                {point}
              </li>
            ))}
          </ul>
          <Link
            href="/register?role=seeker"
            className={cn(buttonVariants({ size: "lg" }), "mt-2 self-start gap-2")}
          >
            Create a job seeker account
            <ArrowRight className="size-4.5" aria-hidden />
          </Link>
        </div>

        <div className="flex flex-col gap-5 rounded-3xl bg-brand-deep p-8 text-brand-deep-foreground sm:p-10">
          <span className="text-sm font-bold tracking-wide text-brand-deep-foreground/70 uppercase">
            For recruiters
          </span>
          <h3 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
            Post jobs and review applicants in one place
          </h3>
          <ul className="flex flex-col gap-3">
            {RECRUITER_POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-base leading-relaxed text-brand-deep-foreground/80">
                <Check className="mt-0.5 size-5 shrink-0 text-brand-deep-foreground/70" strokeWidth={2.5} aria-hidden />
                {point}
              </li>
            ))}
          </ul>
          <Link
            href="/register?role=recruiter"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-2 self-start gap-2 bg-brand-deep-foreground text-brand-deep hover:bg-brand-deep-foreground/90"
            )}
          >
            Post your first job
            <ArrowRight className="size-4.5" aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="mt-auto flex flex-col items-center gap-4 border-t bg-card px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-20">
        <div className="flex items-center gap-2">
          <Logo />
          <span>· Software Architecture Project 2026</span>
        </div>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="#" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="#" className="hover:text-foreground">
            Contact
          </Link>
        </div>
      </footer>
    </div>
  );
}
