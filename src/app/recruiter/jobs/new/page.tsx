"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JobForm } from "@/components/recruiter/job-form/job-form";

export default function NewJobPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/recruiter/jobs" className="flex w-fit items-center gap-2 text-[15px] font-semibold text-foreground/80 hover:text-primary">
        <ArrowLeft className="size-4.5" aria-hidden />
        Job postings
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Create job</h1>
        <p className="text-[15px] text-muted-foreground">Save a draft any time. Publishing needs the full details.</p>
      </div>
      <JobForm />
    </div>
  );
}
