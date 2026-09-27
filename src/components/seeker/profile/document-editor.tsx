"use client";

import { useId, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FieldError } from "@/lib/api/errors";
import { scopeErrors, type FieldErrors } from "@/lib/field-errors";
import type { ProfileDocument, SkillLevel } from "@/lib/types";
import {
  BasicsFields,
  EducationFields,
  ExperienceFields,
  PreferencesFields,
  ProjectFields,
  SkillLevelSelect,
  emptyEducation,
  emptyExperience,
  emptyPreferences,
  emptyProject,
} from "./fields";
import { FieldMessage, SectionCard, orNull } from "./shared";

// Edits a whole profile document locally (nothing is saved here). Used to
// review what was extracted from an uploaded resume before confirming it.

let nextKey = 0;
const newKeys = (n: number) => Array.from({ length: n }, () => ++nextKey);

/** Stable React keys for a list whose rows can be added and removed. */
function useRowKeys(initialLength: number) {
  const [keys, setKeys] = useState(() => newKeys(initialLength));
  return {
    keys,
    add: () => setKeys((k) => [...k, ...newKeys(1)]),
    remove: (index: number) => setKeys((k) => k.filter((_, i) => i !== index)),
  };
}

function RowList<T>({
  title, noun, items, onChange, empty, fieldErrors, prefix, Fields,
}: {
  title: string;
  noun: string;
  items: T[];
  onChange: (items: T[]) => void;
  empty: () => T;
  fieldErrors?: FieldError[];
  prefix: string;
  Fields: React.ComponentType<{ value: T; onChange: (v: T) => void; errors?: FieldErrors }>;
}) {
  const rows = useRowKeys(items.length);
  return (
    <SectionCard title={title}>
      {items.length === 0 && <p className="text-sm text-muted-foreground">No {noun} found in the resume.</p>}
      {items.map((item, i) => (
        <div key={rows.keys[i]} className="flex flex-col gap-3 rounded-xl border p-4">
          <Fields value={item} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} errors={scopeErrors(fieldErrors, `${prefix}[${i}].`)} />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-fit"
            onClick={() => {
              rows.remove(i);
              onChange(items.filter((_, j) => j !== i));
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-fit"
        onClick={() => {
          rows.add();
          onChange([...items, empty()]);
        }}
      >
        <Plus className="size-4" aria-hidden />
        Add {noun}
      </Button>
    </SectionCard>
  );
}

function SkillsEditor({ doc, onChange, error }: { doc: ProfileDocument; onChange: (doc: ProfileDocument) => void; error?: string }) {
  const id = useId();
  const [name, setName] = useState("");
  const [level, setLevel] = useState<SkillLevel | null>(null);

  function add() {
    const value = name.trim();
    if (!value || doc.skills.some((s) => s.name.toLowerCase() === value.toLowerCase())) return;
    onChange({ ...doc, skills: [...doc.skills, { name: value, proficiencyLevel: level }] });
    setName("");
    setLevel(null);
  }

  return (
    <SectionCard title="Skills">
      <ul className="flex flex-wrap gap-2.5">
        {doc.skills.map((skill, i) => (
          <li key={skill.name} className="flex items-center gap-1.5 rounded-lg bg-muted py-1 pr-1 pl-2.5 text-[13px] font-semibold">
            {skill.name}
            <SkillLevelSelect
              label={`Level for ${skill.name}`}
              value={skill.proficiencyLevel}
              onChange={(proficiencyLevel) => onChange({ ...doc, skills: doc.skills.map((s, j) => (j === i ? { ...s, proficiencyLevel } : s)) })}
              className="h-7 w-auto border-0 bg-transparent px-1 text-[13px] text-muted-foreground"
            />
            <button
              type="button"
              aria-label={`Remove ${skill.name}`}
              className="flex size-6 items-center justify-center rounded hover:bg-background"
              onClick={() => onChange({ ...doc, skills: doc.skills.filter((_, j) => j !== i) })}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id} className="sr-only">Add a skill</Label>
        <Input
          id={id}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a skill and press Enter"
          className="sm:max-w-xs"
        />
        <SkillLevelSelect label="Level for the new skill" value={level} onChange={setLevel} className="w-44" />
        <Button type="button" variant="outline" size="lg" onClick={add}>
          Add
        </Button>
      </div>
      <FieldMessage message={error} />
    </SectionCard>
  );
}

export function ProfileDocumentEditor({
  doc, onChange, fieldErrors,
}: { doc: ProfileDocument; onChange: (doc: ProfileDocument) => void; fieldErrors?: FieldError[] }) {
  const summaryId = useId();
  const prefsId = useId();
  const top = scopeErrors(fieldErrors);

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Basics">
        <BasicsFields value={doc} onChange={(basics) => onChange({ ...doc, ...basics })} errors={top} />
      </SectionCard>

      <SectionCard title="Summary">
        <Label htmlFor={summaryId} className="sr-only">Summary</Label>
        <Textarea id={summaryId} rows={4} value={doc.summary ?? ""} onChange={(e) => onChange({ ...doc, summary: orNull(e.target.value) })} />
        <FieldMessage message={top.summary} />
      </SectionCard>

      <SkillsEditor doc={doc} onChange={onChange} error={top.skills} />

      <RowList title="Experience" noun="experience" prefix="experience" items={doc.experience} onChange={(experience) => onChange({ ...doc, experience })} empty={emptyExperience} fieldErrors={fieldErrors} Fields={ExperienceFields} />
      <RowList title="Education" noun="education" prefix="education" items={doc.education} onChange={(education) => onChange({ ...doc, education })} empty={emptyEducation} fieldErrors={fieldErrors} Fields={EducationFields} />
      <RowList title="Projects" noun="project" prefix="projects" items={doc.projects} onChange={(projects) => onChange({ ...doc, projects })} empty={emptyProject} fieldErrors={fieldErrors} Fields={ProjectFields} />

      <SectionCard title="Job preferences">
        <div className="flex items-center gap-2.5">
          <Checkbox
            id={prefsId}
            checked={doc.preferences !== null}
            onCheckedChange={(checked) => onChange({ ...doc, preferences: checked === true ? (doc.preferences ?? emptyPreferences()) : null })}
          />
          <Label htmlFor={prefsId} className="cursor-pointer font-normal">
            Include job preferences
          </Label>
        </div>
        {doc.preferences && (
          <PreferencesFields
            value={doc.preferences}
            onChange={(preferences) => onChange({ ...doc, preferences })}
            errors={scopeErrors(fieldErrors, "preferences.")}
          />
        )}
      </SectionCard>
    </div>
  );
}
