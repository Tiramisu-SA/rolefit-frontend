"use client";

import Link from "next/link";
import { Award, Briefcase, Gauge, Inbox, Sparkles } from "lucide-react";
import { JobCard } from "@/components/seeker/job-card";
import { CompanyAvatar } from "@/components/brand/company-avatar";
import { StatusBadge } from "@/components/brand/status-badge";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/brand/page-states";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAsync } from "@/lib/use-async";
import { useRole } from "@/lib/auth/role-context";
import { candidateProfile, jobDiscovery, applicationService } from "@/lib/api";
import type { ApplicationStatus } from "@/lib/types";

const ACTIVE_STATUSES: ApplicationStatus[] = ["Submitted", "Under review", "Interview"];

export default function SeekerDashboardPage() {
  const { session } = useRole();
  const firstName = session?.name.trim().split(/\s+/)[0] ?? "there";

  const profileState = useAsync(() => candidateProfile.getProfile(), []);
  const recommendationsState = useAsync(() => jobDiscovery.getRecommendations(3), []);
  const applicationsState = useAsync(() => applicationService.listMyApplications(), []);

  const activeCount = applicationsState.data?.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const offerCount = applicationsState.data?.filter((a) => a.status === "Offer").length;
  const recentApplications = applicationsState.data?.slice(0, 3) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Good to see you, {firstName}</h1>
        <p className="text-[15px] text-muted-foreground">Here&apos;s what&apos;s new for you today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <Gauge className="size-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-muted-foreground">Profile completeness</span>
            {profileState.loading ? (
              <Skeleton className="h-8 w-20" />
            ) : profileState.error ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-destructive">Couldn&apos;t load</span>
                <Button variant="outline" size="sm" onClick={profileState.reload}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-2xl font-extrabold">{profileState.data?.completeness ?? 0}%</span>
                <Progress value={profileState.data?.completeness ?? 0} />
              </div>
            )}
            <Link href="/seeker/profile" className="text-sm font-semibold text-primary hover:underline">
              Improve profile
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-info-soft text-info">
              <Briefcase className="size-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-muted-foreground">Active applications</span>
            {applicationsState.loading ? (
              <Skeleton className="h-8 w-14" />
            ) : applicationsState.error ? (
              <span className="text-sm text-destructive">Couldn&apos;t load</span>
            ) : (
              <span className="text-2xl font-extrabold">{activeCount ?? 0}</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-match-strong-soft text-match-strong">
              <Award className="size-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-muted-foreground">Offers</span>
            {applicationsState.loading ? (
              <Skeleton className="h-8 w-14" />
            ) : applicationsState.error ? (
              <span className="text-sm text-destructive">Couldn&apos;t load</span>
            ) : (
              <span className="text-2xl font-extrabold">{offerCount ?? 0}</span>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Recommended for you</h2>
          <Link href="/seeker/jobs" className="text-sm font-semibold text-primary hover:underline">
            See all
          </Link>
        </div>
        {recommendationsState.loading ? (
          <ListSkeleton rows={3} />
        ) : recommendationsState.error ? (
          <ErrorState message={recommendationsState.error.message} onRetry={recommendationsState.reload} />
        ) : recommendationsState.data && recommendationsState.data.length > 0 ? (
          <div className="flex flex-col gap-4">
            {recommendationsState.data.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="No recommendations yet"
            description="Complete your profile so we can match you with roles that fit."
            action={
              <Link href="/seeker/profile" className={buttonVariants({ size: "lg" })}>
                Complete profile
              </Link>
            }
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent applications</h2>
          <Link href="/seeker/applications" className="text-sm font-semibold text-primary hover:underline">
            See all
          </Link>
        </div>
        {applicationsState.loading ? (
          <ListSkeleton rows={3} className="h-16" />
        ) : applicationsState.error ? (
          <ErrorState message={applicationsState.error.message} onRetry={applicationsState.reload} />
        ) : recentApplications.length > 0 ? (
          <Card>
            <CardContent className="flex flex-col divide-y px-0">
              {recentApplications.map((application) => (
                <Link
                  key={application.id}
                  href="/seeker/applications"
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50"
                >
                  <CompanyAvatar company={application.job.company} size="sm" />
                  <span className="flex-1 truncate text-sm font-semibold text-foreground">{application.job.title}</span>
                  <StatusBadge status={application.status} />
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={Inbox}
            title="No applications yet"
            description="Once you apply to a job, you can track its status here."
            action={
              <Link href="/seeker/jobs" className={buttonVariants({ size: "lg" })}>
                Find jobs
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
