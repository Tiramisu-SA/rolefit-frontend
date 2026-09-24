"use client";

import { useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, Info, Loader2, Pencil, Upload } from "lucide-react";
import { ProfileSections } from "@/components/seeker/profile-sections";
import { ErrorState, ListSkeleton } from "@/components/brand/page-states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAsync } from "@/lib/use-async";
import { candidateProfile } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CandidateProfile } from "@/lib/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_FILE_RE = /\.(pdf|docx?)$/i;

type Mode = "view" | "import" | "review" | "edit";

export default function ProfilePage() {
  const profileState = useAsync(() => candidateProfile.getProfile(), []);

  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState<CandidateProfile>();
  const [extractedFileName, setExtractedFileName] = useState<string>();
  const [importing, setImporting] = useState(false);
  const [fileError, setFileError] = useState<string>();
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    if (!profileState.data) return;
    setDraft({ ...profileState.data });
    setMode("edit");
  }

  function cancel() {
    setMode("view");
    setDraft(undefined);
    setExtractedFileName(undefined);
    setFileError(undefined);
    setDragOver(false);
  }

  async function handleFile(file: File) {
    setFileError(undefined);
    if (!ACCEPTED_FILE_RE.test(file.name)) {
      setFileError("Please choose a PDF or Word document (.pdf, .doc, .docx).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("This file is larger than 5 MB. Choose a smaller file.");
      return;
    }
    setImporting(true);
    try {
      const extracted = await candidateProfile.importResume(file);
      const base = profileState.data;
      setDraft({
        id: base?.id ?? "temp",
        verified: base?.verified ?? false,
        completeness: base?.completeness ?? 0,
        ...extracted.profile,
      });
      setExtractedFileName(extracted.fileName);
      setMode("review");
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Couldn't read this file. Try again.");
    } finally {
      setImporting(false);
    }
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFile(file);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  async function confirmExtracted() {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await candidateProfile.confirmExtractedProfile(draft);
      profileState.setData(saved);
      toast.success("Profile confirmed");
      cancel();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdits() {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await candidateProfile.updateProfile(draft);
      profileState.setData(saved);
      toast.success("Profile saved");
      cancel();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (profileState.loading) {
    return <ListSkeleton rows={4} />;
  }
  if (profileState.error || !profileState.data) {
    return <ErrorState message={profileState.error?.message ?? "Profile not found"} onRetry={profileState.reload} />;
  }

  const profile = profileState.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">My profile</h1>
        <p className="text-[15px] text-muted-foreground">Keep your profile current so job matches stay accurate.</p>
      </div>

      {mode === "view" && (
        <>
          <div className="flex flex-col gap-5 rounded-2xl border bg-card p-6 md:flex-row md:items-center md:justify-between md:p-7">
            <div className="flex items-center gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-xl font-bold text-primary-soft-foreground">
                {profile.initials}
              </span>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-tight text-foreground">{profile.name}</h2>
                  {profile.verified && (
                    <span className="flex items-center gap-1.5 rounded-full bg-match-strong-soft px-2.5 py-1 text-xs font-bold text-match-strong">
                      <CheckCircle2 className="size-3.5" aria-hidden />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-[15px] text-muted-foreground">{profile.headline}</p>
                <div className="flex items-center gap-2.5 pt-1">
                  <Progress value={profile.completeness} className="w-40" aria-label="Profile completeness" />
                  <span className="text-sm font-semibold text-muted-foreground">{profile.completeness}% complete</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="lg" onClick={() => setMode("import")}>
                <Upload className="size-4" aria-hidden />
                Import from resume
              </Button>
              <Button type="button" size="lg" onClick={startEdit}>
                <Pencil className="size-4" aria-hidden />
                Edit profile
              </Button>
            </div>
          </div>

          <ProfileSections profile={profile} />
        </>
      )}

      {mode === "import" && (
        <div className="flex flex-col gap-5 rounded-2xl border bg-card p-6 md:p-8">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h2 className="text-lg font-bold">Import from resume</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Upload your resume and we&apos;ll pre-fill your profile. You&apos;ll review every detail before anything is saved.
            </p>
          </div>

          {importing ? (
            <div role="status" className="flex flex-col items-center gap-3 py-12 text-[15px] font-semibold text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
              Reading your resume…
            </div>
          ) : (
            <label
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                dragOver ? "border-primary bg-primary-soft" : "border-input bg-muted/30 hover:bg-muted/50"
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                <Upload className="size-6" aria-hidden />
              </span>
              <span className="text-[15px] font-semibold text-foreground">Drop your resume here, or click to choose a file</span>
              <span className="text-sm text-muted-foreground">PDF or Word, up to 5 MB</span>
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={onFileInputChange} />
            </label>
          )}

          {fileError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {fileError}
            </p>
          )}

          <div className="flex justify-center">
            <Button type="button" variant="outline" size="lg" onClick={cancel} disabled={importing}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "review" && draft && (
        <div className="flex flex-col gap-5">
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-info/30 bg-info-soft px-5 py-4 text-[15px] text-info">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              We extracted this from <strong className="font-bold">{extractedFileName}</strong>. Check every detail — only confirmed
              information is used for matching and resumes.
            </span>
          </div>

          <ProfileSections profile={draft} editable onChange={setDraft} />

          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" onClick={confirmExtracted} disabled={saving}>
              {saving ? "Saving…" : "Confirm and save"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={cancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "edit" && draft && (
        <div className="flex flex-col gap-5">
          <ProfileSections profile={draft} editable onChange={setDraft} />

          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" onClick={saveEdits} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={cancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
