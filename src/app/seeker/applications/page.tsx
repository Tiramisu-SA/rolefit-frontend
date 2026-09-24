"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, FileText } from "lucide-react";
import { ApplicationRow } from "@/components/seeker/application-row";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/brand/page-states";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsync } from "@/lib/use-async";
import { applicationService } from "@/lib/api";
import type { ApplicationStatus, ApplicationView } from "@/lib/types";

type TabValue = "all" | "active" | "offers" | "closed";

const ACTIVE_STATUSES: ApplicationStatus[] = ["Submitted", "Under review", "Interview"];

const TAB_LABEL: Record<TabValue, string> = {
  all: "All",
  active: "Active",
  offers: "Offers",
  closed: "Closed",
};

function matchesTab(application: ApplicationView, tab: TabValue): boolean {
  switch (tab) {
    case "active":
      return ACTIVE_STATUSES.includes(application.status);
    case "offers":
      return application.status === "Offer";
    case "closed":
      return application.status === "Rejected";
    default:
      return true;
  }
}

function SubmittedBanner({ applications, applicationId }: { applications: ApplicationView[]; applicationId: string }) {
  const application = applications.find((a) => a.id === applicationId);
  const companyName = application?.job.company.name;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-match-strong/30 bg-match-strong-soft px-5 py-4 text-[15px] text-match-strong"
    >
      <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>
        <strong className="font-bold">{companyName ? `Application sent to ${companyName}.` : "Application sent."}</strong>{" "}
        We&apos;ll notify you when the recruiter updates your status.
      </span>
    </div>
  );
}

function ApplicationsPageInner() {
  const searchParams = useSearchParams();
  const submittedId = searchParams.get("submitted");
  const [tab, setTab] = useState<TabValue>("all");

  const applicationsState = useAsync(() => applicationService.listMyApplications(), []);
  const applications = useMemo(() => applicationsState.data ?? [], [applicationsState.data]);

  const counts = useMemo(
    () => ({
      all: applications.length,
      active: applications.filter((a) => ACTIVE_STATUSES.includes(a.status)).length,
      offers: applications.filter((a) => a.status === "Offer").length,
      closed: applications.filter((a) => a.status === "Rejected").length,
    }),
    [applications]
  );

  const filtered = useMemo(() => applications.filter((a) => matchesTab(a, tab)), [applications, tab]);

  return (
    <div className="flex flex-col gap-6">
      {submittedId && !applicationsState.loading && !applicationsState.error && (
        <SubmittedBanner applications={applications} applicationId={submittedId} />
      )}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">My applications</h1>
          <p className="text-[15px] text-muted-foreground">Track each application from submission to decision.</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList>
            {(Object.keys(TAB_LABEL) as TabValue[]).map((value) => (
              <TabsTrigger key={value} value={value}>
                {TAB_LABEL[value]} · {counts[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {applicationsState.loading ? (
        <ListSkeleton rows={4} />
      ) : applicationsState.error ? (
        <ErrorState message={applicationsState.error.message} onRetry={applicationsState.reload} />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications yet"
          description="Find a job that fits and apply with a tailored resume."
          action={
            <Link href="/seeker/jobs" className={buttonVariants({ size: "lg" })}>
              Find jobs
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          No applications in this view.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <ApplicationsPageInner />
    </Suspense>
  );
}
