"use client";

import { useState } from "react";
import { Download, RefreshCw, Sparkles } from "lucide-react";
import { saveEventPoster, uploadEventPosterImage } from "@/actions/admin-posters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PosterTemplate = "nightlife" | "festival" | "minimal";
type PosterFormat = "post" | "story";
type PosterLayout = "editorial" | "split" | "frame" | "orbit" | "type" | "stack";

type PosterPalette = {
  background: string;
  accent: string;
  secondary: string;
  title: string;
  eyebrow: string;
  details: string;
  overlay: string;
};

export type PosterEventData = {
  title?: string;
  startsAt?: string;
  venue?: string;
  location?: string;
  ticketInfo?: string;
  imageUrl?: string;
};

const TEMPLATE_OPTIONS: { id: PosterTemplate; label: string; description: string }[] = [
  { id: "nightlife", label: "Dark nightlife", description: "Neon gradients and an after-dark feel." },
  { id: "festival", label: "Festival", description: "Warm, high-energy colour and bold type." },
  { id: "minimal", label: "Minimal", description: "Clean composition with quiet contrast." },
];

const TEMPLATE_STYLES: Record<PosterTemplate, { background: string; accent: string; eyebrow: string; title: string; details: string }> = {
  nightlife: {
    background: "bg-[#070711]",
    accent: "from-fuchsia-500/70 via-sky-400/30 to-transparent",
    eyebrow: "text-sky-200",
    title: "text-white",
    details: "border-white/20 bg-black/25 text-white",
  },
  festival: {
    background: "bg-[#ff5538]",
    accent: "from-yellow-300 via-orange-400/70 to-fuchsia-700/50",
    eyebrow: "text-yellow-100",
    title: "text-[#20101a]",
    details: "border-[#20101a]/20 bg-[#fff5d6]/75 text-[#20101a]",
  },
  minimal: {
    background: "bg-[#ede9df]",
    accent: "from-stone-900/10 via-stone-500/10 to-transparent",
    eyebrow: "text-stone-600",
    title: "text-stone-950",
    details: "border-stone-950/15 bg-white/55 text-stone-800",
  },
};

const CANVAS_STYLES: Record<PosterTemplate, PosterPalette> = {
  nightlife: { background: "#070711", accent: "#d946ef", secondary: "#38bdf8", title: "#ffffff", eyebrow: "#bae6fd", details: "#ffffff", overlay: "rgba(0, 0, 0, 0.48)" },
  festival: { background: "#ff5538", accent: "#facc15", secondary: "#c026d3", title: "#20101a", eyebrow: "#fef9c3", details: "#20101a", overlay: "rgba(255, 237, 213, 0.28)" },
  minimal: { background: "#ede9df", accent: "#57534e", secondary: "#a8a29e", title: "#0c0a09", eyebrow: "#57534e", details: "#292524", overlay: "rgba(255, 255, 255, 0.38)" },
};

const LAYOUTS: PosterLayout[] = ["editorial", "split", "frame", "orbit", "type", "stack"];

function layoutFor(data: PosterEventData, template: PosterTemplate, format: PosterFormat): PosterLayout {
  const source = `${data.title ?? ""}|${data.venue ?? ""}|${data.startsAt ?? ""}|${template}|${format}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  return LAYOUTS[hash % LAYOUTS.length];
}

function formatPosterDate(startsAt?: string) {
  if (!startsAt) return "";
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });
}

function formatPosterTime(startsAt?: string) {
  if (!startsAt) return "";
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function posterDimensions(format: PosterFormat) {
  return format === "post" ? { width: 1080, height: 1080 } : { width: 1080, height: 1920 };
}

function posterImageUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function hasPosterTitle(data: PosterEventData) {
  return Boolean(data.title?.trim());
}

/** Converts a canvas data URL to a Blob (avoids a fetch round-trip). */
function dataUrlToBlob(dataUrl: string): Blob {
  const separator = dataUrl.indexOf(",");
  const mime = /^data:([^;]+);/i.exec(dataUrl)?.[1] ?? "image/png";
  const binary = atob(dataUrl.slice(separator + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Creates the locally generated, full-resolution PNG used by Download PNG. */
async function renderPosterPng(data: PosterEventData, template: PosterTemplate, format: PosterFormat): Promise<string> {
  const { StaticCanvas, Rect, Circle, FabricText, Textbox, FabricImage } = await import("fabric");
  const { width, height } = posterDimensions(format);
  const theme = CANVAS_STYLES[template];
  const layout = layoutFor(data, template, format);
  const padding = layout === "type" ? 104 : 82;
  const canvasElement = document.createElement("canvas");
  const canvas = new StaticCanvas(canvasElement, { width, height, backgroundColor: theme.background, renderOnAddRemove: false });

  try {
    const imageUrl = posterImageUrl(data.imageUrl);
    if (imageUrl) {
      try {
        const image = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
        const sourceWidth = image.width || 1;
        const sourceHeight = image.height || 1;
        const scale = Math.max(width / sourceWidth, height / sourceHeight);
        image.set({
          left: (width - sourceWidth * scale) / 2,
          top: (height - sourceHeight * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });
        canvas.add(image);
        canvas.add(new Rect({ left: 0, top: 0, width, height, fill: theme.overlay, selectable: false, evented: false }));
      } catch {
        // A remote image without CORS support must not block poster generation.
      }
    }

    canvas.add(
      new Circle({ left: width - (layout === "orbit" ? 210 : 340), top: layout === "orbit" ? height * 0.24 : 130, radius: layout === "orbit" ? 360 : 260, fill: `${theme.accent}55`, selectable: false, evented: false }),
      new Circle({ left: layout === "split" ? width * 0.48 : -190, top: height - (layout === "orbit" ? 700 : 500), radius: layout === "orbit" ? 420 : 280, fill: `${theme.secondary}30`, selectable: false, evented: false }),
    );
    if (layout === "frame" || layout === "split") {
      canvas.add(new Rect({ left: layout === "split" ? width * 0.55 : 46, top: 46, width: layout === "split" ? width * 0.45 - 46 : width - 92, height: height - 92, fill: "transparent", stroke: `${theme.eyebrow}88`, strokeWidth: 3, rx: layout === "frame" ? 24 : 0, ry: layout === "frame" ? 24 : 0, selectable: false, evented: false }));
    }
    if (layout === "type") {
      for (let index = 0; index < 5; index += 1) {
        canvas.add(new Rect({ left: padding, top: 210 + index * 72, width: width - padding * 2, height: 2, fill: `${theme.eyebrow}55`, selectable: false, evented: false }));
      }
    }

    const brand = new FabricText("NEYA", { left: padding, top: padding, fontFamily: "Arial", fontSize: layout === "type" ? 38 : 30, fontWeight: "bold", charSpacing: layout === "stack" ? 420 : 280, fill: theme.eyebrow, selectable: false, evented: false });
    const dimensions = new FabricText(format === "post" ? "1080 × 1080" : "1080 × 1920", { left: width - padding, top: padding, originX: "right", fontFamily: "Arial", fontSize: 24, fontWeight: "bold", charSpacing: 120, fill: theme.eyebrow, selectable: false, evented: false });
    canvas.add(brand, dimensions);
    if (layout === "stack") {
      canvas.add(new FabricText("LIVE / LOCAL / TONIGHT", { left: padding, top: padding + 58, fontFamily: "Arial", fontSize: 18, fontWeight: "bold", charSpacing: 90, fill: theme.secondary, selectable: false, evented: false }));
    }

    const detailValues = [formatPosterDate(data.startsAt), formatPosterTime(data.startsAt), data.venue, data.location, data.ticketInfo].filter((value): value is string => Boolean(value));
    const maxDetailTextWidth = width - padding * 2 - 42;
    const detailObjects = detailValues.map((value) => {
      const label = new FabricText(value.toUpperCase(), { fontFamily: "Arial", fontSize: 22, fontWeight: "bold", charSpacing: 35, fill: theme.details, selectable: false, evented: false });
      let text = value.toUpperCase();
      while (label.width > maxDetailTextWidth && text.length > 1) {
        text = text.slice(0, -1);
        label.set({ text: `${text}…` });
      }
      return label;
    });
    const pillHeight = layout === "type" ? 48 : 54;
    const pillGap = 14;
    let pillLeft = padding;
    let pillTop = height - padding - pillHeight;
    const pillRows: Array<{ label: InstanceType<typeof FabricText>; left: number; top: number; width: number }> = [];
    for (const label of detailObjects) {
      const pillWidth = Math.min(width - padding * 2, Math.ceil(label.width + (layout === "stack" ? 34 : 42)));
      if (pillLeft + pillWidth > width - padding) {
        pillLeft = padding;
        pillTop -= pillHeight + pillGap;
      }
      pillRows.push({ label, left: pillLeft, top: pillTop, width: pillWidth });
      pillLeft += pillWidth + pillGap;
    }
    for (const pill of pillRows) {
      canvas.add(
        new Rect({ left: pill.left, top: pill.top, width: pill.width, height: pillHeight, rx: pillHeight / 2, ry: pillHeight / 2, fill: template === "minimal" ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.26)", stroke: template === "minimal" ? "rgba(12,10,9,0.18)" : "rgba(255,255,255,0.28)", strokeWidth: 1, selectable: false, evented: false }),
      );
      pill.label.set({ left: pill.left + 21, top: pill.top + 15 });
      canvas.add(pill.label);
    }

    if (data.title) {
      const maxTitleHeight = Math.max(180, pillTop - (layout === "type" ? 300 : 270) - 76);
      let titleFontSize = layout === "type" ? (format === "post" ? 132 : 148) : layout === "stack" ? 96 : format === "post" ? 114 : 128;
      let titleText = data.title.toUpperCase();
      const createTitle = (text: string, fontSize: number) => new Textbox(text, {
        left: padding, top: 0, width: width - padding * 2, fontFamily: "Arial", fontSize,
        fontWeight: "bold", lineHeight: 0.82, charSpacing: -45, splitByGrapheme: true, fill: theme.title, selectable: false, evented: false,
      });
      let title = createTitle(titleText, titleFontSize);
      while (title.height > maxTitleHeight && titleFontSize > 48) {
        titleFontSize -= 8;
        title = createTitle(titleText, titleFontSize);
      }
      while (title.height > maxTitleHeight && titleText.length > 1) {
        titleText = `${titleText.slice(0, -2).trimEnd()}…`;
        title = createTitle(titleText, titleFontSize);
      }
      const availableTop = Math.max(layout === "type" ? 340 : 270, pillTop - title.height - 76);
      title.set({ top: availableTop, left: layout === "split" ? width * 0.08 : padding, width: layout === "split" ? width * 0.82 : width - padding * 2 });
      canvas.add(title);
    }

    const tagline = new FabricText("WHAT'S HAPPENING TONIGHT?", { left: padding, top: height - 38, fontFamily: "Arial", fontSize: 18, fontWeight: "bold", charSpacing: 120, fill: theme.eyebrow, selectable: false, evented: false });
    canvas.add(tagline);
    canvas.renderAll();
    return canvas.toDataURL({ format: "png", multiplier: 1 });
  } finally {
    canvas.dispose();
  }
}

function PosterPreview({ data, template, format }: { data: PosterEventData; template: PosterTemplate; format: PosterFormat }) {
  const styles = TEMPLATE_STYLES[template];
  const date = formatPosterDate(data.startsAt);
  const time = formatPosterTime(data.startsAt);
  const details = [date, time, data.venue, data.location, data.ticketInfo].filter(Boolean);
  const imageUrl = posterImageUrl(data.imageUrl);

  return (
    <div
      className={`relative mx-auto w-full max-w-[430px] overflow-hidden rounded-[1.75rem] shadow-2xl ${format === "post" ? "aspect-square" : "aspect-[9/16]"} ${styles.background}`}
      aria-label="Live event poster preview"
    >
      {imageUrl ? (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url("${imageUrl}")` }} />
          <div className="absolute inset-0 bg-black/35" />
        </div>
      ) : null}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.accent}`} />
      <div className="absolute -right-20 top-12 h-52 w-52 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="absolute -left-20 bottom-4 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative flex h-full flex-col p-7 sm:p-9">
        <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.28em]">
          <span className={styles.eyebrow}>NEYA</span>
          <span className={styles.eyebrow}>{format === "post" ? "1080 × 1080" : "1080 × 1920"}</span>
        </div>
        <div className="mt-auto">
          {data.title ? (
            <h3 className={`break-words font-[family-name:var(--font-display)] text-4xl font-bold uppercase leading-[0.92] tracking-[-0.06em] sm:text-5xl ${styles.title}`}>
              {data.title}
            </h3>
          ) : null}
          {details.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {details.map((detail) => (
                <span key={detail} className={`max-w-full break-words rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${styles.details}`}>
                  {detail}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <p className={`mt-6 text-[10px] font-bold tracking-[0.22em] ${styles.eyebrow}`}>WHAT&apos;S HAPPENING TONIGHT?</p>
      </div>
    </div>
  );
}

export function EventPosterGenerator({
  eventId,
  posterUrl,
  getEventData,
  onPosterGenerated,
}: {
  eventId?: string;
  posterUrl?: string | null;
  getEventData: () => PosterEventData;
  /** Called with the uploaded URL whenever a poster is generated, so the event form can use it as the default poster. */
  onPosterGenerated?: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<PosterTemplate>("nightlife");
  const [format, setFormat] = useState<PosterFormat>("post");
  const [eventData, setEventData] = useState<PosterEventData>({});
  const [generatedPoster, setGeneratedPoster] = useState<string | null>(null);
  const [savedPosterUrl, setSavedPosterUrl] = useState(posterUrl ?? null);
  const [isRendering, setIsRendering] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openGenerator() {
    setEventData(getEventData());
    setGeneratedPoster(null);
    setGenerationError(null);
    setSaveError(null);
    setOpen(true);
  }

  /** Uploads the freshly generated PNG so it can be used as the event's poster when the form saves. */
  async function attachGeneratedPoster(poster: string): Promise<string | null> {
    try {
      const fd = new FormData();
      fd.set("poster", new File([dataUrlToBlob(poster)], "event-poster.png", { type: "image/png" }));
      const result = await uploadEventPosterImage(fd);
      if (result.error || !result.url) return null;
      return result.url;
    } catch (error) {
      console.error("[neya] poster attach failed", error);
      return null;
    }
  }

  async function regeneratePoster(): Promise<string | null> {
    const latestData = getEventData();
    setEventData(latestData);
    if (!hasPosterTitle(latestData)) {
      setGenerationError("Add an event title before creating a poster.");
      return null;
    }
    setIsRendering(true);
    setGenerationError(null);
    try {
      const poster = await renderPosterPng(latestData, template, format);
      setGeneratedPoster(poster);
      setSaveError(null);
      // Auto-attach: the generated poster becomes the event's default poster
      // unless the admin later picks a different image in the event form.
      const uploadedUrl = await attachGeneratedPoster(poster);
      if (uploadedUrl) {
        setSaveError(null);
        onPosterGenerated?.(uploadedUrl);
      } else {
        setSaveError("The poster could not be attached to the event automatically. Create/save the event, then use “Save poster” to attach it.");
      }
      return poster;
    } catch (error) {
      console.error("[neya] poster generation failed", error);
      setGenerationError("The poster could not be generated. Please try again.");
      return null;
    } finally {
      setIsRendering(false);
    }
  }

  async function downloadPoster() {
    setIsDownloading(true);
    setGenerationError(null);
    try {
      // Use the current render when available; otherwise generate one first.
      const image = generatedPoster ?? (await regeneratePoster());
      if (!image) return;
      // Anchor clicks on large base64 data: URLs silently no-op in several
      // browsers (notably iOS Safari). Blob object URLs download reliably on
      // desktop and mobile — the same approach as the saved-poster download.
      const objectUrl = URL.createObjectURL(dataUrlToBlob(image));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `neya-${format === "post" ? "instagram-post" : "instagram-story"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke after the download starts; revoking synchronously can abort it on Safari.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch (error) {
      console.error("[neya] poster download failed", error);
      setGenerationError("The poster could not be downloaded. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function downloadSavedPoster() {
    if (!savedPosterUrl) return;
    setIsDownloading(true);
    setSaveError(null);
    try {
      const response = await fetch(savedPosterUrl);
      if (!response.ok) throw new Error(`Poster download failed with ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "neya-event-poster.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("[neya] saved poster download failed", error);
      setSaveError("Saved poster download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function savePoster() {
    if (!eventId) {
      setSaveError("Save the event first, then reopen the generator to save its poster.");
      return;
    }
    // Save exactly the currently displayed/generated poster. Regenerating here
    // could race with selection state and persist a different poster than the
    // one the admin chose before clicking Save.
    const image = generatedPoster;
    if (!image) {
      setSaveError("Generate a poster before saving it.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(image);
      if (!response.ok) throw new Error(`Generated poster could not be read (${response.status})`);
      const blob = await response.blob();
      if (blob.type && blob.type !== "image/png") throw new Error("Generated poster is not a PNG");
      const formData = new FormData();
      formData.set("event_id", eventId);
      formData.set("poster", new File([blob], "event-poster.png", { type: "image/png" }));
      const result = await saveEventPoster(formData);
      if (result.error || !result.url) {
        setSaveError(result.error ?? "Poster upload failed");
        return;
      }
      setSavedPosterUrl(result.url);
    } catch (error) {
      console.error("[neya] poster save failed", error);
      setSaveError("Poster upload failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function selectTemplate(nextTemplate: PosterTemplate) {
    setTemplate(nextTemplate);
    setGeneratedPoster(null);
  }

  function selectFormat(nextFormat: PosterFormat) {
    setFormat(nextFormat);
    setGeneratedPoster(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" size="sm" onClick={openGenerator}>
        <Sparkles /> Generate poster
      </Button>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event Poster Generator</DialogTitle>
          <DialogDescription>Create, download, and save a NEYA poster from the event details in this form.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(320px,1fr)] lg:items-start">
          <div className="space-y-5">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-white">Poster template</legend>
              <div className="grid gap-2">
                {TEMPLATE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectTemplate(option.id)}
                    aria-pressed={template === option.id}
                    className={`rounded-xl border p-3 text-left transition ${template === option.id ? "border-sky-400 bg-sky-400/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}
                  >
                    <span className="block text-sm font-semibold text-white">{option.label}</span>
                    <span className="mt-1 block text-xs text-white/50">{option.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-white">Poster format</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["post", "Instagram Post", "1080 × 1080"],
                  ["story", "Instagram Story", "1080 × 1920"],
                ] as const).map(([id, label, dimensions]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectFormat(id)}
                    aria-pressed={format === id}
                    className={`rounded-xl border p-3 text-left transition ${format === id ? "border-sky-400 bg-sky-400/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}
                  >
                    <span className="block text-sm font-semibold text-white">{label}</span>
                    <span className="mt-1 block text-xs text-white/50">{dimensions}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/50">
              A title is required. Other missing event details are omitted from the preview. Saving a poster replaces the event&apos;s previous saved poster.
            </p>
          </div>
          <div className="space-y-3">
            {generatedPoster ? (
              // A generated PNG is a transient data URL, which Next/Image does not optimize.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={generatedPoster}
                alt="Generated event poster"
                className={`mx-auto w-full max-w-[430px] rounded-[1.75rem] shadow-2xl ${format === "post" ? "aspect-square" : "aspect-[9/16]"}`}
              />
            ) : (
              <PosterPreview data={eventData} template={template} format={format} />
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" size="sm" variant="secondary" disabled={isRendering || isDownloading || isSaving} onClick={regeneratePoster}>
                <RefreshCw className={isRendering ? "animate-spin" : ""} /> {isRendering ? "Rendering…" : "Regenerate"}
              </Button>
              <Button type="button" size="sm" disabled={isRendering || isDownloading || isSaving} onClick={downloadPoster}>
                <Download /> {isDownloading ? "Downloading…" : "Download PNG"}
              </Button>
              <Button type="button" size="sm" disabled={isRendering || isDownloading || isSaving || !eventId} onClick={savePoster}>
                {!eventId ? "Save event first" : isSaving ? "Saving…" : "Save poster"}
              </Button>
            </div>
            {generationError ? <p role="alert" className="text-center text-xs text-red-300">{generationError}</p> : null}
            {saveError ? <p role="alert" className="text-center text-xs text-red-300">{saveError}</p> : null}
            {!eventId ? <p className="text-center text-xs text-white/45">Create the event first to save its generated poster.</p> : null}
            {savedPosterUrl ? (
              <div className="flex justify-center gap-3 text-xs">
                <a href={savedPosterUrl} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline">View saved poster</a>
                <button type="button" disabled={isDownloading || isSaving} onClick={downloadSavedPoster} className="text-sky-300 hover:underline disabled:cursor-not-allowed disabled:opacity-50">
                  Download saved poster
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
