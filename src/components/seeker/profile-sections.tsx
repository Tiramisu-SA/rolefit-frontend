import { BasicsSection } from "./profile/basics-section";
import { SummarySection } from "./profile/summary-section";
import { SkillsSection } from "./profile/skills-section";
import { ExperienceSection } from "./profile/experience-section";
import { ProjectsSection } from "./profile/projects-section";
import { EducationSection } from "./profile/education-section";
import { PreferencesSection } from "./profile/preferences-section";
import type { CandidateProfile } from "@/lib/types";

/**
 * Renders every section of a candidate profile. In read mode (`editable` omitted/false) each
 * section renders as plain text. In edit mode, each section renders labeled inputs bound to
 * `profile` and calls `onChange` with the whole updated profile on every edit — the caller
 * (the profile page) owns the working copy and passes it back down.
 */
export function ProfileSections({
  profile,
  editable = false,
  onChange,
}: {
  profile: CandidateProfile;
  editable?: boolean;
  onChange?: (profile: CandidateProfile) => void;
}) {
  function set<K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) {
    onChange?.({ ...profile, [key]: value });
  }

  return (
    <div className="flex flex-col gap-5">
      <BasicsSection
        profile={profile}
        editable={editable}
        onChange={(patch) => onChange?.({ ...profile, ...patch })}
      />
      <SummarySection summary={profile.summary} editable={editable} onChange={(summary) => set("summary", summary)} />
      <SkillsSection skills={profile.skills} editable={editable} onChange={(skills) => set("skills", skills)} />
      <ExperienceSection items={profile.experience} editable={editable} onChange={(experience) => set("experience", experience)} />
      <ProjectsSection items={profile.projects} editable={editable} onChange={(projects) => set("projects", projects)} />
      <EducationSection items={profile.education} editable={editable} onChange={(education) => set("education", education)} />
      <PreferencesSection preferences={profile.preferences} editable={editable} onChange={(preferences) => set("preferences", preferences)} />
    </div>
  );
}
