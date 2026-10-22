"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FieldMessage } from "@/components/seeker/profile/shared";
import { SKILL_LEVEL_LABEL } from "@/lib/labels";
import { SKILL_LEVELS, type SkillLevel } from "@/lib/types";
import { useRowKeys } from "@/lib/use-row-keys";

interface SkillRow {
  name: string;
  level: SkillLevel;
  minimumYears?: number;
}

/**
 * Rows of skill name + level (+ minimum years for required skills).
 * `path` is the error path prefix, e.g. "requirements.requiredSkills".
 */
export function SkillsEditor<T extends SkillRow>({
  legend,
  path,
  value,
  onChange,
  empty,
  withYears,
  errors,
}: {
  legend: string;
  path: string;
  value: T[];
  onChange: (value: T[]) => void;
  empty: () => T;
  withYears?: boolean;
  errors: Record<string, string>;
}) {
  const id = useId();
  const rows = useRowKeys(value.length);
  const set = (i: number, patch: Partial<T>) => onChange(value.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-medium">{legend}</legend>
      {value.map((row, i) => {
        const nameError = errors[`${path}[${i}].name`];
        const yearsError = errors[`${path}[${i}].minimumYears`];
        return (
          <div key={rows.keys[i]} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`${legend} ${i + 1} name`}
                placeholder="Skill, e.g. Python"
                value={row.name}
                onChange={(e) => set(i, { name: e.target.value } as Partial<T>)}
                aria-invalid={nameError ? true : undefined}
                className="min-w-40 flex-1"
              />
              <NativeSelect
                aria-label={`${legend} ${i + 1} level`}
                value={row.level}
                onChange={(e) => set(i, { level: e.target.value as SkillLevel } as Partial<T>)}
                className="w-40"
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {SKILL_LEVEL_LABEL[level]}
                  </option>
                ))}
              </NativeSelect>
              {withYears && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor={`${id}-${i}-years`}>
                  <Input
                    id={`${id}-${i}-years`}
                    type="number"
                    min={0}
                    max={50}
                    value={row.minimumYears ?? 0}
                    onChange={(e) => set(i, { minimumYears: e.target.value === "" ? 0 : Number(e.target.value) } as Partial<T>)}
                    aria-invalid={yearsError ? true : undefined}
                    className="w-20"
                  />
                  min. years
                </label>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label={`Remove ${row.name || `${legend.toLowerCase()} ${i + 1}`}`}
                onClick={() => {
                  rows.remove(i);
                  onChange(value.filter((_, j) => j !== i));
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
            <FieldMessage message={nameError ?? yearsError} />
          </div>
        );
      })}
      <FieldMessage message={errors[path]} />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-fit"
        onClick={() => {
          rows.add();
          onChange([...value, empty()]);
        }}
      >
        <Plus className="size-4" aria-hidden />
        Add {legend.toLowerCase().replace(/s$/, "")}
      </Button>
    </fieldset>
  );
}
