"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "./shared";

export function SummarySection({
  summary,
  editable,
  onChange,
}: {
  summary: string;
  editable: boolean;
  onChange: (summary: string) => void;
}) {
  const id = useId();

  if (!editable) {
    return (
      <SectionCard title="Summary">
        <p className="text-[15px] whitespace-pre-line text-foreground">
          {summary || <span className="text-muted-foreground">No summary added yet.</span>}
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Summary">
      <Label htmlFor={id} className="sr-only">
        Summary
      </Label>
      <Textarea id={id} rows={4} value={summary} onChange={(e) => onChange(e.target.value)} placeholder="A short professional summary" />
    </SectionCard>
  );
}
