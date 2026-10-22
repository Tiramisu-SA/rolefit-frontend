"use client";

import { useId, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { candidateProfile } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import { scopeErrors, type FieldErrors } from "@/lib/field-errors";
import { EMPLOYMENT_TYPE_LABEL, WORK_ARRANGEMENT_LABEL } from "@/lib/labels";
import type {
  CandidatePreferences,
  CandidateProfile,
  Education,
  EducationInput,
  Experience,
  ExperienceInput,
  Project,
  ProjectInput,
  Skill,
  SkillLevel,
} from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
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
import { EditorActions, FieldMessage, FieldRow, SectionCard, monthLabel, orNull } from "./shared";

// Cards for a saved profile. Each section edits and saves on its own
// (per-row for experience, education and projects), then refreshes the page.

/** Field errors go next to the inputs; anything else becomes a toast. */
function showError(e: unknown, setErrors: (errors: FieldErrors) => void) {
  if (e instanceof ApiError && e.fieldErrors?.length) {
    setErrors(scopeErrors(e.fieldErrors));
    return;
  }
  toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
}

const cleanLines = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="lg" onClick={onClick}>
      <Pencil className="size-4" aria-hidden />
      {label}
    </Button>
  );
}

// --- basics & summary ---------------------------------------------------------

export function BasicsCard({ profile, onSaved }: { profile: CandidateProfile; onSaved: (p: CandidateProfile) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const saved = await candidateProfile.updateBasics({
        name: draft.name,
        headline: draft.headline,
        location: draft.location,
        email: draft.email,
        links: cleanLines(draft.links),
      });
      onSaved(saved);
      setEditing(false);
      toast.success("Basics saved");
    } catch (err) {
      showError(err, setErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Basics"
      action={!editing && <EditButton label="Edit" onClick={() => { setDraft(profile); setErrors({}); setEditing(true); }} />}
    >
      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-4" noValidate>
          <BasicsFields value={draft} onChange={(v) => setDraft({ ...draft, ...v })} errors={errors} />
          <EditorActions saving={saving} onCancel={() => setEditing(false)} />
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <FieldRow label="Name" value={profile.name} />
          <FieldRow label="Headline" value={profile.headline} />
          <FieldRow label="Location" value={profile.location} />
          <FieldRow label="Email" value={profile.email} />
          <FieldRow
            label="Links"
            value={
              profile.links.length > 0 ? (
                <span className="flex flex-col gap-1">
                  {profile.links.map((link) => (
                    <a key={link} href={link} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                      {link}
                    </a>
                  ))}
                </span>
              ) : undefined
            }
          />
        </div>
      )}
    </SectionCard>
  );
}

export function SummaryCard({ profile, onSaved }: { profile: CandidateProfile; onSaved: (p: CandidateProfile) => void }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.summary ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      onSaved(await candidateProfile.updateBasics({ summary: orNull(draft) }));
      setEditing(false);
      toast.success("Summary saved");
    } catch (err) {
      showError(err, setErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Summary"
      action={!editing && <EditButton label="Edit" onClick={() => { setDraft(profile.summary ?? ""); setErrors({}); setEditing(true); }} />}
    >
      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-3">
          <Label htmlFor={id} className="sr-only">Summary</Label>
          <Textarea id={id} rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} aria-invalid={errors.summary ? true : undefined} />
          <FieldMessage message={errors.summary} />
          <EditorActions saving={saving} onCancel={() => setEditing(false)} />
        </form>
      ) : profile.summary ? (
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">{profile.summary}</p>
      ) : (
        <p className="text-sm text-muted-foreground">No summary yet.</p>
      )}
    </SectionCard>
  );
}

// --- skills ------------------------------------------------------------------------

export function SkillsCard({ skills, onChanged }: { skills: Skill[]; onChanged: () => Promise<void> }) {
  const id = useId();
  const [name, setName] = useState("");
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    try {
      await action();
      await onChanged();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(undefined);
    setBusy("add");
    try {
      await candidateProfile.addSkill({ name: name.trim(), proficiencyLevel: level });
      await onChanged();
      setName("");
      setLevel(null);
    } catch (err) {
      // Duplicate names and validation problems are shown next to the input.
      if (err instanceof ApiError && (err.code === "DUPLICATE_SKILL" || err.fieldErrors?.length)) {
        setError(err.fieldErrors?.[0]?.message ?? err.message);
      } else {
        toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <SectionCard title="Skills">
      {skills.length > 0 ? (
        <ul className="flex flex-wrap gap-2.5">
          {skills.map((skill) => (
            <li key={skill.id} className="flex items-center gap-1.5 rounded-lg bg-muted py-1 pr-1 pl-2.5 text-[13px] font-semibold text-foreground">
              {skill.name}
              <SkillLevelSelect
                label={`Level for ${skill.name}`}
                value={skill.proficiencyLevel}
                onChange={(proficiencyLevel) => void run(skill.id, () => candidateProfile.updateSkill(skill.id, { name: skill.name, proficiencyLevel }))}
                className="h-7 w-auto border-0 bg-transparent px-1 text-[13px] text-muted-foreground"
              />
              <button
                type="button"
                aria-label={`Remove ${skill.name}`}
                disabled={busy === skill.id}
                className="relative flex size-6 items-center justify-center rounded hover:bg-background disabled:opacity-50"
                onClick={() => void run(skill.id, () => candidateProfile.deleteSkill(skill.id))}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No skills added yet.</p>
      )}

      <form onSubmit={add} className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={id} className="sr-only">Add a skill</Label>
          <Input
            id={id}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a skill, e.g. TypeScript"
            className="sm:max-w-xs"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <SkillLevelSelect label="Level for the new skill" value={level} onChange={setLevel} className="w-44" />
          <Button type="submit" variant="outline" size="lg" disabled={busy === "add" || !name.trim()}>
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>
        <FieldMessage id={`${id}-error`} message={error} />
      </form>
    </SectionCard>
  );
}

// --- one-to-many sections (experience, education, projects) ----------------------------

interface ListCardProps<T extends { id: string }, I> {
  title: string;
  noun: string;
  items: T[];
  toInput: (item: T) => I;
  emptyInput: () => I;
  itemName: (item: T) => string;
  renderView: (item: T) => ReactNode;
  Fields: ComponentType<{ value: I; onChange: (value: I) => void; errors?: FieldErrors }>;
  add: (input: I) => Promise<unknown>;
  update: (id: string, input: I) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
  clean: (input: I) => I;
  onChanged: () => Promise<void>;
}

/** A list section where each row has its own Edit / Delete, plus an Add form. One editor is open at a time. */
function ListCard<T extends { id: string }, I>(props: ListCardProps<T, I>) {
  const { title, noun, items, Fields } = props;
  const [editing, setEditing] = useState<string | null>(null); // row id, "new" or null
  const [draft, setDraft] = useState<I>(props.emptyInput());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  function open(target: string, input: I) {
    setEditing(target);
    setDraft(input);
    setErrors({});
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const input = props.clean(draft);
      if (editing === "new") await props.add(input);
      else await props.update(editing!, input);
      await props.onChanged();
      toast.success(editing === "new" ? `${noun[0].toUpperCase()}${noun.slice(1)} added` : "Changes saved");
      setEditing(null);
    } catch (err) {
      showError(err, setErrors);
    } finally {
      setSaving(false);
    }
  }

  const editor = (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-xl border p-4" noValidate>
      <Fields value={draft} onChange={setDraft} errors={errors} />
      <EditorActions saving={saving} onCancel={() => setEditing(null)} saveLabel={editing === "new" ? `Add ${noun}` : "Save"} />
    </form>
  );

  return (
    <SectionCard title={title}>
      {items.length === 0 && editing !== "new" && <p className="text-sm text-muted-foreground">No {noun} added yet.</p>}
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
            {editing === item.id ? (
              editor
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">{props.renderView(item)}</div>
                <div className="flex shrink-0 gap-1.5">
                  <Button type="button" variant="outline" size="icon-lg" aria-label={`Edit ${props.itemName(item)}`} onClick={() => open(item.id, props.toInput(item))} disabled={editing !== null}>
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button type="button" variant="outline" size="icon-lg" aria-label={`Delete ${props.itemName(item)}`} onClick={() => setDeleteTarget(item)} disabled={editing !== null}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? (
        editor
      ) : (
        <Button type="button" variant="outline" size="lg" className="w-fit" onClick={() => open("new", props.emptyInput())} disabled={editing !== null}>
          <Plus className="size-4" aria-hidden />
          Add {noun}
        </Button>
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete ${deleteTarget ? props.itemName(deleteTarget) : noun}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          await props.remove(deleteTarget!.id);
          await props.onChanged();
          toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} deleted`);
        }}
      />
    </SectionCard>
  );
}

function withoutId<T extends { id: string }>(item: T): Omit<T, "id"> {
  const copy: Partial<T> = { ...item };
  delete copy.id;
  return copy as Omit<T, "id">;
}

export function ExperienceCard({ items, onChanged }: { items: Experience[]; onChanged: () => Promise<void> }) {
  return (
    <ListCard<Experience, ExperienceInput>
      title="Experience"
      noun="experience"
      items={items}
      toInput={withoutId}
      emptyInput={emptyExperience}
      itemName={(e) => `${e.jobTitle} at ${e.companyName}`}
      Fields={ExperienceFields}
      clean={(e) => ({ ...e, bullets: cleanLines(e.bullets), endDate: e.isCurrent ? null : e.endDate })}
      add={candidateProfile.addExperience}
      update={candidateProfile.updateExperience}
      remove={candidateProfile.deleteExperience}
      onChanged={onChanged}
      renderView={(exp) => (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-[15px] font-bold text-foreground">{exp.jobTitle}</span>
            <span className="text-[13px] text-muted-foreground">
              {[monthLabel(exp.startDate), exp.isCurrent || !exp.endDate ? "Present" : monthLabel(exp.endDate)].filter(Boolean).join(" – ")}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">{exp.companyName}</span>
          {exp.bullets.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground">
              {exp.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    />
  );
}

export function EducationCard({ items, onChanged }: { items: Education[]; onChanged: () => Promise<void> }) {
  return (
    <ListCard<Education, EducationInput>
      title="Education"
      noun="education"
      items={items}
      toInput={withoutId}
      emptyInput={emptyEducation}
      itemName={(e) => `${e.degree}, ${e.institutionName}`}
      Fields={EducationFields}
      clean={(e) => e}
      add={candidateProfile.addEducation}
      update={candidateProfile.updateEducation}
      remove={candidateProfile.deleteEducation}
      onChanged={onChanged}
      renderView={(ed) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold text-foreground">
            {ed.fieldOfStudy ? `${ed.degree} in ${ed.fieldOfStudy}` : ed.degree}
          </span>
          <span className="text-sm text-muted-foreground">
            {[ed.institutionName, ed.year, ed.gpa !== null ? `GPA ${ed.gpa.toFixed(2)}` : null].filter(Boolean).join(" · ")}
          </span>
        </div>
      )}
    />
  );
}

export function ProjectsCard({ items, onChanged }: { items: Project[]; onChanged: () => Promise<void> }) {
  return (
    <ListCard<Project, ProjectInput>
      title="Projects"
      noun="project"
      items={items}
      toInput={withoutId}
      emptyInput={emptyProject}
      itemName={(p) => p.name}
      Fields={ProjectFields}
      clean={(p) => ({ ...p, bullets: cleanLines(p.bullets) })}
      add={candidateProfile.addProject}
      update={candidateProfile.updateProject}
      remove={candidateProfile.deleteProject}
      onChanged={onChanged}
      renderView={(pr) => (
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-bold text-foreground">{pr.name}</span>
          {pr.tech.length > 0 && <span className="text-sm text-muted-foreground">{pr.tech.join(", ")}</span>}
          {pr.bullets.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground">
              {pr.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    />
  );
}

// --- preferences ----------------------------------------------------------------------

export function PreferencesCard({ preferences, onChanged }: { preferences: CandidatePreferences | null; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CandidatePreferences>(preferences ?? emptyPreferences());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await candidateProfile.savePreferences(draft);
      await onChanged();
      setEditing(false);
      toast.success("Preferences saved");
    } catch (err) {
      showError(err, setErrors);
    } finally {
      setSaving(false);
    }
  }

  const salary =
    preferences?.minimumSalary != null ? `${preferences.salaryCurrency ?? "THB"} ${preferences.minimumSalary.toLocaleString("en-US")} / mo` : undefined;
  const list = (items: string[]) => (items.length ? items.join(", ") : undefined);

  return (
    <SectionCard
      title="Job preferences"
      action={
        !editing && (
          <div className="flex gap-2">
            {preferences && (
              <Button type="button" variant="outline" size="lg" onClick={() => setConfirmClear(true)}>
                Clear
              </Button>
            )}
            <EditButton label={preferences ? "Edit" : "Add preferences"} onClick={() => { setDraft(preferences ?? emptyPreferences()); setErrors({}); setEditing(true); }} />
          </div>
        )
      }
    >
      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-4" noValidate>
          <PreferencesFields value={draft} onChange={setDraft} errors={errors} />
          <EditorActions saving={saving} onCancel={() => setEditing(false)} />
        </form>
      ) : preferences ? (
        <div className="flex flex-col gap-3">
          <FieldRow label="Employment" value={list(preferences.employmentTypes.map((t) => EMPLOYMENT_TYPE_LABEL[t]))} />
          <FieldRow label="Arrangement" value={list(preferences.workArrangements.map((a) => WORK_ARRANGEMENT_LABEL[a]))} />
          <FieldRow label="Roles" value={list(preferences.preferredRoles)} />
          <FieldRow label="Locations" value={list(preferences.preferredLocations)} />
          <FieldRow label="Minimum salary" value={salary} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No job preferences yet. Adding them improves your match scores.</p>
      )}
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear your job preferences?"
        description="Match scores will no longer consider your preferred arrangement, location or employment type."
        confirmLabel="Clear preferences"
        onConfirm={async () => {
          await candidateProfile.deletePreferences();
          await onChanged();
          toast.success("Preferences cleared");
        }}
      />
    </SectionCard>
  );
}

// --- danger zone -------------------------------------------------------------------------

export function DangerZone({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[17px] font-bold">Delete profile</h2>
        <p className="text-sm text-muted-foreground">Removes your profile and every section in it. This can&apos;t be undone.</p>
      </div>
      <Button type="button" variant="destructive" size="lg" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" aria-hidden />
        Delete profile
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete your profile?"
        description="Your skills, experience, education, projects and preferences will be deleted. Job matches will stop using them."
        confirmLabel="Delete profile"
        onConfirm={async () => {
          await candidateProfile.deleteProfile();
          toast.success("Profile deleted");
          onDeleted();
        }}
      />
    </section>
  );
}
