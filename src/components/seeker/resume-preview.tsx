"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CandidateProfile, ResumeBullet, ResumeDraft, ResumeSection } from "@/lib/types";

interface EditingState {
  sectionId: string;
  bulletId: string;
  text: string;
  original: string;
}

// Kinds whose bullets are grouped facts (summary / skills line / education entries) rather than
// an achievement list for a single role or project — rendered as stacked lines, no list marker.
const LABEL_KINDS = new Set<ResumeSection["kind"]>(["summary", "skills", "education"]);

function ContactLine({ profile, light }: { profile: CandidateProfile; light?: boolean }) {
  const items = [profile.email, ...profile.links];
  return (
    <span className={cn("text-right text-[13px] leading-relaxed", light ? "text-white/85" : "text-slate-500")}>
      {items.join(" · ")}
    </span>
  );
}

export function ResumePreview({
  draft,
  profile,
  companyName,
  companyColor,
  onEditBullet,
}: {
  draft: ResumeDraft;
  profile: CandidateProfile;
  companyName?: string;
  companyColor?: string;
  onEditBullet: (sectionId: string, bulletId: string, text: string) => void;
}) {
  const isCompany = draft.format === "company";
  const [editing, setEditing] = useState<EditingState | null>(null);

  function startEdit(sectionId: string, bullet: ResumeBullet) {
    setEditing({ sectionId, bulletId: bullet.id, text: bullet.text, original: bullet.text });
  }

  // Functional update reads the latest queued state, not a stale closure, so if Escape has
  // already nulled `editing` by the time a (possibly later) blur fires, this is a no-op —
  // no extra guard ref is needed.
  function commitEdit() {
    setEditing((current) => {
      if (!current) return null;
      const trimmed = current.text.trim();
      if (trimmed && trimmed !== current.original) {
        onEditBullet(current.sectionId, current.bulletId, trimmed);
      }
      return null;
    });
  }

  function cancelEdit() {
    setEditing(null);
  }

  const accentStyle = isCompany && companyColor ? { color: companyColor } : undefined;
  const accentClassName = isCompany ? undefined : "text-indigo-600";

  function renderBullet(section: ResumeSection, bullet: ResumeBullet) {
    const isEditing = editing?.sectionId === section.id && editing.bulletId === bullet.id;

    if (isEditing) {
      return (
        <Textarea
          key={bullet.id}
          autoFocus
          aria-label="Edit line"
          value={editing.text}
          onChange={(e) => setEditing((current) => (current ? { ...current, text: e.target.value } : current))}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitEdit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            }
          }}
          className="min-h-0 w-full resize-none rounded border-indigo-200 bg-indigo-50 px-1.5 py-1 text-[14px] leading-[1.55] text-slate-900 focus-visible:ring-indigo-300"
        />
      );
    }

    return (
      <button
        key={bullet.id}
        type="button"
        aria-label={`Edit line: ${bullet.text}`}
        onClick={() => startEdit(section.id, bullet)}
        className={cn(
          "w-full rounded px-1.5 py-0.5 text-left text-[14px] leading-[1.55] text-slate-900 hover:bg-slate-100",
          bullet.tailored && "bg-indigo-50 hover:bg-indigo-100"
        )}
      >
        {bullet.text}
      </button>
    );
  }

  const includedSections = draft.sections.filter((s) => s.included);

  return (
    // The resume paper is always rendered on a white background regardless of the app's
    // light/dark theme, so it intentionally uses fixed slate/indigo/white colors here instead
    // of theme tokens (e.g. `text-primary`'s dark-mode value fails contrast on white paper).
    <article aria-label="Resume preview" className="flex flex-col gap-6 rounded-md bg-white px-5 py-6 text-slate-900 shadow-lg sm:px-10 sm:py-10 lg:px-14 lg:py-12">
      {isCompany ? (
        <div
          aria-label={companyName ? `${companyName} company template header` : undefined}
          className="-mx-5 -mt-6 flex flex-wrap items-end justify-between gap-3 px-5 py-6 sm:-mx-10 sm:-mt-10 sm:px-10 lg:-mx-14 lg:-mt-12 lg:px-14"
          style={{ backgroundColor: companyColor ?? "#0F766E" }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-[28px] font-extrabold text-white">{profile.name}</span>
            <span className="text-[15px] text-white/85">
              {profile.headline} · {profile.location}
            </span>
          </div>
          <ContactLine profile={profile} light />
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-slate-900 pb-4.5">
          <div className="flex flex-col gap-1">
            <span className="text-[30px] font-extrabold tracking-tight text-slate-900">{profile.name}</span>
            <span className="text-[15px] text-slate-600">
              {profile.headline} · {profile.location}
            </span>
          </div>
          <ContactLine profile={profile} />
        </div>
      )}

      {includedSections.map((section) => {
        const grouped = LABEL_KINDS.has(section.kind);
        return (
          <div key={section.id} className="flex flex-col gap-2.5">
            {grouped ? (
              <span
                style={accentStyle}
                className={cn("text-[13px] font-extrabold tracking-wide uppercase", accentClassName)}
              >
                {section.title}
              </span>
            ) : (
              <div className="flex items-baseline justify-between gap-3">
                <span className={cn("text-[14px] font-bold", accentClassName ?? "text-slate-900")}>
                  {section.title}
                </span>
                {section.meta && <span className="text-[13px] text-slate-500">{section.meta}</span>}
              </div>
            )}
            {grouped ? (
              <div className="flex flex-col gap-1">
                {section.bullets.map((bullet) => renderBullet(section, bullet))}
              </div>
            ) : (
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {section.bullets.map((bullet) => (
                  <li key={bullet.id}>{renderBullet(section, bullet)}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </article>
  );
}
