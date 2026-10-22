"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { CompanyAvatar } from "@/components/brand/company-avatar";
import { MatchBadge } from "@/components/brand/match-badge";
import { ErrorState, ListSkeleton } from "@/components/brand/page-states";
import { ResumePreview } from "@/components/seeker/resume-preview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { applicationService, candidateProfile, jobDiscovery, jobPosting, resumePreparation } from "@/lib/api";
import { CreateProfileBanner } from "@/components/seeker/create-profile-banner";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";
import type { JobWithCompany, ResumeFormat } from "@/lib/types";

const STEPS = [
  { n: 1, label: "Generate" },
  { n: 2, label: "Review & edit" },
  { n: 3, label: "Submit" },
] as const;

function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <ol aria-label="Resume progress" className="flex items-center gap-3 text-sm font-semibold">
      {STEPS.map((item, i) => {
        const done = item.n < step;
        const current = item.n === step;
        return (
          <li key={item.n} aria-current={current ? "step" : undefined} className="flex items-center gap-3">
            {i > 0 && (
              <span aria-hidden className={cn("h-0.5 w-8 rounded-full sm:w-10", item.n <= step ? "bg-match-strong-ring" : "bg-border")} />
            )}
            <span className={cn("flex items-center gap-2", done ? "text-match-strong" : current ? "text-primary" : "text-muted-foreground")}>
              <span
                className={cn(
                  "flex size-6.5 shrink-0 items-center justify-center rounded-full text-[13px]",
                  done
                    ? "bg-match-strong-ring text-white"
                    : current
                      ? "bg-primary text-primary-foreground"
                      : "border-2 border-input text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : item.n}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function GenerateCard({ job, generating, onGenerate }: { job: JobWithCompany; generating: boolean; onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
        <Sparkles className="size-6" aria-hidden />
      </span>
      <h2 className="text-lg font-bold">Create a resume tailored for {job.title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        We&apos;ll select and rephrase content from your verified profile to match this role. Nothing is invented.
      </p>
      {generating ? (
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground" aria-live="polite">
          <Loader2 className="size-4.5 animate-spin" aria-hidden />
          Selecting relevant experience…
        </div>
      ) : (
        <Button type="button" size="lg" onClick={onGenerate}>
          <Sparkles className="size-4.5" aria-hidden />
          Generate tailored resume
        </Button>
      )}
    </div>
  );
}

export default function ResumeTailorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const jobState = useAsync(() => jobPosting.getJob(id), [id]);
  const profileState = useAsync(() => candidateProfile.getProfile(), [id]);
  const draftState = useAsync(() => resumePreparation.getResumeDraft(id), [id]);
  const matchState = useAsync(() => jobDiscovery.getMatchResult(id), [id]);

  const [generating, setGenerating] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const job = jobState.data;
  const profile = profileState.data;
  const draft = draftState.data;

  const loading = jobState.loading || profileState.loading || draftState.loading;
  const error = jobState.error ?? profileState.error ?? draftState.error;

  function reloadAll() {
    jobState.reload();
    profileState.reload();
    draftState.reload();
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const newDraft = await resumePreparation.generateTailoredResume(id);
      draftState.setData(newDraft);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate resume");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const newDraft = await resumePreparation.generateTailoredResume(id);
      draftState.setData(newDraft);
      setRegenerateOpen(false);
      toast.success("Resume regenerated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not regenerate resume");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleFormatChange(format: ResumeFormat) {
    if (!draft || format === draft.format) return;
    const previous = draft;
    draftState.setData({ ...draft, format });
    try {
      const updated = await resumePreparation.selectResumeFormat(id, format);
      draftState.setData(updated);
    } catch (e) {
      draftState.setData(previous);
      toast.error(e instanceof Error ? e.message : "Could not change resume format");
    }
  }

  async function handleToggleSection(sectionId: string) {
    if (!draft) return;
    const previous = draft;
    const sections = draft.sections.map((s) => (s.id === sectionId ? { ...s, included: !s.included } : s));
    draftState.setData({ ...draft, sections });
    try {
      const updated = await resumePreparation.editResumeDraft(id, sections);
      draftState.setData(updated);
    } catch (e) {
      draftState.setData(previous);
      toast.error(e instanceof Error ? e.message : "Could not update section");
    }
  }

  async function handleEditBullet(sectionId: string, bulletId: string, text: string) {
    if (!draft) return;
    const previous = draft;
    const sections = draft.sections.map((s) =>
      s.id === sectionId ? { ...s, bullets: s.bullets.map((b) => (b.id === bulletId ? { ...b, text } : b)) } : s
    );
    draftState.setData({ ...draft, sections });
    try {
      const updated = await resumePreparation.editResumeDraft(id, sections);
      draftState.setData(updated);
    } catch (e) {
      draftState.setData(previous);
      toast.error(e instanceof Error ? e.message : "Could not save your edit");
    }
  }

  function openSubmitDialog() {
    setSubmitError(null);
    setReviewed(false);
    setSubmitOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await resumePreparation.approveResume(id);
      const application = await applicationService.submitApplication(id);
      toast.success(`Application sent to ${job?.company.name ?? "the company"}`);
      router.push(`/seeker/applications?submitted=${application.id}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasTemplate = Boolean(job?.applicationSettings.resumeTemplateId);
  const formatOptions: { value: ResumeFormat; label: string; hint: string }[] = hasTemplate
    ? [
        { value: "company", label: `${job!.company.name} company template`, hint: "Provided by the recruiter for this job" },
        { value: "personal", label: "My default format", hint: "Your personal layout from your profile" },
      ]
    : [{ value: "personal", label: "My default format", hint: "Your personal layout from your profile" }];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/seeker/jobs/${id}`} className="flex items-center gap-2 text-[15px] font-semibold text-foreground/80 hover:text-primary">
          <ArrowLeft className="size-4.5" aria-hidden />
          Back to job
        </Link>
        <Stepper step={draft ? 2 : 1} />
      </div>

      {loading ? (
        <ListSkeleton rows={2} className="h-72" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reloadAll} />
      ) : profile === null ? (
        <CreateProfileBanner />
      ) : job && job.status !== "OPEN" && !draft ? (
        <p className="rounded-2xl border bg-card p-6 text-[15px] text-muted-foreground">
          This job is no longer accepting applications.
        </p>
      ) : job && profile ? (
        !draft ? (
          <GenerateCard job={job} generating={generating} onGenerate={handleGenerate} />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <aside className="flex w-full flex-col gap-5 lg:w-[460px] lg:shrink-0">
              <section className="flex items-center gap-3.5 rounded-2xl border bg-card p-5">
                <CompanyAvatar company={job.company} size="md" />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-base font-bold">{job.title}</span>
                  <span className="text-sm text-muted-foreground">{job.company.name}</span>
                </div>
                {matchState.data && <MatchBadge score={matchState.data.score} />}
              </section>

              <section className="flex flex-col gap-3.5 rounded-2xl border bg-card p-6">
                <h2 className="text-[17px] font-bold">Resume format</h2>
                <RadioGroup
                  aria-label="Resume format"
                  value={draft.format}
                  onValueChange={(value: ResumeFormat) => handleFormatChange(value)}
                  className="gap-2.5"
                >
                  {formatOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3.5 rounded-2xl border-2 p-4 transition-colors",
                        draft.format === opt.value ? "border-primary bg-primary-soft" : "border-border bg-background hover:bg-muted/40"
                      )}
                    >
                      <RadioGroupItem value={opt.value} />
                      <span className="flex flex-col gap-0.5 text-left">
                        <span className="text-[15px] font-bold text-foreground">{opt.label}</span>
                        <span className="text-[13px] text-muted-foreground">{opt.hint}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
                {!hasTemplate && (
                  <p className="text-[13px] text-muted-foreground">
                    This job has no company template, so your default format is used.
                  </p>
                )}
              </section>

              <section className="flex flex-col gap-3.5 rounded-2xl border bg-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[17px] font-bold">What we emphasized</h2>
                  <Button type="button" variant="outline" size="lg" onClick={() => setRegenerateOpen(true)}>
                    Regenerate
                  </Button>
                </div>
                <ul className="flex flex-col gap-2">
                  {draft.sections.map((section) => (
                    <li key={section.id}>
                      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-muted/50 px-3.5 py-3">
                        <span className="flex items-center gap-2.5 text-[15px] font-semibold">
                          <Checkbox
                            checked={section.included}
                            onCheckedChange={() => handleToggleSection(section.id)}
                            aria-label={`Include ${section.title} in the resume`}
                          />
                          {section.title}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                            section.emphasized ? "bg-primary-soft text-primary-soft-foreground" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {section.emphasized ? "Emphasized" : "Kept"}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="flex gap-3 rounded-2xl bg-primary-soft px-4.5 py-4 text-sm leading-relaxed text-primary-soft-foreground">
                <ShieldCheck className="size-5 shrink-0" aria-hidden />
                <span>
                  Built only from your verified profile. AI can reorder and rephrase your content, but it cannot add skills, jobs
                  or achievements.
                </span>
              </div>
            </aside>

            <main className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-extrabold tracking-tight">Preview</h1>
                  <span className="text-sm text-muted-foreground">Highlighted lines were tailored for this job. Click any line to edit it.</span>
                </div>
                <div className="flex gap-2.5">
                  <Button type="button" variant="outline" size="lg" onClick={() => toast.success("Draft saved")}>
                    Save draft
                  </Button>
                  <Button type="button" size="lg" onClick={openSubmitDialog}>
                    Approve &amp; submit application
                  </Button>
                </div>
              </div>

              <ResumePreview
                draft={draft}
                profile={profile}
                companyName={job.company.name}
                companyColor={job.company.color}
                onEditBullet={handleEditBullet}
              />
            </main>
          </div>
        )
      ) : null}

      <Dialog
        open={regenerateOpen}
        onOpenChange={(open) => {
          if (!regenerating) setRegenerateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate resume?</DialogTitle>
            <DialogDescription>Your edits will be replaced with a new tailored draft.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" size="lg" disabled={regenerating} />}>Cancel</DialogClose>
            <Button type="button" size="lg" disabled={regenerating} onClick={handleRegenerate}>
              {regenerating && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={submitOpen}
        onOpenChange={(open) => {
          if (!submitting) setSubmitOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit your application?</DialogTitle>
            <DialogDescription>
              We&apos;ll send this resume to {job?.company.name} for {job?.title}. You can&apos;t edit it after submitting.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <p role="alert" className="rounded-lg bg-destructive-soft px-3.5 py-2.5 text-sm font-semibold text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex items-center gap-2.5">
            <Checkbox id="reviewed-check" checked={reviewed} onCheckedChange={(checked) => setReviewed(checked === true)} />
            <Label htmlFor="reviewed-check" className="cursor-pointer text-[15px] font-normal">
              I&apos;ve reviewed this resume and it&apos;s accurate
            </Label>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" size="lg" disabled={submitting} />}>Cancel</DialogClose>
            <Button type="button" size="lg" disabled={!reviewed || submitting} onClick={handleSubmit}>
              {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Submit application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
