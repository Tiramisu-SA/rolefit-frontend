"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/brand/logo";
import { RoleSwitch } from "@/components/auth/role-switch";
import { useRole } from "@/lib/auth/role-context";
import type { Role } from "@/lib/types";

const COPY: Record<Role, { title: string; body: string; points: string[]; emailLabel: string; emailPlaceholder: string; signInLabel: string; registerLabel: string }> = {
  seeker: {
    title: "Find jobs that fit, and see why.",
    body: "Pick up where you left off: new recommendations, your tailored resumes, and application updates.",
    points: ["Recommendations from your verified profile", "Match explanations for every job", "Resumes tailored for each role"],
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    signInLabel: "Sign in as Job Seeker",
    registerLabel: "Create a job seeker account",
  },
  recruiter: {
    title: "Hire with clearer evidence.",
    body: "Manage your postings, review applicants with a match snapshot, and keep candidates updated.",
    points: ["Publish, close and reopen job postings", "Attach your company resume template", "Update status and notify candidates"],
    emailLabel: "Work email",
    emailPlaceholder: "you@company.com",
    signInLabel: "Sign in as Recruiter",
    registerLabel: "Register your company",
  },
};

function LoginPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signIn } = useRole();
  const initialRole: Role = searchParams.get("role") === "recruiter" ? "recruiter" : "seeker";
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[role];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = "Enter your email.";
    if (!password.trim()) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setSubmitting(true);
    const error = await signIn(role, email.trim(), password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Signed in");
    router.push(role === "seeker" ? "/seeker/dashboard" : "/recruiter/dashboard");
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
            <h2 className="text-3xl font-extrabold tracking-tight">Welcome back</h2>
            <p className="text-base text-muted-foreground">Choose how you want to sign in.</p>
          </div>

          <RoleSwitch value={role} onChange={setRole} />

          <form className="flex flex-col gap-4.5" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-email">{copy.emailLabel}</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder={copy.emailPlaceholder}
                className="h-12 rounded-[10px] px-3.5 text-base"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "login-email-error" : undefined}
              />
              {errors.email && (
                <p id="login-email-error" className="text-sm font-medium text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                <Link href="#" className="text-sm font-semibold text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-12 rounded-[10px] px-3.5 text-base"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
              />
              {errors.password && (
                <p id="login-password-error" className="text-sm font-medium text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Checkbox />
              Keep me signed in
            </label>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : copy.signInLabel}
              <ArrowRight className="size-4.5" aria-hidden />
            </Button>
          </form>

          <p className="text-center text-[15px] text-muted-foreground">
            New to RoleFit?{" "}
            <Link href={`/register?role=${role}`} className="font-bold text-primary hover:underline">
              {copy.registerLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
