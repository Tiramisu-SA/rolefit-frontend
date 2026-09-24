"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { EmploymentType, ExperienceLevel, JobSearchFilters, WorkArrangement } from "@/lib/types";

const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Internship", "Contract"];
const ARRANGEMENTS: WorkArrangement[] = ["On-site", "Hybrid", "Remote"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ["Internship", "Entry level", "Mid level", "Senior"];

const MIN_SALARY = 0;
const MAX_SALARY = 120_000;
const SALARY_STEP = 5000;

function toggle<T>(list: T[] | undefined, value: T): T[] {
  const current = list ?? [];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

interface FilterGroupProps<T extends string> {
  legend: string;
  options: T[];
  selected: T[] | undefined;
  onToggle: (value: T) => void;
  prefix: string;
  instanceId: string;
}

function slugify(value: string): string {
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}

function FilterGroup<T extends string>({
  legend,
  options,
  selected,
  onToggle,
  prefix,
  instanceId,
}: FilterGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0 m-0">
      <legend className="mb-1 p-0 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">{legend}</legend>
      {options.map((option) => {
        const id = `${instanceId}-${prefix}-${slugify(option)}`;
        const checked = (selected ?? []).includes(option);
        return (
          <div key={option} className="flex items-center gap-2.5">
            <Checkbox id={id} checked={checked} onCheckedChange={() => onToggle(option)} />
            <Label htmlFor={id} className="cursor-pointer text-[15px] font-normal text-foreground">
              {option}
            </Label>
          </div>
        );
      })}
    </fieldset>
  );
}

export function JobFilters({
  value,
  onChange,
  onClear,
}: {
  value: JobSearchFilters;
  onChange: (filters: JobSearchFilters) => void;
  onClear: () => void;
}) {
  const minSalary = value.minSalary ?? MIN_SALARY;
  const instanceId = useId();

  return (
    <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Filters</h2>
        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-sm" onClick={onClear}>
          Clear all
        </Button>
      </div>

      <FilterGroup
        legend="Employment type"
        options={EMPLOYMENT_TYPES}
        selected={value.employmentTypes}
        prefix="employment"
        instanceId={instanceId}
        onToggle={(option) => onChange({ ...value, employmentTypes: toggle(value.employmentTypes, option) })}
      />

      <FilterGroup
        legend="Work arrangement"
        options={ARRANGEMENTS}
        selected={value.arrangements}
        prefix="arrangement"
        instanceId={instanceId}
        onToggle={(option) => onChange({ ...value, arrangements: toggle(value.arrangements, option) })}
      />

      <FilterGroup
        legend="Experience level"
        options={EXPERIENCE_LEVELS}
        selected={value.experienceLevels}
        prefix="experience"
        instanceId={instanceId}
        onToggle={(option) => onChange({ ...value, experienceLevels: toggle(value.experienceLevels, option) })}
      />

      <div className="flex flex-col gap-3">
        <span className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Minimum salary</span>
        <Slider
          aria-label="Minimum salary"
          min={MIN_SALARY}
          max={MAX_SALARY}
          step={SALARY_STEP}
          value={[minSalary]}
          onValueChange={(next) => {
            const nextValue = Array.isArray(next) ? next[0] : next;
            onChange({ ...value, minSalary: nextValue || undefined });
          }}
        />
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <span>฿0</span>
          <span className="font-bold text-foreground">
            {minSalary > 0 ? `฿${minSalary.toLocaleString("en-US")}+ / mo` : "No minimum"}
          </span>
          <span>฿120k</span>
        </div>
      </div>
    </div>
  );
}
