"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { RoleSwitch } from "@/components/auth/role-switch";
import { useRole } from "@/lib/auth/role-context";
import type { Role } from "@/lib/types";

const COPY: Record<Role, { title: string; body: string; points: string[]; emailLabel: string; emailPlaceholder: string; submitLabel: string }> = {
  seeker: {
    title: "Build a profile that speaks for itself.",
    body: "Import your resume once, then let RoleFit recommend jobs and tailor your resume for every application.",
    points: ["Recommendations from your verified profile", "Match explanations for every job", "Resumes tailored for each role"],
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    submitLabel: "Create job seeker account",
  },
  recruiter: {
    title: "Start hiring with clearer evidence.",
    body: "Post roles, attach your company resume template, and review every applicant with a match snapshot.",
    points: ["Publish, close and reopen job postings", "Attach your company resume template", "Update status and notify candidates"],
    emailLabel: "Work email",
    emailPlaceholder: "you@company.com",
    submitLabel: "Register your company",
  },
};

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  company?: string;
}

function RegisterPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signUp } = useRole();
  const initialRole: Role = searchParams.get("role") === "recruiter" ? "recruiter" : "seeker";
  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[role];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (!name.trim()) nextErrors.name = "Enter your full name.";
    if (!email.trim()) nextErrors.email = "Enter your email.";
    if (!password.trim()) nextErrors.password = "Enter a password.";
    if (role === "recruiter" && !company.trim()) nextErrors.company = "Enter your company name.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const error = await signUp({
      role,
      name: name.trim(),
      email: email.trim(),
      password,
      company: role === "recruiter" ? company.trim() : undefined,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Account created");
    router.push(role === "seeker" ? "/seeker/profile" : "/recruiter/dashboard");
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-deep px-18 py-14 text-brand-deep-foreground lg:flex">
        <Logo inverted />
        <div className="flex flex-col gap-7">
          <h1 className="text-[44px] leading-[1.1] font-extrabold tracking-tight">{copy.title}</h1>
          <p className="max-w-md text-lg leading-relaxed text-indigo-200">{copy.body}</p>
          <div className="flex flex-col gap-3.5">
            {copy.points.map((point) => (
              <div key={point} className="flex items-center gap-3 text-base text-indigo-100">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-900 text-indigo-300">
                  <Check className="size-4" strokeWidth={2.5} aria-hidden />
                </span>
                {point}
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-indigo-300">Your match scores are decision support. People make the hiring decisions.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-14">
        <div className="flex w-full max-w-110 flex-col gap-7">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Create your account</h2>
            <p className="text-base text-muted-foreground">Choose how you want to use RoleFit.</p>
          </div>

          <RoleSwitch value={role} onChange={setRole} />

          <form className="flex flex-col gap-4.5" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="register-name">Full name</Label>
              <Input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                className="h-12 rounded-[10px] px-3.5 text-base"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "register-name-error" : undefined}
              />
              {errors.name && (
                <p id="register-name-error" className="text-sm font-medium text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="register-email">{copy.emailLabel}</Label>
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder={copy.emailPlaceholder}
                className="h-12 rounded-[10px] px-3.5 text-base"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "register-email-error" : undefined}
              />
              {errors.email && (
                <p id="register-email-error" className="text-sm font-medium text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            {role === "recruiter" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="register-company">Company name</Label>
                <Input
                  id="register-company"
                  type="text"
                  autoComplete="organization"
                  placeholder="Your company"
                  className="h-12 rounded-[10px] px-3.5 text-base"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  aria-invalid={Boolean(errors.company)}
                  aria-describedby={errors.company ? "register-company-error" : undefined}
                />
                {errors.company && (
                  <p id="register-company-error" className="text-sm font-medium text-destructive">
                    {errors.company}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-12 rounded-[10px] px-3.5 text-base"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "register-password-error" : undefined}
              />
              {errors.password && (
                <p id="register-password-error" className="text-sm font-medium text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Creating account…" : copy.submitLabel}
              <ArrowRight className="size-4.5" aria-hidden />
            </Button>
          </form>

          <p className="text-center text-[15px] text-muted-foreground">
            Already have an account?{" "}
            <Link href={`/login?role=${role}`} className="font-bold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}
