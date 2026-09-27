import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/brand/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jobPosting, applicationService } from "@/lib/api";
import { WORK_ARRANGEMENT_LABEL, formatLocation } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { JobStatus, JobWithCompany } from "@/lib/types";

export interface JobRow {
  job: JobWithCompany;
  applicants: number;
  newApplicants: number;
  interviews: number;
  avgMatch: number | null;
}

export async function loadJobRows(): Promise<JobRow[]> {
  const jobs = await jobPosting.listMyJobs();
  return Promise.all(
    jobs.map(async (job) => {
      const apps = await applicationService.listApplicantsForJob(job);
      return {
        job,
        applicants: apps.length,
        newApplicants: apps.filter((a) => a.status === "Submitted").length,
        interviews: apps.filter((a) => a.status === "Interview").length,
        avgMatch: apps.length ? Math.round(apps.reduce((s, a) => s + a.matchSnapshot.score, 0) / apps.length) : null,
      };
    }),
  );
}

export interface JobStats {
  openPostings: number;
  openNote: string;
  totalApplicants: number;
  newApplicants: number;
  inInterview: number;
  interviewNote: string;
}

export function computeJobStats(rows: JobRow[]): JobStats {
  const openPostings = rows.filter((r) => r.job.status === "OPEN").length;
  const draftCount = rows.filter((r) => r.job.status === "DRAFT").length;
  const totalApplicants = rows.reduce((s, r) => s + r.applicants, 0);
  const newApplicants = rows.reduce((s, r) => s + r.newApplicants, 0);
  const inInterview = rows.reduce((s, r) => s + r.interviews, 0);
  const postingsWithInterviews = rows.filter((r) => r.interviews > 0).length;
  return {
    openPostings,
    openNote: draftCount > 0 ? `${draftCount} draft${draftCount === 1 ? "" : "s"} waiting to publish` : "All postings published",
    totalApplicants,
    newApplicants,
    inInterview,
    interviewNote: postingsWithInterviews > 0 ? `Across ${postingsWithInterviews} posting${postingsWithInterviews === 1 ? "" : "s"}` : "No active interviews",
  };
}

const ACTION_LABEL: Record<JobStatus, string> = { DRAFT: "Publish", OPEN: "Close", CLOSED: "Reopen" };

export function JobsTable({
  rows,
  onAction,
  onDelete,
  pendingJobId,
}: {
  rows: JobRow[];
  onAction: (job: JobWithCompany) => void;
  /** Only offered for drafts. */
  onDelete: (job: JobWithCompany) => void;
  pendingJobId?: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-5 py-3">Job</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applicants</TableHead>
            <TableHead>Avg. match</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead className="px-5 py-3 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ job, applicants, newApplicants, avgMatch }) => (
            <TableRow key={job.id}>
              <TableCell className="px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <Link href={`/recruiter/jobs/${job.id}/edit`} className="text-[15px] font-bold text-foreground hover:text-primary">
                    {job.title}
                  </Link>
                  <span className="text-muted-foreground">
                    {[formatLocation(job.location), job.workArrangement && WORK_ARRANGEMENT_LABEL[job.workArrangement]].filter(Boolean).join(" · ") ||
                      "Location not set"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={job.status} audience="recruiter" />
              </TableCell>
              <TableCell className="font-semibold">
                {applicants}
                {newApplicants > 0 && <span className="ml-2 text-xs font-bold text-primary-soft-foreground">+{newApplicants} new</span>}
              </TableCell>
              <TableCell className="font-semibold text-foreground/80">{avgMatch !== null ? `${avgMatch}%` : "—"}</TableCell>
              <TableCell className="text-foreground/80">{job.applicationSettings.resumeTemplateId ? "Attached" : "None"}</TableCell>
              <TableCell className="text-foreground/80">
                {job.applicationSettings.applicationDeadline ? formatDate(job.applicationSettings.applicationDeadline) : "Not set"}
              </TableCell>
              <TableCell className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pendingJobId === job.id}
                    onClick={() => onAction(job)}
                  >
                    {ACTION_LABEL[job.status]}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button type="button" variant="outline" size="icon-sm" aria-label="More actions" />}>
                      <MoreHorizontal className="size-4" aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem render={<Link href={`/recruiter/jobs/${job.id}/edit`} />}>Edit</DropdownMenuItem>
                      {job.status === "DRAFT" && (
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(job)}>
                          Delete draft
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
