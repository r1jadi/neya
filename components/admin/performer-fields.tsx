"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventPerformer } from "@/types";

type EditablePerformer = EventPerformer & { instagram?: string; website?: string };

function fromPerformer(performer: EventPerformer): EditablePerformer {
  return {
    ...performer,
    instagram: performer.social_links?.instagram ?? "",
    website: performer.social_links?.website ?? "",
  };
}

function toPerformer(performer: EditablePerformer): EventPerformer {
  const social_links: Record<string, string> = {};
  if (performer.instagram?.trim()) social_links.instagram = performer.instagram.trim();
  if (performer.website?.trim()) social_links.website = performer.website.trim();
  return {
    name: performer.name,
    image_url: performer.image_url?.trim() || undefined,
    genre: performer.genre?.trim() || undefined,
    social_links: Object.keys(social_links).length ? social_links : undefined,
  };
}

export function PerformerFields({ initialPerformers = [] }: { initialPerformers?: EventPerformer[] }) {
  const [performers, setPerformers] = useState<EditablePerformer[]>(initialPerformers.map(fromPerformer));
  const update = (index: number, key: keyof EditablePerformer, value: string) => {
    setPerformers((current) => current.map((performer, position) => position === index ? { ...performer, [key]: value } : performer));
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-semibold text-white">Artists &amp; performers</legend>
      <p className="text-xs text-white/45">Add DJs, singers, bands, rappers, comedians, and any other entertainer.</p>
      <input type="hidden" name="performers" value={JSON.stringify(performers.map(toPerformer))} />
      {performers.map((performer, index) => (
        <div key={index} className="grid gap-3 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
          <Input value={performer.name} onChange={(event) => update(index, "name", event.target.value)} placeholder="Performer name" maxLength={160} />
          <Input value={performer.genre ?? ""} onChange={(event) => update(index, "genre", event.target.value)} placeholder="Genre or role (optional)" maxLength={80} />
          <Input value={performer.image_url ?? ""} onChange={(event) => update(index, "image_url", event.target.value)} placeholder="Image URL (optional)" type="url" />
          <Input value={performer.instagram ?? ""} onChange={(event) => update(index, "instagram", event.target.value)} placeholder="Instagram URL (optional)" type="url" />
          <Input value={performer.website ?? ""} onChange={(event) => update(index, "website", event.target.value)} placeholder="Website URL (optional)" type="url" />
          <Button type="button" variant="ghost" size="sm" className="justify-self-start text-red-200 hover:text-red-100" onClick={() => setPerformers((current) => current.filter((_, position) => position !== index))}>
            <Trash2 /> Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={() => setPerformers((current) => [...current, { name: "" }])}>
        <Plus /> Add performer
      </Button>
    </fieldset>
  );
}
