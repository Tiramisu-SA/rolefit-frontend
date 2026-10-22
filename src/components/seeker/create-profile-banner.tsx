import Link from "next/link";
import { UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** Shown on seeker pages when the seeker has no profile yet: match scores need one. */
export function CreateProfileBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary-soft p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <UserPlus className="mt-0.5 size-5 shrink-0 text-primary-soft-foreground" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <p className="font-bold text-primary-soft-foreground">Create your profile for accurate matches</p>
          <p className="text-sm text-primary-soft-foreground/80">Match scores compare jobs with your skills, experience and preferences.</p>
        </div>
      </div>
      <Link href="/seeker/profile" className={buttonVariants({ size: "lg" })}>
        Create profile
      </Link>
    </div>
  );
}
