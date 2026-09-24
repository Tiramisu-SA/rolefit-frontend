"use client";

import { Suspense, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ListFilter, MapPin, Search, SearchX } from "lucide-react";
import { JobCard } from "@/components/seeker/job-card";
import { JobFilters } from "@/components/seeker/job-filters";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/brand/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsync } from "@/lib/use-async";
import { candidateProfile, jobDiscovery } from "@/lib/api";
import type { JobSearchFilters, JobWithMatch } from "@/lib/types";

type SortOption = "best" | "recent" | "salary";
type TabValue = "recommended" | "all";

const SORT_LABEL: Record<SortOption, string> = {
  best: "Best match",
  recent: "Most recent",
  salary: "Salary",
};

function countActiveFilters(filters: JobSearchFilters): number {
  return (
    (filters.employmentTypes?.length ?? 0) +
    (filters.arrangements?.length ?? 0) +
    (filters.experienceLevels?.length ?? 0) +
    (filters.minSalary ? 1 : 0)
  );
}

function sortJobs(jobs: JobWithMatch[], sort: SortOption): JobWithMatch[] {
  const sorted = [...jobs];
  if (sort === "recent") {
    sorted.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  } else if (sort === "salary") {
    sorted.sort((a, b) => (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0));
  } else {
    sorted.sort((a, b) => b.match.score - a.match.score);
  }
  return sorted;
}

function JobsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<JobSearchFilters>(() => ({
    query: searchParams.get("q") ?? undefined,
    location: searchParams.get("loc") ?? undefined,
  }));
  const [keyword, setKeyword] = useState(filters.query ?? "");
  const [location, setLocation] = useState(filters.location ?? "");
  const [tab, setTab] = useState<TabValue>("recommended");
  const [sort, setSort] = useState<SortOption>("best");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const profileState = useAsync(() => candidateProfile.getProfile(), []);

  const filtersKey = JSON.stringify(filters);
  const jobsState = useAsync(() => jobDiscovery.searchJobs(filters), [filtersKey]);

  function updateUrl(nextFilters: JobSearchFilters) {
    const params = new URLSearchParams();
    if (nextFilters.query) params.set("q", nextFilters.query);
    if (nextFilters.location) params.set("loc", nextFilters.location);
    const qs = params.toString();
    router.replace(qs ? `/seeker/jobs?${qs}` : "/seeker/jobs");
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const nextFilters: JobSearchFilters = {
      ...filters,
      query: keyword.trim() || undefined,
      location: location.trim() || undefined,
    };
    setFilters(nextFilters);
    updateUrl(nextFilters);
  }

  function handleClear() {
    setFilters({});
    setKeyword("");
    setLocation("");
    setMobileFiltersOpen(false);
    router.replace("/seeker/jobs");
  }

  const allJobs = useMemo(() => jobsState.data ?? [], [jobsState.data]);
  const jobs = useMemo(() => {
    const source = tab === "recommended" ? allJobs.filter((j) => j.match.score >= 60) : allJobs;
    return sortJobs(source, sort);
  }, [allJobs, tab, sort]);

  const activeFilterCount = countActiveFilters(filters);

  const filtersPanel = <JobFilters value={filters} onChange={setFilters} onClear={handleClear} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-6 md:p-7">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Find jobs</h1>
            <p className="text-[15px] text-muted-foreground">Match scores come from your verified profile.</p>
          </div>
          {profileState.data?.verified && (
            <span className="flex items-center gap-2 rounded-xl bg-match-strong-soft px-3.5 py-2.5 text-sm font-semibold text-match-strong">
              <CheckCircle2 className="size-4.5" aria-hidden />
              Profile verified · {profileState.data.completeness}% complete
            </span>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2.5 sm:flex-row">
          <div className="flex h-13 flex-1 items-center gap-2.5 rounded-xl border border-input bg-background px-4">
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <Label htmlFor="jobs-keyword" className="sr-only">
              Keyword
            </Label>
            <Input
              id="jobs-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Job title, company, or skill"
              className="h-auto border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="flex h-13 items-center gap-2.5 rounded-xl border border-input bg-background px-4 sm:w-64">
            <MapPin className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <Label htmlFor="jobs-location" className="sr-only">
              Location
            </Label>
            <Input
              id="jobs-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or Remote"
              className="h-auto border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
            />
          </div>
          <Button type="submit" size="lg">
            Search
          </Button>
        </form>
      </div>

      <div className="lg:flex lg:items-start lg:gap-7">
        <div className="mb-5 lg:hidden">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger render={<Button type="button" variant="outline" size="lg" />}>
              <ListFilter className="size-4.5" aria-hidden />
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-4">{filtersPanel}</div>
            </SheetContent>
          </Sheet>
        </div>

        <aside aria-label="Filters" className="hidden lg:block lg:w-72 lg:shrink-0">
          {filtersPanel}
        </aside>

        <main className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
              <TabsList>
                <TabsTrigger value="recommended">Recommended for you</TabsTrigger>
                <TabsTrigger value="all">All jobs</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{jobs.length} jobs</span>
              <div className="flex items-center gap-2">
                <Label htmlFor="jobs-sort" className="whitespace-nowrap font-medium text-foreground">
                  Sort by
                </Label>
                <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                  <SelectTrigger id="jobs-sort" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SORT_LABEL) as SortOption[]).map((option) => (
                      <SelectItem key={option} value={option}>
                        {SORT_LABEL[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {jobsState.loading ? (
            <ListSkeleton rows={4} />
          ) : jobsState.error ? (
            <ErrorState message={jobsState.error.message} onRetry={jobsState.reload} />
          ) : jobs.length > 0 ? (
            <div className="flex flex-col gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No jobs match these filters"
              description="Try removing a filter or searching a broader keyword."
              action={
                <Button type="button" size="lg" onClick={handleClear}>
                  Clear filters
                </Button>
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function SeekerJobsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <JobsPageInner />
    </Suspense>
  );
}
