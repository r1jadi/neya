"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  deleteGuide,
  deleteGuideDay,
  deleteGuideStop,
  deleteGuideTransport,
  reorderGuideStops,
  saveGuide,
  saveGuideDay,
  saveGuideStop,
  saveGuideTransport,
  saveIntercityRoute,
  toggleGuidePublished,
} from "@/actions/admin-guides";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AdminGuideRow,
  AdminGuideDayRow,
  AdminGuideStopRow,
  AdminIntercityRouteRow,
} from "@/services/admin-guides";
import {
  GUIDE_DIFFICULTIES,
  GUIDE_LOCATION_TYPES,
  GUIDE_STOP_CATEGORIES,
  GUIDE_TRANSPORT_TYPES,
  DURATION_PRESETS,
} from "@/lib/guides/constants";
import { cn } from "@/lib/utils";

interface GuidesPanelProps {
  guides: AdminGuideRow[];
  editGuideId?: string | null;
  editDetail?: {
    guide: AdminGuideRow | null;
    days: (AdminGuideDayRow & { stops: AdminGuideStopRow[] })[];
  } | null;
  intercityRoutes: AdminIntercityRouteRow[];
}

export function GuidesPanel({ guides, editGuideId, editDetail, intercityRoutes }: GuidesPanelProps) {
  const [editing, setEditing] = useState<AdminGuideRow | "new" | null>(
    editGuideId && editDetail ? editDetail.guide : editGuideId ? null : null,
  );
  const [dragStops, setDragStops] = useState<AdminGuideStopRow[]>([]);
  const [dragDayId, setDragDayId] = useState<string | null>(null);

  const activeGuide = editDetail?.guide ?? (typeof editing === "object" ? editing : null);
  const activeDays = editDetail?.days ?? [];

  function startDrag(dayId: string, stops: AdminGuideStopRow[]) {
    setDragDayId(dayId);
    setDragStops([...stops].sort((a, b) => a.order_index - b.order_index));
  }

  function onDragStart(index: number) {
    return (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", String(index));
    };
  }

  function onDrop(targetIndex: number, guideId: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData("text/plain"));
      if (Number.isNaN(from) || from === targetIndex) return;
      const next = [...dragStops];
      const [item] = next.splice(from, 1);
      next.splice(targetIndex, 0, item);
      setDragStops(next);
      const fd = new FormData();
      fd.set("guide_id", guideId);
      fd.set("order", JSON.stringify(next.map((s) => s.id)));
      reorderGuideStops(fd);
    };
  }

  useEffect(() => {
    if (editGuideId && editDetail) {
      setEditing(editDetail.guide);
    }
  }, [editGuideId, editDetail]);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Travel Guides</h2>
        <Button type="button" size="sm" onClick={() => setEditing("new")}>
          Create guide
        </Button>
      </div>

      {(editing === "new" || (editing && !editGuideId)) && editing ? (
        <GuideForm guide={editing === "new" ? null : editing} onCancel={() => setEditing(null)} />
      ) : null}

      {activeGuide && editDetail ? (
        <div className="space-y-6 rounded-xl border border-sky-500/20 bg-sky-950/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{activeGuide.title}</h3>
              <p className="text-xs text-white/45">/{activeGuide.slug}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/guides/${activeGuide.slug}`} target="_blank">
                  Preview
                </Link>
              </Button>
              <form action={toggleGuidePublished}>
                <input type="hidden" name="id" value={activeGuide.id} />
                <input type="hidden" name="published" value={String(!activeGuide.published)} />
                <Button type="submit" variant="secondary" size="sm">
                  {activeGuide.published ? "Unpublish" : "Publish"}
                </Button>
              </form>
            </div>
          </div>

          <GuideForm guide={activeGuide} compact />

          <div className="space-y-4">
            <h4 className="font-medium text-white">Days</h4>
            <form action={saveGuideDay} className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 p-3">
              <input type="hidden" name="guide_id" value={activeGuide.id} />
              <label className="space-y-1">
                <span className="text-xs text-white/45">Day #</span>
                <Input name="day_number" type="number" min={1} defaultValue={activeDays.length + 1} className="w-20" />
              </label>
              <label className="flex-1 space-y-1">
                <span className="text-xs text-white/45">Title</span>
                <Input name="title" placeholder="Day title" required />
              </label>
              <Button type="submit" size="sm">
                Add day
              </Button>
            </form>

            {activeDays.map((day) => (
              <div key={day.id} className="rounded-lg border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-white">
                    Day {day.day_number}: {day.title}
                  </p>
                  <form action={deleteGuideDay}>
                    <input type="hidden" name="id" value={day.id} />
                    <input type="hidden" name="guide_id" value={activeGuide.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-red-300">
                      Delete day
                    </Button>
                  </form>
                </div>

                <form action={saveGuideStop} className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="guide_id" value={activeGuide.id} />
                  <input type="hidden" name="guide_day_id" value={day.id} />
                  <Input name="name" placeholder="Stop name" required />
                  <select name="category" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
                    {GUIDE_STOP_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <Input name="latitude" placeholder="Latitude" type="number" step="any" />
                  <Input name="longitude" placeholder="Longitude" type="number" step="any" />
                  <Input name="estimated_visit_time" placeholder="Visit time (min)" type="number" />
                  <Input name="image" placeholder="Image URL" />
                  <textarea
                    name="description"
                    placeholder="Description"
                    className="sm:col-span-2 min-h-[60px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                  <Button type="submit" size="sm" className="sm:col-span-2 w-fit">
                    Add stop
                  </Button>
                </form>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider text-white/45">Stops (drag to reorder)</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => startDrag(day.id, day.stops)}
                    >
                      Enable reorder
                    </Button>
                  </div>
                  {(dragDayId === day.id ? dragStops : day.stops).map((stop, idx) => (
                    <div
                      key={stop.id}
                      draggable={dragDayId === day.id}
                      onDragStart={dragDayId === day.id ? onDragStart(idx) : undefined}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={dragDayId === day.id ? onDrop(idx, activeGuide.id) : undefined}
                      className={cn(
                        "rounded-lg border border-white/5 bg-black/20 p-3",
                        dragDayId === day.id && "cursor-grab",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {idx + 1}. {stop.name}
                          </p>
                          <p className="text-xs capitalize text-white/45">{stop.category}</p>
                        </div>
                        <form action={deleteGuideStop}>
                          <input type="hidden" name="id" value={stop.id} />
                          <input type="hidden" name="guide_id" value={activeGuide.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-red-300">
                            ×
                          </Button>
                        </form>
                      </div>

                      <form action={saveGuideTransport} className="mt-2 grid gap-2 border-t border-white/5 pt-2 sm:grid-cols-2">
                        <input type="hidden" name="guide_id" value={activeGuide.id} />
                        <input type="hidden" name="guide_stop_id" value={stop.id} />
                        <select name="transport_type" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white">
                          {GUIDE_TRANSPORT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <select name="intercity_route_id" className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white">
                          <option value="">— Intercity route —</option>
                          {intercityRoutes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.route_name}
                            </option>
                          ))}
                        </select>
                        <Input name="station_name" placeholder="Station name" className="text-xs" />
                        <Input name="departure_frequency" placeholder="Frequency" className="text-xs" />
                        <Input name="station_latitude" placeholder="Station lat" type="number" step="any" className="text-xs" />
                        <Input name="station_longitude" placeholder="Station lng" type="number" step="any" className="text-xs" />
                        <Input name="route_name" placeholder="Route name" className="text-xs sm:col-span-2" />
                        <textarea name="notes" placeholder="Notes" className="sm:col-span-2 min-h-[40px] rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white" />
                        <Button type="submit" size="sm" variant="secondary" className="w-fit text-xs">
                          Add transport
                        </Button>
                      </form>

                      {(stop.transports ?? []).map((t) => (
                        <div key={t.id} className="mt-1 flex items-center justify-between text-xs text-white/50">
                          <span>
                            {t.transport_type}
                            {t.route_name ? ` · ${t.route_name}` : ""}
                          </span>
                          <form action={deleteGuideTransport}>
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="guide_id" value={activeGuide.id} />
                            <button type="submit" className="text-red-300">
                              remove
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-white/45">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {guides.map((g) => (
              <tr key={g.id} className="text-white/80">
                <td className="px-4 py-3 font-medium text-white">{g.title}</td>
                <td className="px-4 py-3 capitalize">{g.location_type}</td>
                <td className="px-4 py-3">€{g.price}</td>
                <td className="px-4 py-3">
                  {g.published ? (
                    <span className="text-emerald-300">Published</span>
                  ) : (
                    <span className="text-white/45">Draft</span>
                  )}
                  {g.featured ? <span className="ml-2 text-fuchsia-300">★</span> : null}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin?tab=guides&edit=${g.id}`} className="text-sky-300 hover:underline">
                    Edit
                  </Link>
                  <form action={deleteGuide} className="ml-3 inline">
                    <input type="hidden" name="id" value={g.id} />
                    <button type="submit" className="text-red-300 hover:underline">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!guides.length ? <p className="p-6 text-center text-sm text-white/45">No guides yet.</p> : null}
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-white">Kosovo Intercity Routes</h3>
        <form action={saveIntercityRoute} className="grid gap-2 rounded-lg border border-white/10 p-4 sm:grid-cols-2">
          <Input name="origin" defaultValue="Prishtina" placeholder="Origin" />
          <Input name="destination" placeholder="Destination" required />
          <Input name="route_name" placeholder="Route name" className="sm:col-span-2" required />
          <Input name="departure_frequency" placeholder="Frequency" />
          <Input name="station_name" placeholder="Station" />
          <textarea name="notes" placeholder="Notes" className="sm:col-span-2 min-h-[50px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" />
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" name="active" defaultChecked className="rounded" />
            Active
          </label>
          <Button type="submit" size="sm" className="w-fit">
            Add route
          </Button>
        </form>
        <ul className="space-y-1 text-sm text-white/60">
          {intercityRoutes.map((r) => (
            <li key={r.id}>
              {r.route_name} — {r.departure_frequency}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GuideForm({
  guide,
  onCancel,
  compact,
}: {
  guide: AdminGuideRow | null;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const categories = guide?.categories ?? [];

  return (
    <form action={saveGuide} className="space-y-4 rounded-xl border border-white/10 p-4">
      {guide ? <input type="hidden" name="id" value={guide.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 space-y-1">
          <span className="text-xs text-white/45">Title</span>
          <Input name="title" defaultValue={guide?.title} required />
        </label>
        <label className="sm:col-span-2 space-y-1">
          <span className="text-xs text-white/45">Description</span>
          <textarea
            name="description"
            defaultValue={guide?.description ?? ""}
            className="min-h-[80px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          />
        </label>
        <ImageUploadField
          name="cover_image"
          label="Cover image"
          defaultUrl={guide?.cover_image ?? ""}
          folder="guides"
        />
        <label className="space-y-1">
          <span className="text-xs text-white/45">Location type</span>
          <select
            name="location_type"
            defaultValue={guide?.location_type ?? "prishtina"}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            {GUIDE_LOCATION_TYPES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/45">City / region name</span>
          <Input name="location_name" defaultValue={guide?.location_name ?? ""} placeholder="e.g. Prizren" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/45">Duration (days)</span>
          <select
            name="duration_days"
            defaultValue={guide?.duration_days ?? ""}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="">Custom / label only</option>
            {DURATION_PRESETS.map((d) => (
              <option key={d.label} value={d.days}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/45">Duration label</span>
          <Input name="duration_label" defaultValue={guide?.duration_label ?? ""} placeholder="e.g. Long weekend" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/45">Price</span>
          <Input name="price" type="number" min={0} step="0.01" defaultValue={guide?.price ?? 0} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/45">Currency</span>
          <Input name="currency" defaultValue={guide?.currency ?? "EUR"} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/45">Difficulty</span>
          <select
            name="difficulty"
            defaultValue={guide?.difficulty ?? "easy"}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            {GUIDE_DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/45">Best season</span>
          <Input name="best_season" defaultValue={guide?.best_season ?? ""} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/45">Daily budget €</span>
          <Input name="daily_budget_eur" type="number" defaultValue={guide?.daily_budget_eur ?? ""} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/45">Total budget €</span>
          <Input name="total_budget_eur" type="number" defaultValue={guide?.total_budget_eur ?? ""} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/45">Avg visit (min)</span>
          <Input name="avg_visit_duration_minutes" type="number" defaultValue={guide?.avg_visit_duration_minutes ?? ""} />
        </label>
        <label className="sm:col-span-2 space-y-1">
          <span className="text-xs text-white/45">Categories (JSON array)</span>
          <Input name="categories" defaultValue={JSON.stringify(categories)} placeholder='["culture","food"]' />
        </label>
        <div className="flex flex-wrap gap-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" name="featured" defaultChecked={guide?.featured} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" name="published" defaultChecked={guide?.published} />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" name="family_friendly" defaultChecked={guide?.family_friendly} />
            Family friendly
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit">{guide ? "Save guide" : "Create guide"}</Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {!compact && guide ? (
          <Button variant="secondary" asChild>
            <Link href={`/admin?tab=guides&edit=${guide.id}`}>Edit days & stops</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
