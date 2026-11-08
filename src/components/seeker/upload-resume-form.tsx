"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Upload } from "lucide-react";
import { DownloadTemplateButton } from "@/components/seeker/download-template-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, applicationService } from "@/lib/api";
import { scopeErrors } from "@/lib/field-errors";
import { formatFileSize, resumeFileErrorMessage, validateResumeFile } from "@/lib/resume-file";
import type { JobWithCompany } from "@/lib/types";

/** Apply with a PDF or DOCX the seeker already has, instead of a resume tailored by AI. */
export function UploadResumeForm({ job }: { job: JobWithCompany }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const coverLetterRequired = job.applicationSettings.requireCoverLetter;
  const coverLetterMissing = coverLetterRequired && coverLetter.trim() === "";

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!chosen) return;
    const problem = validateResumeFile(chosen);
    setFileError(problem);
    setFile(problem ? null : chosen);
  }

  async function handleSubmit() {
    if (!file || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setFileError(null);
    setCoverLetterError(null);
    try {
      const application = await applicationService.submitApplication(job.id, coverLetter, file);
      toast.success(`Application sent to ${job.company.name}`);
      router.push(`/seeker/applications?submitted=${application.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors?.length) {
        const fileErrors = scopeErrors(e.fieldErrors, "resumeFile.");
        const topLevel = scopeErrors(e.fieldErrors);
        const serverFileError = Object.values(fileErrors)[0] ?? topLevel.resumeFile;
        setFileError(serverFileError ? resumeFileErrorMessage(serverFileError) : null);
        setCoverLetterError(topLevel.coverLetter ?? null);
        if (!Object.keys(fileErrors).length && !topLevel.resumeFile && !topLevel.coverLetter) setSubmitError(e.message);
      } else {
        setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 rounded-2xl border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">Upload your resume for {job.title}</h2>
        <p className="text-sm text-muted-foreground">
          Send a PDF or DOCX file (up to 5 MB) to {job.company.name} as it is. We won&apos;t change it.
        </p>
      </div>

      {job.applicationSettings.resumeTemplateId && (
        <div className="flex flex-col items-start gap-3 rounded-xl bg-primary-soft px-4 py-3.5">
          <p className="text-sm font-semibold text-primary-soft-foreground">
            This company provides a resume template. Download it, fill it in, then upload it here.
          </p>
          <DownloadTemplateButton jobId={job.id} variant="outline" />
          <p className="text-xs text-muted-foreground">Prefer not to fill it in yourself? Go back and choose Tailor my resume with AI to get a tailored resume in this company&apos;s style.</p>
        </div>
      )}

      {submitError && (
        <p role="alert" className="rounded-lg bg-destructive-soft px-3.5 py-2.5 text-sm font-semibold text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="resume-file" className="text-sm font-bold">
          Resume file
        </Label>
        <input
          ref={fileInput}
          id="resume-file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={submitting}
          aria-invalid={fileError ? true : undefined}
          aria-describedby="resume-file-hint"
          className="sr-only"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="lg" disabled={submitting} onClick={() => fileInput.current?.click()}>
            <Upload className="size-4.5" aria-hidden />
            {file ? "Choose a different file" : "Choose file"}
          </Button>
          {file && (
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <FileText className="size-4.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate font-semibold [overflow-wrap:anywhere]">{file.name}</span>
              <span className="shrink-0 text-muted-foreground">({formatFileSize(file.size)})</span>
            </span>
          )}
        </div>
        {fileError ? (
          <p id="resume-file-hint" role="alert" className="text-sm font-semibold text-destructive">
            {fileError}
          </p>
        ) : (
          <p id="resume-file-hint" className="text-xs text-muted-foreground">
            PDF or DOCX, up to 5 MB.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="upload-cover-letter" className="text-sm font-bold">
          Cover letter{" "}
          <span className="font-normal text-muted-foreground">{coverLetterRequired ? "(required for this job)" : "(optional)"}</span>
        </Label>
        <Textarea
          id="upload-cover-letter"
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          maxLength={applicationService.COVER_LETTER_MAX_LENGTH}
          required={coverLetterRequired}
          aria-required={coverLetterRequired}
          aria-invalid={coverLetterError ? true : undefined}
          disabled={submitting}
          placeholder={`Tell ${job.company.name} why you're a good fit for this role.`}
          className="max-h-64 min-h-28"
        />
        {coverLetterError && <p role="alert" className="text-sm font-semibold text-destructive">{coverLetterError}</p>}
        <span className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{coverLetterRequired ? "This job asks for a cover letter. Write a few sentences to submit." : "Sent to the recruiter with your resume."}</span>
          <span className="tabular-nums">
            {coverLetter.length.toLocaleString("en-US")} / {applicationService.COVER_LETTER_MAX_LENGTH.toLocaleString("en-US")}
          </span>
        </span>
      </div>

      <div>
        <Button type="button" size="lg" disabled={!file || coverLetterMissing || submitting} onClick={() => void handleSubmit()}>
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Submit application
        </Button>
      </div>
    </div>
  );
}
