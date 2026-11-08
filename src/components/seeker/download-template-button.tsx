"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jobPosting } from "@/lib/api";

/** Downloads the job's company resume template so the seeker can fill it in. */
export function DownloadTemplateButton({
  jobId,
  children = "Download company template",
  ...props
}: { jobId: string } & Omit<ComponentProps<typeof Button>, "onClick" | "type" | "disabled">) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await jobPosting.downloadResumeTemplate(jobId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download the template");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" disabled={busy} onClick={() => void handleClick()} {...props}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
      {children}
    </Button>
  );
}
