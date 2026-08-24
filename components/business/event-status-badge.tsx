import { cn } from "@/lib/utils";
import type { EventStatusBadge as EventStatusBadgeData } from "@/lib/business/status";

const TONES: Record<EventStatusBadgeData["tone"], string> = {
  green: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  sky: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  red: "border-red-400/30 bg-red-500/10 text-red-200",
  muted: "border-white/10 bg-white/5 text-white/50",
  violet: "border-violet-400/30 bg-violet-500/10 text-violet-200",
};

export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatusBadgeData;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        TONES[status.tone],
        className,
      )}
    >
      <span aria-hidden="true" className="text-[10px] leading-none">
        {status.icon}
      </span>
      <span>{status.label}</span>
    </span>
  );
}
