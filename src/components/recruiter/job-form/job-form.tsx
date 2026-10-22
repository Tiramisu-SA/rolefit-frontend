"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/seeker/profile/confirm-dialog";
import { FieldMessage } from "@/components/seeker/profile/shared";
import { jobPosting } from "@/lib/api";
import { ApiError, type FieldError } from "@/lib/api/errors";
import { EDUCATION_LEVEL_LABEL, EMPLOYMENT_TYPE_LABEL, WORK_ARRANGEMENT_LABEL } from "@/lib/labels";
import {
  EDUCATION_LEVELS,
  EMPLOYMENT_TYPES,
  WORK_ARRANGEMENTS,
  type EducationLevel,
  type EmploymentType,
  type JobPosting,
  type JobPostingInput,
  type ResumeTemplateInfo,
  type WorkArrangement,
} from "@/lib/types";
import { ListEditor } from "./list-editor";
import { SkillsEditor } from "./skills-editor";
import { TemplateField, type TemplateChange } from "./template-field";
import { emptyJobInput, errorMap, fromDateTimeInput, jobToInput, toDateTimeInput, validateJobForm } from "./validation";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
      <h2 className="text-[17px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldMessage message={error} />
    </div>
  );
}

const optionalNumber = (value: string) => (value === "" ? undefined : Number(value));
const trimList = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);

/** Trims text and drops empty rows before validating and sending. */
function clean(input: JobPostingInput): JobPostingInput {
  return {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    responsibilities: trimList(input.responsibilities),
    requirements: {
      ...input.requirements,
      requiredSkills: input.requirements.requiredSkills.filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim() })),
      preferredSkills: input.requirements.preferredSkills.filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim() })),
      acceptedFields: trimList(input.requirements.acceptedFields),
    },
    location: {
      country: input.location.country?.trim() || undefined,
      province: input.location.province?.trim() || undefined,
      district: input.location.district?.trim() || undefined,
    },
    salary: { ...input.salary, currency: input.salary.currency.trim().toUpperCase() },
  };
}

/**
 * Create or edit a job. New jobs and drafts can be saved as a draft or saved
 * and published; open and closed jobs just save. Template changes apply on save.
 */
export function JobForm({ job, template = null }: { job?: JobPosting; template?: ResumeTemplateInfo | null }) {
  const id = useId();
  const router = useRouter();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState<JobPostingInput>(() => (job ? jobToInput(job) : emptyJobInput()));
  const [templateChange, setTemplateChange] = useState<TemplateChange>({ kind: "keep" });
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Once a new job is created, later saves update it (e.g. when publishing failed).
  const [jobId, setJobId] = useState(job?.id);

  const status = job?.status ?? "DRAFT";
  const canPublish = status === "DRAFT";
  const errors = errorMap(fieldErrors);
  const set = (patch: Partial<JobPostingInput>) => setInput((prev) => ({ ...prev, ...patch }));
  const setReq = (patch: Partial<JobPostingInput["requirements"]>) => set({ requirements: { ...input.requirements, ...patch } });

  function showErrors(list: FieldError[]) {
    setFieldErrors(list);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  async function save(publish: boolean) {
    const data = clean(input);
    const problems = validateJobForm(data, { forPublish: publish, now: new Date() });
    if (problems.length > 0) return showErrors(problems);
    setFieldErrors([]);
    setSaving(publish ? "publish" : "draft");
    try {
      let saved = jobId ? await jobPosting.updateJob(jobId, data) : await jobPosting.createJob(data);
      setJobId(saved.id);
      if (templateChange.kind === "upload") await jobPosting.attachResumeTemplate(saved.id, templateChange.file);
      if (templateChange.kind === "remove" && template) await jobPosting.deleteResumeTemplate(saved.id);
      setTemplateChange({ kind: "keep" });
      if (publish) saved = await jobPosting.publishJob(saved.id);
      toast.success(publish ? "Job published" : job ? "Changes saved" : "Draft saved");
      router.push("/recruiter/jobs");
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors?.length) showErrors(e.fieldErrors);
      else toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  const salary = input.salary;

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      {status === "CLOSED" && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border bg-muted px-5 py-4 text-[15px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          This job is closed. You can still edit it; reopen it from Job postings to accept applications again.
        </div>
      )}

      {fieldErrors.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="flex flex-col gap-1.5 rounded-2xl border border-destructive/40 bg-destructive-soft px-5 py-4 text-destructive outline-none">
          <p className="font-bold">Fix {fieldErrors.length === 1 ? "this field" : `these ${fieldErrors.length} fields`} before saving:</p>
          <ul className="list-disc pl-5 text-sm">
            {fieldErrors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Basics">
        <Field id={`${id}-title`} label="Job title" error={errors.title}>
          <Input id={`${id}-title`} value={input.title} onChange={(e) => set({ title: e.target.value })} aria-invalid={errors.title ? true : undefined} />
        </Field>
        <Field id={`${id}-description`} label="Description" error={errors.description}>
          <Textarea
            id={`${id}-description`}
            rows={6}
            value={input.description}
            onChange={(e) => set({ description: e.target.value })}
            aria-invalid={errors.description ? true : undefined}
          />
        </Field>
        <ListEditor
          legend="Responsibilities"
          itemLabel="Responsibility"
          value={input.responsibilities}
          onChange={(responsibilities) => set({ responsibilities })}
          placeholder="e.g. Design and maintain database schemas"
          error={errors.responsibilities}
        />
      </Section>

      <Section title="Requirements">
        <SkillsEditor
          legend="Required skills"
          path="requirements.requiredSkills"
          withYears
          value={input.requirements.requiredSkills}
          onChange={(requiredSkills) => setReq({ requiredSkills })}
          empty={() => ({ name: "", level: "BASIC", minimumYears: 0 })}
          errors={errors}
        />
        <SkillsEditor
          legend="Preferred skills"
          path="requirements.preferredSkills"
          value={input.requirements.preferredSkills}
          onChange={(preferredSkills) => setReq({ preferredSkills })}
          empty={() => ({ name: "", level: "BASIC" })}
          errors={errors}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-years`} label="Minimum years of experience" error={errors["requirements.minimumExperienceYears"]}>
            <Input
              id={`${id}-years`}
              type="number"
              min={0}
              max={50}
              value={input.requirements.minimumExperienceYears}
              onChange={(e) => setReq({ minimumExperienceYears: e.target.value === "" ? 0 : Number(e.target.value) })}
            />
          </Field>
          <Field id={`${id}-education`} label="Education level" error={errors["requirements.educationLevel"]}>
            <NativeSelect
              id={`${id}-education`}
              value={input.requirements.educationLevel}
              onChange={(e) => setReq({ educationLevel: e.target.value as EducationLevel })}
            >
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {EDUCATION_LEVEL_LABEL[level]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <ListEditor
          legend="Accepted fields of study"
          itemLabel="Field"
          value={input.requirements.acceptedFields}
          onChange={(acceptedFields) => setReq({ acceptedFields })}
          placeholder="e.g. Computer Science"
          error={errors["requirements.acceptedFields"]}
        />
      </Section>

      <Section title="Employment and location">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-employment`} label="Employment type" error={errors.employmentType}>
            <NativeSelect
              id={`${id}-employment`}
              value={input.employmentType ?? ""}
              onChange={(e) => set({ employmentType: (e.target.value || undefined) as EmploymentType | undefined })}
              aria-invalid={errors.employmentType ? true : undefined}
            >
              <option value="">Choose…</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMPLOYMENT_TYPE_LABEL[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id={`${id}-arrangement`} label="Work arrangement" error={errors.workArrangement}>
            <NativeSelect
              id={`${id}-arrangement`}
              value={input.workArrangement ?? ""}
              onChange={(e) => set({ workArrangement: (e.target.value || undefined) as WorkArrangement | undefined })}
              aria-invalid={errors.workArrangement ? true : undefined}
            >
              <option value="">Choose…</option>
              {WORK_ARRANGEMENTS.map((a) => (
                <option key={a} value={a}>
                  {WORK_ARRANGEMENT_LABEL[a]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["country", "province", "district"] as const).map((part) => (
            <Field key={part} id={`${id}-${part}`} label={part[0].toUpperCase() + part.slice(1) + (part === "district" ? " (optional)" : "")} error={errors[`location.${part}`]}>
              <Input
                id={`${id}-${part}`}
                value={input.location[part] ?? ""}
                onChange={(e) => set({ location: { ...input.location, [part]: e.target.value } })}
                aria-invalid={errors[`location.${part}`] ? true : undefined}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Salary">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id={`${id}-min`} label="Minimum per month" error={errors["salary.minimum"]}>
            <Input id={`${id}-min`} type="number" min={0} step={1000} value={salary.minimum ?? ""} onChange={(e) => set({ salary: { ...salary, minimum: optionalNumber(e.target.value) } })} />
          </Field>
          <Field id={`${id}-max`} label="Maximum per month" error={errors["salary.maximum"]}>
            <Input
              id={`${id}-max`}
              type="number"
              min={0}
              step={1000}
              value={salary.maximum ?? ""}
              onChange={(e) => set({ salary: { ...salary, maximum: optionalNumber(e.target.value) } })}
              aria-invalid={errors["salary.maximum"] ? true : undefined}
            />
          </Field>
          <Field id={`${id}-currency`} label="Currency" error={errors["salary.currency"]}>
            <Input id={`${id}-currency`} maxLength={3} value={salary.currency} onChange={(e) => set({ salary: { ...salary, currency: e.target.value.toUpperCase() } })} />
          </Field>
        </div>
        <div className="flex items-center gap-2.5">
          <Checkbox id={`${id}-visible`} checked={salary.visible} onCheckedChange={(checked) => set({ salary: { ...salary, visible: checked === true } })} />
          <Label htmlFor={`${id}-visible`} className="cursor-pointer font-normal">
            Show salary to candidates
          </Label>
        </div>
      </Section>

      <Section title="Application settings">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-deadline`} label="Application deadline (optional)" error={errors.applicationDeadline}>
            <Input
              id={`${id}-deadline`}
              type="datetime-local"
              value={toDateTimeInput(input.applicationDeadline)}
              onChange={(e) => set({ applicationDeadline: fromDateTimeInput(e.target.value) })}
              aria-invalid={errors.applicationDeadline ? true : undefined}
            />
          </Field>
          <Field id={`${id}-positions`} label="Positions available" error={errors.positionsAvailable}>
            <Input
              id={`${id}-positions`}
              type="number"
              min={1}
              max={1000}
              value={input.positionsAvailable}
              onChange={(e) => set({ positionsAvailable: e.target.value === "" ? 0 : Number(e.target.value) })}
              aria-invalid={errors.positionsAvailable ? true : undefined}
            />
          </Field>
        </div>
        <div className="flex items-center gap-2.5">
          <Checkbox id={`${id}-cover`} checked={input.requireCoverLetter} onCheckedChange={(checked) => set({ requireCoverLetter: checked === true })} />
          <Label htmlFor={`${id}-cover`} className="cursor-pointer font-normal">
            Require a cover letter
          </Label>
        </div>
        <TemplateField current={template} change={templateChange} onChange={setTemplateChange} />
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        {canPublish && (
          <Button type="button" size="lg" disabled={saving !== null} onClick={() => void save(true)}>
            {saving === "publish" ? "Publishing…" : "Save & publish"}
          </Button>
        )}
        <Button type="submit" size="lg" variant={canPublish ? "outline" : "default"} disabled={saving !== null}>
          {saving === "draft" ? "Saving…" : canPublish ? "Save draft" : "Save changes"}
        </Button>
        <Button type="button" size="lg" variant="ghost" disabled={saving !== null} onClick={() => router.push("/recruiter/jobs")}>
          Cancel
        </Button>
        {job && status === "DRAFT" && (
          <Button type="button" size="lg" variant="destructive" className="ml-auto" disabled={saving !== null} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" aria-hidden />
            Delete draft
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this draft?"
        description="The draft and its resume template will be deleted. This can't be undone."
        confirmLabel="Delete draft"
        onConfirm={async () => {
          await jobPosting.deleteJob(job!.id);
          toast.success("Draft deleted");
          router.push("/recruiter/jobs");
        }}
      />
    </form>
  );
}
