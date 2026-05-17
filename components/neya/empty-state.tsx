import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, className, icon }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-14 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-4 text-white/30">{icon}</div> : null}
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-white/90">{title}</p>
      {description ? <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/50">{description}</p> : null}
    </div>
  );
}
