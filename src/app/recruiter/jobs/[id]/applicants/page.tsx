"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { ApplicantDetail } from "@/components/recruiter/applicant-detail";
import { ApplicantList } from "@/components/recruiter/applicant-list";
import { StatusBadge } from "@/components/brand/status-badge";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/brand/page-states";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { applicationService, jobPosting } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { formatDate } from "@/lib/utils";
import type { ApplicationView } from "@/lib/types";

/** Below Tailwind's `xl` breakpoint (1280px) the detail opens in a Sheet instead of the aside. */
function useIsBelowXl(): { isBelowXl: boolean; ready: boolean } {
  const [isBelow, setIsBelow] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)");
    const update = () => setIsBelow(mq.matches);
    const markReady = () => setReady(true);
    update();
    markReady();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return { isBelowXl: isBelow, ready };
}

function ApplicantsPageInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { isBelowXl, ready: breakpointReady } = useIsBelowXl();

  const state = useAsync(async () => {
    const job = await jobPosting.getMyJob(id);
    return { job, applications: await applicationService.listApplicantsForJob(job) };
  }, [id]);
  const job = state.data?.job;
  const applications = useMemo(() => state.data?.applications ?? [], [state.data]);

  const [selectedId, setSelectedId] = useState<string | undefined>(searchParams.get("app") ?? undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const didInitialSheetOpen = useRef(false);

  // Falls back to the first applicant once the list loads, without needing an effect to sync it.
  const selected = applications.find((a) => a.id === selectedId) ?? applications[0];

  // Deep-linking with `?app=<id>` below `xl` selects the row (via initial state above) but the
  // Sheet also needs an explicit open: it can only run once both the applicant list and the
  // (async, matchMedia-based) breakpoint are known, so it waits on both here and fires once.
  useEffect(() => {
    if (didInitialSheetOpen.current) return;
    if (!breakpointReady || !state.data || state.data.applications.length === 0) return;
    didInitialSheetOpen.current = true;
    const appParam = searchParams.get("app");
    const openSheetForDeepLink = () => setSheetOpen(true);
    if (appParam && isBelowXl && state.data.applications.some((a) => a.id === appParam)) {
      openSheetForDeepLink();
    }
  }, [breakpointReady, isBelowXl, state.data, searchParams]);

  function handleSelect(appId: string) {
    setSelectedId(appId);
    if (isBelowXl) setSheetOpen(true);
  }

  function handleUpdated(updated: ApplicationView) {
    if (state.data) state.setData({ ...state.data, applications: applications.map((a) => (a.id === updated.id ? updated : a)) });
  }

  const loading = state.loading;
  const error = state.error;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/recruiter/jobs" className="font-semibold hover:text-primary">
          Job postings
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-foreground">{job?.title ?? "Applicants"}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Applicants</h1>
        {job && <StatusBadge status={job.status} audience="recruiter" />}
        {job && (
          <span className="text-sm text-muted-foreground">
            {applications.length} applicant{applications.length === 1 ? "" : "s"}
            {job.applicationSettings.applicationDeadline ? ` · deadline ${formatDate(job.applicationSettings.applicationDeadline)}` : ""}
          </span>
        )}
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={state.reload} />
      ) : applications.length === 0 ? (
        <EmptyState icon={Users} title="No applicants yet" description="Applications will appear here as candidates apply." />
      ) : (
        <div className="xl:flex xl:items-start xl:gap-5">
          <section className="flex-1 overflow-hidden rounded-2xl border bg-card">
            <ApplicantList applications={applications} selectedId={selected?.id} onSelect={handleSelect} />
          </section>

          <aside aria-label="Applicant detail" className="hidden w-110 shrink-0 rounded-2xl border bg-card p-6 xl:block">
            {selected ? (
              <ApplicantDetail key={selected.id} application={selected} onUpdated={handleUpdated} />
            ) : (
              <p className="text-sm text-muted-foreground">Select an applicant to see details.</p>
            )}
          </aside>

          <Sheet open={isBelowXl && sheetOpen && !!selected} onOpenChange={setSheetOpen}>
            <SheetContent className="w-full overflow-y-auto p-6 data-[side=right]:sm:max-w-110">
              <SheetTitle className="sr-only">Applicant detail</SheetTitle>
              {selected && <ApplicantDetail key={selected.id} application={selected} onUpdated={handleUpdated} />}
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <ApplicantsPageInner />
    </Suspense>
  );
}
