"use client";

import { useId } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldRow, SectionCard } from "./shared";
import type { CandidateProfile } from "@/lib/types";

type Basics = Pick<CandidateProfile, "name" | "headline" | "location" | "email" | "links">;

export function BasicsSection({
  profile,
  editable,
  onChange,
}: {
  profile: Basics;
  editable: boolean;
  onChange: (patch: Partial<Basics>) => void;
}) {
  const id = useId();

  if (!editable) {
    return (
      <SectionCard title="Basics">
        <div className="flex flex-col gap-3">
          <FieldRow label="Name" value={profile.name} />
          <FieldRow label="Headline" value={profile.headline} />
          <FieldRow label="Location" value={profile.location} />
          <FieldRow label="Email" value={profile.email} />
          <FieldRow
            label="Links"
            value={
              profile.links.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {profile.links.map((link) => (
                    <a key={link} href={link} target="_blank" rel="noreferrer" className="text-primary break-all hover:underline">
                      {link}
                    </a>
                  ))}
                </div>
              ) : undefined
            }
          />
        </div>
      </SectionCard>
    );
  }

  function updateLink(index: number, value: string) {
    onChange({ links: profile.links.map((link, i) => (i === index ? value : link)) });
  }
  function removeLink(index: number) {
    onChange({ links: profile.links.filter((_, i) => i !== index) });
  }

  return (
    <SectionCard title="Basics">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-name`}>Name</Label>
          <Input id={`${id}-name`} value={profile.name} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-headline`}>Headline</Label>
          <Input id={`${id}-headline`} value={profile.headline} onChange={(e) => onChange({ headline: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-location`}>Location</Label>
          <Input id={`${id}-location`} value={profile.location} onChange={(e) => onChange({ location: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input id={`${id}-email`} type="email" value={profile.email} onChange={(e) => onChange({ email: e.target.value })} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Links</span>
        {profile.links.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input aria-label={`Link ${i + 1}`} value={link} onChange={(e) => updateLink(i, e.target.value)} placeholder="https://" />
            <Button type="button" variant="outline" size="icon-lg" aria-label="Remove link" onClick={() => removeLink(i)}>
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="lg" className="w-fit" onClick={() => onChange({ links: [...profile.links, ""] })}>
          <Plus className="size-4" aria-hidden />
          Add link
        </Button>
      </div>
    </SectionCard>
  );
}
