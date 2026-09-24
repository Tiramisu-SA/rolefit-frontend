"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard, splitCommaList, FieldRow } from "./shared";
import type { CandidatePreferences, EmploymentType, WorkArrangement } from "@/lib/types";

const ARRANGEMENTS: WorkArrangement[] = ["On-site", "Hybrid", "Remote"];
const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Internship", "Contract"];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function PreferencesSection({
  preferences,
  editable,
  onChange,
}: {
  preferences: CandidatePreferences;
  editable: boolean;
  onChange: (preferences: CandidatePreferences) => void;
}) {
  const id = useId();

  if (!editable) {
    return (
      <SectionCard title="Preferences">
        <div className="flex flex-col gap-3">
          <FieldRow label="Locations" value={preferences.locations.length > 0 ? preferences.locations.join(", ") : undefined} />
          <FieldRow label="Arrangement" value={preferences.arrangements.length > 0 ? preferences.arrangements.join(", ") : undefined} />
          <FieldRow label="Employment type" value={preferences.employmentTypes.length > 0 ? preferences.employmentTypes.join(", ") : undefined} />
          <FieldRow label="Minimum salary" value={preferences.minSalary ? `฿${preferences.minSalary.toLocaleString("en-US")} / mo` : undefined} />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Preferences">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-locations`}>Locations (comma separated)</Label>
        <Input
          id={`${id}-locations`}
          value={preferences.locations.join(", ")}
          onChange={(e) => onChange({ ...preferences, locations: splitCommaList(e.target.value) })}
        />
      </div>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 p-0 text-[13px] font-bold tracking-wide text-muted-foreground uppercase">Work arrangement</legend>
        {ARRANGEMENTS.map((option) => {
          const optId = `${id}-arr-${option}`;
          const checked = preferences.arrangements.includes(option);
          return (
            <div key={option} className="flex items-center gap-2.5">
              <Checkbox
                id={optId}
                checked={checked}
                onCheckedChange={() => onChange({ ...preferences, arrangements: toggle(preferences.arrangements, option) })}
              />
              <Label htmlFor={optId} className="cursor-pointer text-[15px] font-normal text-foreground">
                {option}
              </Label>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 p-0 text-[13px] font-bold tracking-wide text-muted-foreground uppercase">Employment type</legend>
        {EMPLOYMENT_TYPES.map((option) => {
          const optId = `${id}-emp-${option}`;
          const checked = preferences.employmentTypes.includes(option);
          return (
            <div key={option} className="flex items-center gap-2.5">
              <Checkbox
                id={optId}
                checked={checked}
                onCheckedChange={() => onChange({ ...preferences, employmentTypes: toggle(preferences.employmentTypes, option) })}
              />
              <Label htmlFor={optId} className="cursor-pointer text-[15px] font-normal text-foreground">
                {option}
              </Label>
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-1.5 sm:max-w-56">
        <Label htmlFor={`${id}-min-salary`}>Minimum salary (฿ / month)</Label>
        <Input
          id={`${id}-min-salary`}
          type="number"
          min={0}
          step={1000}
          value={preferences.minSalary ?? ""}
          onChange={(e) => onChange({ ...preferences, minSalary: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>
    </SectionCard>
  );
}
