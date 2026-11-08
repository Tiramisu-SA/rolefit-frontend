"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { applicationService } from "@/lib/api";
import { MATCH_TIER_CLASS, matchTier } from "@/lib/match";
import { saveBlob } from "@/lib/download";
import { uploadedResumeLabel } from "@/lib/resume-file";
import { cn, formatDate } from "@/lib/utils";
import type { ApplicationStatus, ApplicationView } from "@/lib/types";

const STATUS_OPTIONS: ApplicationStatus[] = ["Under review", "Interview", "Offer", "Rejected"];

export function ApplicantDetail({ application, onUpdated }: { application: ApplicationView; onUpdated: (a: ApplicationView) => void }) {
  // The applicants page can render this twice (side panel + mobile sheet), so ids must be unique per instance.
  const uid = useId();
  const noteId = `${uid}-note`;
  const coverLetterTitleId = `${uid}-cover-letter`;
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | undefined>(
    STATUS_OPTIONS.includes(application.status) ? application.status : undefined,
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const snapshot = application.matchSnapshot;
  const firstName = application.candidate.name.trim().split(/\s+/)[0] ?? application.candidate.name;
  const uploadedFile = application.resumeSource === "uploaded" ? application.resumeFile : null;
  const resumeLabel = uploadedFile
    ? uploadedResumeLabel(uploadedFile)
    : `${application.resumeFormat === "company" ? "Company style" : "Personal format"} · approved by candidate`;
  const canViewResume = uploadedFile !== null || (application.resumeSnapshot?.length ?? 0) > 0;
  const [resumeOpen, setResumeOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const history = [...application.history].reverse();

  function focusAndSelect(nextIdx: number) {
    setSelectedStatus(STATUS_OPTIONS[nextIdx]);
    radioRefs.current[nextIdx]?.focus();
  }

  function handleRadioKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = selectedStatus ?? STATUS_OPTIONS[0];
    const idx = STATUS_OPTIONS.indexOf(current);
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIdx = (idx + 1) % STATUS_OPTIONS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") nextIdx = (idx - 1 + STATUS_OPTIONS.length) % STATUS_OPTIONS.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = STATUS_OPTIONS.length - 1;
    if (nextIdx !== null) {
      e.preventDefault();
      focusAndSelect(nextIdx);
    }
  }

  async function handleViewResume() {
    if (!uploadedFile) {
      setResumeOpen(true);
      return;
    }
    if (opening) return;
    setOpening(true);
    try {
      const blob = await applicationService.downloadResumeFile(application.id);
      saveBlob(blob, uploadedFile.fileName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open this resume");
    } finally {
      setOpening(false);
    }
  }

  async function handleUpdate() {
    if (!selectedStatus || selectedStatus === application.status || saving) return;
    setSaving(true);
    try {
      const updated = await applicationService.updateApplicationStatus(application.id, selectedStatus, note.trim() || undefined, application.job);
      toast.success(updated.notificationQueued ? `Status updated. ${firstName} will get an email about the change.` : "Status updated.");
      setNote("");
      onUpdated(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this application");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3.5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-extrabold text-primary-soft-foreground">
          {application.candidate.initials}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-extrabold">{application.candidate.name}</span>
          {application.candidate.headline && <span className="text-sm text-muted-foreground">{application.candidate.headline}</span>}
          <span className="text-[13px] text-muted-foreground">
            Applied {formatDate(application.submittedAt)} ·{" "}
            <a href={`mailto:${application.candidate.email}`} className="font-semibold text-primary hover:underline">
              {application.candidate.email}
            </a>
          </span>
        </div>
      </div>

      {snapshot ? (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Match snapshot</span>
            <span className={cn("text-lg font-extrabold", MATCH_TIER_CLASS[matchTier(snapshot.score)].text)}>{snapshot.score}%</span>
          </div>
          <Progress value={snapshot.score} aria-label="Match score" />
          <p className="text-sm leading-relaxed text-foreground/85">{snapshot.summary}</p>
          <span className="text-xs text-muted-foreground">
            Captured when the candidate applied ({formatDate(snapshot.capturedAt)}). Decision support only.
          </span>
        </div>
      ) : (
        <p className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">No match snapshot was stored for this application.</p>
      )}

      {application.coverLetter ? (
        <section aria-labelledby={coverLetterTitleId} className="flex flex-col gap-2 rounded-2xl border p-4">
          <h3 id={coverLetterTitleId} className="text-sm font-bold text-foreground">
            Cover letter
          </h3>
          <p className="max-h-72 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-foreground/85 [overflow-wrap:anywhere]">
            {application.coverLetter}
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">No cover letter was sent with this application.</p>
      )}

      <div className="flex items-center gap-3 rounded-xl border p-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <FileText className="size-[19px]" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14px] font-bold text-foreground">Submitted resume</span>
          <span className="text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{resumeLabel}</span>
        </span>
        {canViewResume ? (
          <Button type="button" variant="outline" disabled={opening} onClick={() => void handleViewResume()}>
            {opening && <Loader2 className="size-4 animate-spin" aria-hidden />}
            View resume
          </Button>
        ) : (
          <span className="shrink-0 text-[13px] text-muted-foreground">Not available</span>
        )}
      </div>

      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{application.candidate.name}&apos;s resume</DialogTitle>
            <DialogDescription>{resumeLabel}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {(application.resumeSnapshot ?? []).map((section) => (
              <section key={section.id} className="flex flex-col gap-1.5">
                <h3 className="text-[15px] font-bold text-foreground">{section.title}</h3>
                {section.meta && <span className="text-[13px] text-muted-foreground">{section.meta}</span>}
                {section.bullets.length > 0 && (
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-foreground/85">
                    {section.bullets.map((b) => (
                      <li key={b.id}>{b.text}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-sm font-bold">Update status</legend>
        <div role="radiogroup" aria-label="Update status" onKeyDown={handleRadioKeyDown} className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((status, i) => {
            const checked = selectedStatus === status;
            const tabbable = checked || (!selectedStatus && i === 0);
            return (
              <button
                key={status}
                ref={(el) => {
                  radioRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={tabbable ? 0 : -1}
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  "flex h-11 items-center justify-center rounded-lg border-2 px-3 text-[14px] font-bold transition-colors",
                  checked ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border bg-background text-foreground/80 hover:bg-muted/50",
                )}
              >
                {status}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={noteId} className="text-sm font-bold">
          Note <span className="font-medium text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id={noteId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Saved in the status history. It is not included in the email."
        />
      </div>

      <Button
        type="button"
        size="lg"
        disabled={!selectedStatus || selectedStatus === application.status || saving}
        onClick={() => void handleUpdate()}
      >
        {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Update status &amp; notify candidate
      </Button>

      {history.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <h3 className="text-sm font-bold text-foreground">Status history</h3>
          <ol className="flex flex-col gap-3">
            {history.map((change, i) => (
              <li key={i} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:gap-3">
                <span className="font-semibold text-foreground sm:w-28 sm:shrink-0">{change.status}</span>
                <span className="text-muted-foreground sm:w-24 sm:shrink-0">{formatDate(change.at)}</span>
                {change.note && <span className="text-muted-foreground sm:flex-1">{change.note}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
