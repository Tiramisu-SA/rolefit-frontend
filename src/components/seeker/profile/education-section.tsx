"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newEntryId, SectionCard } from "./shared";
import type { Education } from "@/lib/types";

export function EducationSection({
  items,
  editable,
  onChange,
}: {
  items: Education[];
  editable: boolean;
  onChange: (items: Education[]) => void;
}) {
  const id = useId();

  if (!editable) {
    return (
      <SectionCard title="Education">
        {items.length > 0 ? (
          <div className="flex flex-col gap-3">
            {items.map((edu) => (
              <div key={edu.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b pb-3 last:border-0 last:pb-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-foreground">{edu.degree}</span>
                  <span className="text-sm text-muted-foreground">{edu.school}</span>
                </div>
                <span className="text-[13px] text-muted-foreground">{edu.year}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No education added yet.</p>
        )}
      </SectionCard>
    );
  }

  function updateEntry(index: number, patch: Partial<Education>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function removeEntry(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function addEntry() {
    onChange([...items, { id: newEntryId("edu"), degree: "", school: "", year: "" }]);
  }

  return (
    <SectionCard title="Education">
      <div className="flex flex-col gap-4">
        {items.map((edu, i) => (
          <div key={edu.id} className="flex items-start justify-between gap-3 rounded-xl border p-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-${edu.id}-degree`}>Degree</Label>
                <Input id={`${id}-${edu.id}-degree`} value={edu.degree} onChange={(e) => updateEntry(i, { degree: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-${edu.id}-school`}>School</Label>
                <Input id={`${id}-${edu.id}-school`} value={edu.school} onChange={(e) => updateEntry(i, { school: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-${edu.id}-year`}>Year</Label>
                <Input id={`${id}-${edu.id}-year`} value={edu.year} onChange={(e) => updateEntry(i, { year: e.target.value })} />
              </div>
            </div>
            <Button type="button" variant="outline" size="icon-lg" aria-label="Remove education" onClick={() => removeEntry(i)}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="lg" className="w-fit" onClick={addEntry}>
          <Plus className="size-4" aria-hidden />
          Add education
        </Button>
      </div>
    </SectionCard>
  );
}
