"use client";

import { useId, useState, type ChangeEvent } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/seeker/profile/shared";
import type { ResumeTemplateInfo } from "@/lib/types";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_RE = /\.(pdf|docx)$/i;

/** What happens to the template when the form is saved. */
export type TemplateChange = { kind: "keep" } | { kind: "upload"; file: File } | { kind: "remove" };

/** Shows the job's resume template; changes apply when the form is saved. */
export function TemplateField({
  current,
  change,
  onChange,
}: {
  current: ResumeTemplateInfo | null;
  change: TemplateChange;
  onChange: (change: TemplateChange) => void;
}) {
  const inputId = useId();
  const [error, setError] = useState<string>();

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_RE.test(file.name)) return setError("Choose a PDF or Word (.docx) file.");
    if (file.size > MAX_BYTES) return setError("This file is larger than 2 MB.");
    setError(undefined);
    onChange({ kind: "upload", file });
  }

  const shown =
    change.kind === "upload" ? `${change.file.name} (uploads when you save)` : change.kind === "remove" ? null : (current?.fileName ?? null);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Company resume template (optional)</span>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
        <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[15px]">
          {shown ?? (change.kind === "remove" ? "Removed when you save" : "No template attached")}
        </span>
        <label
          htmlFor={inputId}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold hover:bg-muted focus-within:ring-3 focus-within:ring-ring/50"
        >
          <Upload className="size-4" aria-hidden />
          {current || change.kind === "upload" ? "Replace" : "Upload"}
          <input id={inputId} type="file" accept=".pdf,.docx" className="sr-only" onChange={pick} />
        </label>
        {(change.kind === "upload" || (current && change.kind !== "remove")) && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onChange(change.kind === "upload" && !current ? { kind: "keep" } : { kind: "remove" })}
          >
            <X className="size-4" aria-hidden />
            Remove
          </Button>
        )}
        {change.kind === "remove" && (
          <Button type="button" variant="outline" size="lg" onClick={() => onChange({ kind: "keep" })}>
            Undo
          </Button>
        )}
      </div>
      <FieldMessage message={error} />
      <p className="text-[13px] text-muted-foreground">PDF or DOCX, up to 2 MB. Candidates can use it for their tailored resume.</p>
    </div>
  );
}
