"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newEntryId, SectionCard, splitCommaList } from "./shared";
import type { Project } from "@/lib/types";

export function ProjectsSection({
  items,
  editable,
  onChange,
}: {
  items: Project[];
  editable: boolean;
  onChange: (items: Project[]) => void;
}) {
  const id = useId();

  if (!editable) {
    return (
      <SectionCard title="Projects">
        {items.length > 0 ? (
          <div className="flex flex-col gap-4">
            {items.map((project) => (
              <div key={project.id} className="flex flex-col gap-1 border-b pb-4 last:border-0 last:pb-0">
                <span className="text-[15px] font-bold text-foreground">{project.name}</span>
                {project.tech.length > 0 && <span className="text-[13px] text-muted-foreground">{project.tech.join(", ")}</span>}
                {project.bullets.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground">
                    {project.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No projects added yet.</p>
        )}
      </SectionCard>
    );
  }

  function updateEntry(index: number, patch: Partial<Project>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function removeEntry(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function addEntry() {
    onChange([...items, { id: newEntryId("proj"), name: "", tech: [], bullets: [] }]);
  }

  return (
    <SectionCard title="Projects">
      <div className="flex flex-col gap-4">
        {items.map((project, i) => (
          <div key={project.id} className="flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-${project.id}-name`}>Name</Label>
                  <Input id={`${id}-${project.id}-name`} value={project.name} onChange={(e) => updateEntry(i, { name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-${project.id}-tech`}>Technologies (comma separated)</Label>
                  <Input
                    id={`${id}-${project.id}-tech`}
                    value={project.tech.join(", ")}
                    onChange={(e) => updateEntry(i, { tech: splitCommaList(e.target.value) })}
                  />
                </div>
              </div>
              <Button type="button" variant="outline" size="icon-lg" aria-label="Remove project" onClick={() => removeEntry(i)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-${project.id}-bullets`}>Highlights (one per line)</Label>
              <Textarea
                id={`${id}-${project.id}-bullets`}
                rows={3}
                value={project.bullets.join("\n")}
                onChange={(e) => updateEntry(i, { bullets: e.target.value.split("\n") })}
              />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="lg" className="w-fit" onClick={addEntry}>
          <Plus className="size-4" aria-hidden />
          Add project
        </Button>
      </div>
    </SectionCard>
  );
}
