"use client";

import { useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileUp, Info, Loader2, PenLine, Upload } from "lucide-react";
import { ErrorState, ListSkeleton } from "@/components/brand/page-states";
import { ProfileDocumentEditor } from "@/components/seeker/profile/document-editor";
import { BasicsFields } from "@/components/seeker/profile/fields";
import {
  BasicsCard,
  DangerZone,
  EducationCard,
  ExperienceCard,
  PreferencesCard,
  ProjectsCard,
  SkillsCard,
  SummaryCard,
} from "@/components/seeker/profile/live-cards";
import { EditorActions, SectionCard } from "@/components/seeker/profile/shared";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { candidateProfile } from "@/lib/api";
import { ApiError, type FieldError } from "@/lib/api/errors";
import { scopeErrors } from "@/lib/field-errors";
import { emptyProfileDocument, profileCompleteness, profileInitials } from "@/lib/profile";
import type { ProfileBasics, ProfileDocument } from "@/lib/types";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_FILE_RE = /\.(pdf|docx?)$/i;

type Mode = "view" | "create" | "import" | "review";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

export default function ProfilePage() {
  const profileState = useAsync(() => candidateProfile.getProfile(), []);
  const profile = profileState.data;

  const [mode, setMode] = useState<Mode>("view");
  const [importing, setImporting] = useState(false);
  const [fileError, setFileError] = useState<string>();
  const [dragOver, setDragOver] = useState(false);
  const [doc, setDoc] = useState<ProfileDocument>();
  const [extractedFileName, setExtractedFileName] = useState<string>();
  const [docErrors, setDocErrors] = useState<FieldError[]>();
  const [saving, setSaving] = useState(false);

  /** Re-reads the profile without showing the loading skeleton. */
  async function refresh() {
    try {
      profileState.setData(await candidateProfile.getProfile());
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  function backToView() {
    setMode("view");
    setDoc(undefined);
    setDocErrors(undefined);
    setFileError(undefined);
    setDragOver(false);
  }

  // --- import -> review -> confirm ---

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
      setDoc(extracted.profile);
      setExtractedFileName(extracted.fileName);
      setDocErrors(undefined);
      setMode("review");
    } catch (e) {
      setFileError(errorText(e));
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

  async function confirmDocument() {
    if (!doc) return;
    setSaving(true);
    setDocErrors(undefined);
    try {
      const saved = await candidateProfile.confirmProfile({
        ...doc,
        links: doc.links.filter((l) => l.trim()),
        experience: doc.experience.map((x) => ({ ...x, bullets: x.bullets.filter((b) => b.trim()) })),
        projects: doc.projects.map((x) => ({ ...x, bullets: x.bullets.filter((b) => b.trim()) })),
      });
      profileState.setData(saved);
      toast.success("Profile confirmed");
      backToView();
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors?.length) {
        setDocErrors(e.fieldErrors);
        toast.error("Some fields need fixing before you can save.");
      } else {
        toast.error(errorText(e));
      }
    } finally {
      setSaving(false);
    }
  }

  // --- start from scratch ---

  const [basics, setBasics] = useState<Omit<ProfileBasics, "summary">>(emptyProfileDocument());
  const [basicsErrors, setBasicsErrors] = useState<FieldError[]>();

  async function createFromScratch(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBasicsErrors(undefined);
    try {
      const saved = await candidateProfile.createProfile({ ...basics, links: basics.links.filter((l) => l.trim()) });
      profileState.setData(saved);
      toast.success("Profile created");
      backToView();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.length) setBasicsErrors(err.fieldErrors);
      else toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  // --- render ---

  if (profileState.loading) return <ListSkeleton rows={4} />;
  if (profileState.error) return <ErrorState message={profileState.error.message} onRetry={profileState.reload} />;

  const header = (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">My profile</h1>
      <p className="text-[15px] text-muted-foreground">Keep your profile current so job matches stay accurate.</p>
    </div>
  );

  if (mode === "import") {
    return (
      <div className="flex flex-col gap-6">
        {header}
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
                dragOver ? "border-primary bg-primary-soft" : "border-input bg-muted/30 hover:bg-muted/50",
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
            <Button type="button" variant="outline" size="lg" onClick={backToView} disabled={importing}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "review" && doc) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-info/30 bg-info-soft px-5 py-4 text-[15px] text-info">
          <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            We extracted this from <strong className="font-bold">{extractedFileName}</strong>. Check every detail — only confirmed information is
            used for matching and resumes.
          </span>
        </div>
        {profile && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-match-good/40 bg-match-good-soft px-5 py-4 text-[15px] text-match-good">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>Confirming replaces your current profile, including every skill, experience, education and project entry.</span>
          </div>
        )}
        <ProfileDocumentEditor doc={doc} onChange={setDoc} fieldErrors={docErrors} />
        <div className="flex flex-wrap gap-3">
          <Button type="button" size="lg" onClick={() => void confirmDocument()} disabled={saving}>
            {saving ? "Saving…" : "Confirm and save"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={backToView} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    if (mode === "create") {
      return (
        <div className="flex flex-col gap-6">
          {header}
          <SectionCard title="Start your profile">
            <form onSubmit={createFromScratch} className="flex flex-col gap-4" noValidate>
              <p className="text-sm text-muted-foreground">Start with the basics. You can add skills, experience and more next.</p>
              <BasicsFields value={basics} onChange={setBasics} errors={scopeErrors(basicsErrors)} />
              <EditorActions saving={saving} onCancel={backToView} saveLabel="Create profile" />
            </form>
          </SectionCard>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <h2 className="text-lg font-bold">You don&apos;t have a profile yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Your profile powers job matches and tailored resumes. Upload a resume to fill it in quickly, or start from scratch.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" size="lg" onClick={() => setMode("import")}>
              <FileUp className="size-4" aria-hidden />
              Upload resume
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => setMode("create")}>
              <PenLine className="size-4" aria-hidden />
              Start from scratch
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const completeness = profileCompleteness(profile);

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-6 md:flex-row md:items-center md:justify-between md:p-7">
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-xl font-bold text-primary-soft-foreground">
            {profileInitials(profile.name)}
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
            {profile.headline && <p className="text-[15px] text-muted-foreground">{profile.headline}</p>}
            <div className="flex items-center gap-2.5 pt-1">
              <Progress value={completeness} className="w-40" aria-label="Profile completeness" />
              <span className="text-sm font-semibold text-muted-foreground">{completeness}% complete</span>
            </div>
          </div>
        </div>
        <Button type="button" variant="outline" size="lg" onClick={() => setMode("import")}>
          <Upload className="size-4" aria-hidden />
          Import from resume
        </Button>
      </div>

      <BasicsCard profile={profile} onSaved={profileState.setData} />
      <SummaryCard profile={profile} onSaved={profileState.setData} />
      <SkillsCard skills={profile.skills} onChanged={refresh} />
      <ExperienceCard items={profile.experience} onChanged={refresh} />
      <ProjectsCard items={profile.projects} onChanged={refresh} />
      <EducationCard items={profile.education} onChanged={refresh} />
      <PreferencesCard preferences={profile.preferences} onChanged={refresh} />
      <DangerZone onDeleted={() => profileState.setData(null)} />
    </div>
  );
}
