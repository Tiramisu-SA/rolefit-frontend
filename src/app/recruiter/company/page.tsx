"use client";

import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/brand/page-states";
import { FieldMessage } from "@/components/seeker/profile/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { companyService, ApiError } from "@/lib/api";
import type { FieldError } from "@/lib/api/errors";
import { scopeErrors } from "@/lib/field-errors";
import { COMPANY_SIZES, type CompanyProfile, type CompanyProfileInput, type RecruiterProfile, type RecruiterProfileInput } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldMessage message={error} />
    </div>
  );
}

function CompanyForm({ company }: { company: CompanyProfile }) {
  const id = useId();
  const [input, setInput] = useState<CompanyProfileInput>({
    description: company.description,
    website: company.website,
    industry: company.industry,
    size: company.size,
    location: company.location,
    logoUrl: company.logoUrl,
  });
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  const fieldErrors = scopeErrors(errors);
  const set = (patch: Partial<CompanyProfileInput>) => setInput((prev) => ({ ...prev, ...patch }));

  async function save() {
    setSaving(true);
    setErrors([]);
    try {
      await companyService.updateMyCompany(input);
      toast.success("Company profile saved");
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors?.length) setErrors(e.fieldErrors);
      else toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const invalid = (name: string) => (fieldErrors[name] ? true : undefined);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Section title="Company" hint="Job seekers see this on your job postings.">
        <Field id={`${id}-name`} label="Company name">
          <Input id={`${id}-name`} value={company.name} readOnly aria-readonly className="bg-muted" />
        </Field>
        <Field id={`${id}-description`} label="Description" error={fieldErrors.description}>
          <Textarea id={`${id}-description`} rows={5} value={input.description} onChange={(e) => set({ description: e.target.value })} aria-invalid={invalid("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-website`} label="Website" error={fieldErrors.website}>
            <Input id={`${id}-website`} type="url" placeholder="https://" value={input.website} onChange={(e) => set({ website: e.target.value })} aria-invalid={invalid("website")} />
          </Field>
          <Field id={`${id}-industry`} label="Industry" error={fieldErrors.industry}>
            <Input id={`${id}-industry`} value={input.industry} onChange={(e) => set({ industry: e.target.value })} aria-invalid={invalid("industry")} />
          </Field>
          <Field id={`${id}-size`} label="Company size" error={fieldErrors.size}>
            <NativeSelect id={`${id}-size`} value={input.size} onChange={(e) => set({ size: e.target.value as CompanyProfileInput["size"] })} aria-invalid={invalid("size")}>
              <option value="">Not set</option>
              {COMPANY_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} employees
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id={`${id}-location`} label="Location" error={fieldErrors.location}>
            <Input id={`${id}-location`} value={input.location} onChange={(e) => set({ location: e.target.value })} aria-invalid={invalid("location")} />
          </Field>
        </div>
        <Field id={`${id}-logo`} label="Logo URL" error={fieldErrors.logoUrl}>
          <Input id={`${id}-logo`} type="url" placeholder="https://" value={input.logoUrl} onChange={(e) => set({ logoUrl: e.target.value })} aria-invalid={invalid("logoUrl")} />
        </Field>
        <div>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Saving…" : "Save company"}
          </Button>
        </div>
      </Section>
    </form>
  );
}

function RecruiterForm({ profile }: { profile: RecruiterProfile }) {
  const id = useId();
  const [input, setInput] = useState<RecruiterProfileInput>({ displayName: profile.displayName, jobTitle: profile.jobTitle });
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [saving, setSaving] = useState(false);
  const fieldErrors = scopeErrors(errors);

  async function save() {
    setSaving(true);
    setErrors([]);
    try {
      await companyService.updateMyRecruiterProfile(input);
      toast.success("Your details were saved");
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors?.length) setErrors(e.fieldErrors);
      else toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Section title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-name`} label="Display name" error={fieldErrors.displayName}>
            <Input id={`${id}-name`} value={input.displayName} onChange={(e) => setInput({ ...input, displayName: e.target.value })} aria-invalid={fieldErrors.displayName ? true : undefined} />
          </Field>
          <Field id={`${id}-title`} label="Job title" error={fieldErrors.jobTitle}>
            <Input id={`${id}-title`} value={input.jobTitle} onChange={(e) => setInput({ ...input, jobTitle: e.target.value })} aria-invalid={fieldErrors.jobTitle ? true : undefined} />
          </Field>
        </div>
        <div>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Saving…" : "Save details"}
          </Button>
        </div>
      </Section>
    </form>
  );
}

export default function CompanyProfilePage() {
  const companyState = useAsync(() => companyService.getMyCompany(), []);
  const recruiterState = useAsync(() => companyService.getMyRecruiterProfile(), []);

  const error = companyState.error ?? recruiterState.error;
  const loading = companyState.loading || recruiterState.loading;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Company profile</h1>
        <p className="text-[15px] text-muted-foreground">Tell job seekers who you are.</p>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </>
      ) : error ? (
        <ErrorState
          message={error.message}
          onRetry={() => {
            companyState.reload();
            recruiterState.reload();
          }}
        />
      ) : companyState.data && recruiterState.data ? (
        <>
          <CompanyForm company={companyState.data} />
          <RecruiterForm profile={recruiterState.data} />
        </>
      ) : null}
    </div>
  );
}
