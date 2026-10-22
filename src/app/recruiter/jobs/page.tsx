"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Briefcase, Plus, Search } from "lucide-react";
import { StatCard } from "@/components/recruiter/stat-card";
import { JobsTable, computeJobStats, loadJobRows, type JobRow } from "@/components/recruiter/jobs-table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/brand/page-states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsync } from "@/lib/use-async";
import { jobPosting } from "@/lib/api";
import type { JobWithCompany } from "@/lib/types";

type TabValue = "all" | "OPEN" | "DRAFT" | "CLOSED";

const TAB_LABEL: Record<TabValue, string> = { all: "All", OPEN: "Open", DRAFT: "Draft", CLOSED: "Closed" };

function matchesTab(row: JobRow, tab: TabValue): boolean {
  return tab === "all" || row.job.status === tab;
}

export default function RecruiterJobsPage() {
  const rowsState = useAsync(() => loadJobRows(), []);
  const rows = useMemo(() => rowsState.data ?? [], [rowsState.data]);

  const [tab, setTab] = useState<TabValue>("all");
  const [query, setQuery] = useState("");
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<JobWithCompany | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobWithCompany | null>(null);

  const counts = useMemo(
    () => ({
      all: rows.length,
      OPEN: rows.filter((r) => r.job.status === "OPEN").length,
      DRAFT: rows.filter((r) => r.job.status === "DRAFT").length,
      CLOSED: rows.filter((r) => r.job.status === "CLOSED").length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => matchesTab(r, tab) && (q === "" || r.job.title.toLowerCase().includes(q)));
  }, [rows, tab, query]);

  const stats = useMemo(() => computeJobStats(rows), [rows]);

  async function runAction(id: string, label: string, run: (id: string) => Promise<unknown>) {
    setPendingJobId(id);
    try {
      await run(id);
      toast.success(label);
      rowsState.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPendingJobId(null);
    }
  }

  function handleAction(job: JobWithCompany) {
    if (job.status === "DRAFT") {
      void runAction(job.id, "Job published", jobPosting.publishJob);
    } else if (job.status === "OPEN") {
      setCloseTarget(job);
    } else {
      void runAction(job.id, "Job reopened", jobPosting.reopenJob);
    }
  }

  async function confirmClose() {
    if (!closeTarget) return;
    const job = closeTarget;
    setCloseTarget(null);
    await runAction(job.id, "Job closed", jobPosting.closeJob);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const job = deleteTarget;
    setDeleteTarget(null);
    await runAction(job.id, "Draft deleted", jobPosting.deleteJob);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Job postings</h1>
          <p className="text-[15px] text-muted-foreground">Create, publish and manage your openings.</p>
        </div>
        <Link href="/recruiter/jobs/new" className={buttonVariants({ size: "lg" })}>
          <Plus className="size-4.5" aria-hidden />
          Create job
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open postings" value={stats.openPostings} note={stats.openNote} />
        <StatCard label="Total applicants" value={stats.totalApplicants} note="Across all postings" />
        <StatCard label="New applicants" value={stats.newApplicants} note="Not yet reviewed" />
        <StatCard label="In interview" value={stats.inInterview} note={stats.interviewNote} />
      </div>

      <section className="flex flex-col gap-0 rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
            <TabsList>
              {(Object.keys(TAB_LABEL) as TabValue[]).map((value) => (
                <TabsTrigger key={value} value={value}>
                  {TAB_LABEL[value]} · {counts[value]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-input px-3 text-muted-foreground sm:w-70">
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">Search postings</span>
            <Input
              type="text"
              placeholder="Search postings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-auto border-0 p-0 focus-visible:ring-0"
            />
          </label>
        </div>

        {rowsState.loading ? (
          <div className="p-4">
            <ListSkeleton rows={4} />
          </div>
        ) : rowsState.error ? (
          <div className="p-4">
            <ErrorState message={rowsState.error.message} onRetry={rowsState.reload} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Briefcase}
              title="No job postings yet"
              description="Create your first posting to start attracting candidates."
              action={
                <Link href="/recruiter/jobs/new" className={buttonVariants({ size: "lg" })}>
                  Create job
                </Link>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No postings match this view.</p>
        ) : (
          <JobsTable rows={filtered} onAction={handleAction} onDelete={setDeleteTarget} pendingJobId={pendingJobId} />
        )}
      </section>

      <Dialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this posting?</DialogTitle>
            <DialogDescription>Candidates can no longer apply.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={() => setCloseTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="lg" onClick={() => void confirmClose()}>
              Close posting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this draft?</DialogTitle>
            <DialogDescription>The draft and its resume template will be deleted. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="lg" onClick={() => void confirmDelete()}>
              Delete draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
