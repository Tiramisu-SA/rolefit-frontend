"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FieldErrors } from "@/lib/field-errors";
import { EMPLOYMENT_TYPE_LABEL, SKILL_LEVEL_LABEL, WORK_ARRANGEMENT_LABEL } from "@/lib/labels";
import {
  EMPLOYMENT_TYPES,
  SKILL_LEVELS,
  WORK_ARRANGEMENTS,
  type CandidatePreferences,
  type EducationInput,
  type ExperienceInput,
  type ProfileBasics,
  type ProjectInput,
  type SkillLevel,
} from "@/lib/types";
import { FieldMessage, NativeSelect, fromMonthInput, fromMonthInputEnd, orNull, splitCommaList, toMonthInput } from "./shared";

// Controlled form fields for one profile item. Used by the per-section cards
// (saved profile) and by the document editor (reviewing an imported resume).

export const emptyExperience = (): ExperienceInput => ({
  companyName: "", jobTitle: "", startDate: null, endDate: null, isCurrent: false, bullets: [],
});
export const emptyEducation = (): EducationInput => ({ institutionName: "", degree: "", fieldOfStudy: null, gpa: null, year: null });
export const emptyProject = (): ProjectInput => ({ name: "", tech: [], bullets: [] });
export const emptyPreferences = (): CandidatePreferences => ({
  employmentTypes: [], preferredRoles: [], workArrangements: [], preferredLocations: [], minimumSalary: null, salaryCurrency: "THB",
});

interface FieldProps<T> {
  value: T;
  onChange: (value: T) => void;
  errors?: FieldErrors;
}

/** A labelled input with its error message wired up for screen readers. */
function Field({
  id, label, error, children,
}: { id: string; label: string; error?: string; children: (aria: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode }) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })}
      <FieldMessage id={errorId} message={error} />
    </div>
  );
}

/** Text input for a comma-separated list; keeps what the user typed (e.g. a trailing comma) while editing. */
function CommaListInput({ value, onChange, ...aria }: { value: string[]; onChange: (items: string[]) => void; id: string }) {
  const [text, setText] = useState(value.join(", "));
  return (
    <Input
      {...aria}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(splitCommaList(e.target.value));
      }}
    />
  );
}

const lines = (value: string[]) => value.join("\n");
const fromLines = (value: string) => value.split("\n");

export function BasicsFields({ value, onChange, errors = {} }: FieldProps<Omit<ProfileBasics, "summary">>) {
  const id = useId();
  const set = (patch: Partial<ProfileBasics>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-name`} label="Name" error={errors.name}>
          {(aria) => <Input {...aria} value={value.name} onChange={(e) => set({ name: e.target.value })} required />}
        </Field>
        <Field id={`${id}-headline`} label="Headline" error={errors.headline}>
          {(aria) => <Input {...aria} value={value.headline ?? ""} onChange={(e) => set({ headline: orNull(e.target.value) })} />}
        </Field>
        <Field id={`${id}-location`} label="Location" error={errors.location}>
          {(aria) => <Input {...aria} value={value.location ?? ""} onChange={(e) => set({ location: orNull(e.target.value) })} />}
        </Field>
        <Field id={`${id}-email`} label="Email" error={errors.email}>
          {(aria) => <Input {...aria} type="email" value={value.email ?? ""} onChange={(e) => set({ email: orNull(e.target.value) })} />}
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Links</span>
        {value.links.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              aria-label={`Link ${i + 1}`}
              value={link}
              placeholder="https://"
              onChange={(e) => set({ links: value.links.map((l, j) => (j === i ? e.target.value : l)) })}
            />
            <Button type="button" variant="outline" size="icon-lg" aria-label={`Remove link ${i + 1}`} onClick={() => set({ links: value.links.filter((_, j) => j !== i) })}>
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <FieldMessage message={errors.links} />
        <Button type="button" variant="outline" size="lg" className="w-fit" onClick={() => set({ links: [...value.links, ""] })}>
          <Plus className="size-4" aria-hidden />
          Add link
        </Button>
      </div>
    </div>
  );
}

export function ExperienceFields({ value, onChange, errors = {} }: FieldProps<ExperienceInput>) {
  const id = useId();
  const set = (patch: Partial<ExperienceInput>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${id}-title`} label="Job title" error={errors.jobTitle}>
          {(aria) => <Input {...aria} value={value.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} required />}
        </Field>
        <Field id={`${id}-company`} label="Company" error={errors.companyName}>
          {(aria) => <Input {...aria} value={value.companyName} onChange={(e) => set({ companyName: e.target.value })} required />}
        </Field>
        <Field id={`${id}-start`} label="Start" error={errors.startDate}>
          {(aria) => (
            <Input {...aria} type="month" value={toMonthInput(value.startDate)} onChange={(e) => set({ startDate: fromMonthInput(e.target.value) })} />
          )}
        </Field>
        <Field id={`${id}-end`} label="End" error={errors.endDate}>
          {(aria) => (
            <Input
              {...aria}
              type="month"
              disabled={value.isCurrent}
              value={value.isCurrent ? "" : toMonthInput(value.endDate)}
              onChange={(e) => set({ endDate: fromMonthInputEnd(e.target.value) })}
            />
          )}
        </Field>
      </div>
      <div className="flex items-center gap-2.5">
        <Checkbox
          id={`${id}-current`}
          checked={value.isCurrent}
          onCheckedChange={(checked) => set({ isCurrent: checked === true, endDate: checked === true ? null : value.endDate })}
        />
        <Label htmlFor={`${id}-current`} className="cursor-pointer font-normal">
          I currently work here
        </Label>
      </div>
      <Field id={`${id}-bullets`} label="Highlights (one per line)" error={errors.bullets}>
        {(aria) => <Textarea {...aria} rows={3} value={lines(value.bullets)} onChange={(e) => set({ bullets: fromLines(e.target.value) })} />}
      </Field>
    </div>
  );
}

export function EducationFields({ value, onChange, errors = {} }: FieldProps<EducationInput>) {
  const id = useId();
  const set = (patch: Partial<EducationInput>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id={`${id}-school`} label="Institution" error={errors.institutionName}>
        {(aria) => <Input {...aria} value={value.institutionName} onChange={(e) => set({ institutionName: e.target.value })} required />}
      </Field>
      <Field id={`${id}-degree`} label="Degree" error={errors.degree}>
        {(aria) => <Input {...aria} value={value.degree} placeholder="B.Eng." onChange={(e) => set({ degree: e.target.value })} required />}
      </Field>
      <Field id={`${id}-field`} label="Field of study" error={errors.fieldOfStudy}>
        {(aria) => <Input {...aria} value={value.fieldOfStudy ?? ""} onChange={(e) => set({ fieldOfStudy: orNull(e.target.value) })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id={`${id}-gpa`} label="GPA" error={errors.gpa}>
          {(aria) => (
            <Input
              {...aria}
              type="number"
              inputMode="decimal"
              min={0}
              max={4}
              step={0.01}
              value={value.gpa ?? ""}
              onChange={(e) => set({ gpa: e.target.value === "" ? null : Number(e.target.value) })}
            />
          )}
        </Field>
        <Field id={`${id}-year`} label="Year" error={errors.year}>
          {(aria) => (
            <Input {...aria} inputMode="numeric" maxLength={4} placeholder="2026" value={value.year ?? ""} onChange={(e) => set({ year: orNull(e.target.value) })} />
          )}
        </Field>
      </div>
    </div>
  );
}

export function ProjectFields({ value, onChange, errors = {} }: FieldProps<ProjectInput>) {
  const id = useId();
  const set = (patch: Partial<ProjectInput>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${id}-name`} label="Project name" error={errors.name}>
          {(aria) => <Input {...aria} value={value.name} onChange={(e) => set({ name: e.target.value })} required />}
        </Field>
        <Field id={`${id}-tech`} label="Tech (comma-separated)" error={errors.tech}>
          {(aria) => <CommaListInput {...aria} value={value.tech} onChange={(tech) => set({ tech })} />}
        </Field>
      </div>
      <Field id={`${id}-bullets`} label="Highlights (one per line)" error={errors.bullets}>
        {(aria) => <Textarea {...aria} rows={3} value={lines(value.bullets)} onChange={(e) => set({ bullets: fromLines(e.target.value) })} />}
      </Field>
    </div>
  );
}

function CheckboxGroup<T extends string>({
  legend, options, labels, selected, onChange, error,
}: { legend: string; options: readonly T[]; labels: Record<T, string>; selected: T[]; onChange: (next: T[]) => void; error?: string }) {
  const id = useId();
  return (
    <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2.5">
        {options.map((option) => (
          <div key={option} className="flex items-center gap-2">
            <Checkbox
              id={`${id}-${option}`}
              checked={selected.includes(option)}
              onCheckedChange={(checked) => onChange(checked === true ? [...selected, option] : selected.filter((v) => v !== option))}
            />
            <Label htmlFor={`${id}-${option}`} className="cursor-pointer font-normal">
              {labels[option]}
            </Label>
          </div>
        ))}
      </div>
      <FieldMessage message={error} />
    </fieldset>
  );
}

export function PreferencesFields({ value, onChange, errors = {} }: FieldProps<CandidatePreferences>) {
  const id = useId();
  const set = (patch: Partial<CandidatePreferences>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-4">
      <CheckboxGroup
        legend="Employment types"
        options={EMPLOYMENT_TYPES}
        labels={EMPLOYMENT_TYPE_LABEL}
        selected={value.employmentTypes}
        onChange={(employmentTypes) => set({ employmentTypes })}
        error={errors.employmentTypes}
      />
      <CheckboxGroup
        legend="Work arrangements"
        options={WORK_ARRANGEMENTS}
        labels={WORK_ARRANGEMENT_LABEL}
        selected={value.workArrangements}
        onChange={(workArrangements) => set({ workArrangements })}
        error={errors.workArrangements}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-roles`} label="Preferred roles (comma-separated)" error={errors.preferredRoles}>
          {(aria) => <CommaListInput {...aria} value={value.preferredRoles} onChange={(preferredRoles) => set({ preferredRoles })} />}
        </Field>
        <Field id={`${id}-locations`} label="Preferred locations (comma-separated)" error={errors.preferredLocations}>
          {(aria) => <CommaListInput {...aria} value={value.preferredLocations} onChange={(preferredLocations) => set({ preferredLocations })} />}
        </Field>
        <Field id={`${id}-salary`} label="Minimum monthly salary" error={errors.minimumSalary}>
          {(aria) => (
            <Input
              {...aria}
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={value.minimumSalary ?? ""}
              onChange={(e) => set({ minimumSalary: e.target.value === "" ? null : Number(e.target.value) })}
            />
          )}
        </Field>
        <Field id={`${id}-currency`} label="Currency" error={errors.salaryCurrency}>
          {(aria) => (
            <Input
              {...aria}
              maxLength={3}
              placeholder="THB"
              value={value.salaryCurrency ?? ""}
              onChange={(e) => set({ salaryCurrency: orNull(e.target.value.toUpperCase()) })}
            />
          )}
        </Field>
      </div>
    </div>
  );
}

/** Skill level picker; "" means "not specified". */
export function SkillLevelSelect({
  value, onChange, label, className,
}: { value: SkillLevel | null; onChange: (level: SkillLevel | null) => void; label: string; className?: string }) {
  return (
    <NativeSelect aria-label={label} value={value ?? ""} onChange={(e) => onChange((e.target.value || null) as SkillLevel | null)} className={className}>
      <option value="">Level not set</option>
      {SKILL_LEVELS.map((level) => (
        <option key={level} value={level}>
          {SKILL_LEVEL_LABEL[level]}
        </option>
      ))}
    </NativeSelect>
  );
}
