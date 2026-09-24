"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fromMonthInput, monthLabel, newEntryId, SectionCard, toMonthInput } from "./shared";
import type { Experience } from "@/lib/types";

export function ExperienceSection({
  items,
  editable,
  onChange,
}: {
  items: Experience[];
  editable: boolean;
  onChange: (items: Experience[]) => void;
}) {
  const id = useId();

  if (!editable) {
    return (
      <SectionCard title="Experience">
        {items.length > 0 ? (
          <div className="flex flex-col gap-4">
            {items.map((exp) => (
              <div key={exp.id} className="flex flex-col gap-1 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-[15px] font-bold text-foreground">{exp.role}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {monthLabel(exp.start)} – {exp.end ? monthLabel(exp.end) : "Present"}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{exp.organization}</span>
                {exp.bullets.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground">
                    {exp.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No experience added yet.</p>
        )}
      </SectionCard>
    );
  }

  function updateEntry(index: number, patch: Partial<Experience>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function removeEntry(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function addEntry() {
    onChange([...items, { id: newEntryId("exp"), role: "", organization: "", start: "", bullets: [] }]);
  }

  return (
    <SectionCard title="Experience">
      <div className="flex flex-col gap-4">
        {items.map((exp, i) => (
          <div key={exp.id} className="flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-${exp.id}-role`}>Role</Label>
                  <Input id={`${id}-${exp.id}-role`} value={exp.role} onChange={(e) => updateEntry(i, { role: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-${exp.id}-org`}>Organization</Label>
                  <Input
                    id={`${id}-${exp.id}-org`}
                    value={exp.organization}
                    onChange={(e) => updateEntry(i, { organization: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-${exp.id}-start`}>Start</Label>
                  <Input
                    id={`${id}-${exp.id}-start`}
                    type="month"
                    value={toMonthInput(exp.start)}
                    onChange={(e) => updateEntry(i, { start: fromMonthInput(e.target.value) ?? "" })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-${exp.id}-end`}>End (leave blank if current)</Label>
                  <Input
                    id={`${id}-${exp.id}-end`}
                    type="month"
                    value={toMonthInput(exp.end)}
                    onChange={(e) => updateEntry(i, { end: fromMonthInput(e.target.value) })}
                  />
                </div>
              </div>
              <Button type="button" variant="outline" size="icon-lg" aria-label="Remove experience" onClick={() => removeEntry(i)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-${exp.id}-bullets`}>Highlights (one per line)</Label>
              <Textarea
                id={`${id}-${exp.id}-bullets`}
                rows={3}
                value={exp.bullets.join("\n")}
                onChange={(e) => updateEntry(i, { bullets: e.target.value.split("\n") })}
              />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="lg" className="w-fit" onClick={addEntry}>
          <Plus className="size-4" aria-hidden />
          Add experience
        </Button>
      </div>
    </SectionCard>
  );
}
