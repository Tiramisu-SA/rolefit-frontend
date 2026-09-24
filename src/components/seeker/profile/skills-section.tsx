"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "./shared";

export function SkillsSection({
  skills,
  editable,
  onChange,
}: {
  skills: string[];
  editable: boolean;
  onChange: (skills: string[]) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  if (!editable) {
    return (
      <SectionCard title="Skills">
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span key={skill} className="rounded-lg bg-muted px-2.5 py-1 text-[13px] font-semibold text-foreground">
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No skills added yet.</p>
        )}
      </SectionCard>
    );
  }

  function addSkill() {
    const value = draft.trim();
    setDraft("");
    if (!value || skills.includes(value)) return;
    onChange([...skills, value]);
  }

  return (
    <SectionCard title="Skills">
      <div className="flex flex-wrap gap-3">
        {skills.map((skill) => (
          <span key={skill} className="flex items-center gap-1.5 rounded-lg bg-muted py-1 pr-1.5 pl-2.5 text-[13px] font-semibold text-foreground">
            {skill}
            <button
              type="button"
              aria-label={`Remove ${skill}`}
              className="relative flex size-5 items-center justify-center rounded hover:bg-background after:absolute after:-inset-3 after:content-['']"
              onClick={() => onChange(skills.filter((s) => s !== skill))}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="sr-only">
          Add a skill
        </Label>
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
          placeholder="Add a skill and press Enter"
          className="sm:max-w-xs"
        />
        <Button type="button" variant="outline" size="lg" onClick={addSkill}>
          Add
        </Button>
      </div>
    </SectionCard>
  );
}
